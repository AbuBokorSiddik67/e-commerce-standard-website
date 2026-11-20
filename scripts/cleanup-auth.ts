import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  const expiresAt = { lte: new Date() };
  const [sessions, buckets, tokens] = await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { expiresAt } }),
    prisma.securityRateBucket.deleteMany({ where: { expiresAt } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt } }),
  ]);
  console.log(`Expired security state removed: ${sessions.count} session(s), ${buckets.count} rate bucket(s), ${tokens.count} recovery token(s).`);
}
main().catch(() => { console.error("Security cleanup failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
