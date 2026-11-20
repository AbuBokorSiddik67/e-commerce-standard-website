import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";
import { newPassword } from "../src/lib/validations/auth";

async function main() {
  if (!process.env.DATABASE_URL || process.stdin.isTTY) throw new Error("Use a configured database and pipe the password on stdin");
  const email = z.string().trim().toLowerCase().pipe(z.email()).parse(process.env.SHOPBD_ADMIN_EMAIL);
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (Buffer.byteLength(input) > 74) throw new Error("Password too long");
  }
  const password = newPassword.refine((value) => value.length >= 16).parse(input.replace(/\r?\n$/, ""));
  const passwordHash = await bcrypt.hash(password, 12);
  const rotate = process.argv.includes("--rotate");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing && (existing.role !== "ADMIN" || !rotate)) throw new Error("Existing account must be an admin with explicit rotation");
    if (!existing && rotate) throw new Error("Rotation requires an existing admin");
    const user = existing
      ? await tx.user.update({ where: { id: existing.id, role: "ADMIN" }, data: { passwordHash, authVersion: { increment: 1 } }, select: { id: true } })
      : await tx.user.create({ data: { email, passwordHash, role: "ADMIN", name: "Store Admin" }, select: { id: true } });
    if (existing) {
      await tx.authSession.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    }
    // Operator is outside application auth: actor is deliberately null.
    await tx.auditLog.create({ data: { action: rotate ? "ADMIN_OPERATOR_ROTATE" : "ADMIN_OPERATOR_PROVISION", entity: "User", entityId: user.id, detail: { actorType: "database-operator" } } });
  });
  console.log(rotate ? "Admin password rotated; sessions revoked." : "Admin created.");
}

main().catch(() => {
  console.error("Admin provisioning failed. Check database, email, password length, and whether --rotate is appropriate.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
