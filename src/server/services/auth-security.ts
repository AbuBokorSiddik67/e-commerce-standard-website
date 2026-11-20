import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { credentialsSchema, type PasswordResetInput } from "@/lib/validations/auth";
import { consumeRateLimit, limitKey, trustedClientIp } from "@/lib/shared-rate-limit";
import { logError } from "@/lib/errors";

export const SESSION_MAX_AGE = 12 * 60 * 60;
const ADMIN_MAX_AGE = 4 * 60 * 60;
const RESET_MAX_AGE = 20 * 60 * 1000;
const BAD_CREDENTIALS_HASH = "$2b$12$VjTyzkk47neaA7DtF3j20OFX46/4Ai7zZVfc.xbayikb39L7c50vy";
const USER_SELECT = { id: true, email: true, name: true, role: true, authVersion: true } as const;
const HANDLE = /^[0-9a-f]{64}$/;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("hex");

async function loginAlert(key: string, dimension: string) {
  try {
    await prisma.auditLog.create({ data: { action: "LOGIN_THROTTLED", entity: "Authentication", entityId: key, detail: { dimension } } });
  } catch (error) { logError("auth.monitor", error); }
}

export async function verifyCredentials(input: unknown, headers: Headers) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password, portal } = parsed.data;
  const ip = trustedClientIp(headers);
  const scopes = [
    { key: limitKey("login", "global"), limit: 1200, seconds: 60, dimension: "global" },
    ...(ip ? [{ key: limitKey("login", `ip:${ip}`), limit: 35, seconds: 300, dimension: "network" }] : []),
    { key: limitKey("login", `email:${email}`), limit: 8, seconds: 900, dimension: "account" },
  ];
  for (const { key, limit, seconds, dimension } of scopes) {
    const result = await consumeRateLimit(key, limit, seconds);
    if (result.firstDenied) await loginAlert(key, dimension);
    if (!result.allowed) return null;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { ...USER_SELECT, passwordHash: true, isBlocked: true } });
  const allowed = Boolean(user && !user.isBlocked && user.role === (portal === "admin" ? "ADMIN" : "CUSTOMER"));
  const hash = allowed ? user?.passwordHash : null;
  const valid = await bcrypt.compare(password, hash ?? BAD_CREDENTIALS_HASH);
  if (!user || !hash || !valid) return null;
  const { id, name, role, authVersion } = user;
  return { id, email, name, role, authVersion };
}

type Identity = { id: string; role: Role; authVersion: number };

export async function issueSession(identity: Identity, now = new Date()) {
  const handle = secret();
  const expires = new Date(now.getTime() + (identity.role === "ADMIN" ? ADMIN_MAX_AGE : SESSION_MAX_AGE) * 1000);
  await prisma.$transaction(async (tx) => {
    // An account change during login must not issue a usable session for stale credentials.
    if (!(await tx.user.findFirst({ where: { id: identity.id, role: identity.role, authVersion: identity.authVersion, isBlocked: false }, select: { id: true } }))) {
      throw new Error("Session could not be issued");
    }
    await tx.authSession.create({ data: { tokenHash: digest(handle), userId: identity.id, role: identity.role, authVersion: identity.authVersion, expiresAt: expires } });
    if (identity.role === "ADMIN") await tx.auditLog.create({ data: { userId: identity.id, action: "ADMIN_SIGN_IN", entity: "User", entityId: identity.id } });
  });
  return { handle, expires };
}

export async function readSession(handle: unknown, identity: Identity, now = new Date()) {
  if (typeof handle !== "string" || !HANDLE.test(handle) || !identity.id || !Number.isInteger(identity.authVersion)) return null;
  return prisma.authSession.findFirst({
    where: {
      tokenHash: digest(handle), userId: identity.id, role: identity.role, authVersion: identity.authVersion, expiresAt: { gt: now },
      user: { role: identity.role, authVersion: identity.authVersion, isBlocked: false },
    },
    select: { expiresAt: true, user: { select: USER_SELECT } },
  });
}

export async function revokeSession(handle: unknown) {
  if (typeof handle !== "string" || !HANDLE.test(handle)) return;
  await prisma.authSession.deleteMany({ where: { tokenHash: digest(handle) } });
}

export async function createPasswordResetToken(email: string, now = new Date()) {
  // Privileged accounts are recovered only through the operator provisioning command.
  const user = await prisma.user.findFirst({ where: { email, role: "CUSTOMER", isBlocked: false, passwordHash: { not: null } }, select: { id: true, email: true, authVersion: true } });
  if (!user) return null;
  const token = secret();
  const data = { tokenHash: digest(token), expiresAt: new Date(now.getTime() + RESET_MAX_AGE), usedAt: null, authVersion: user.authVersion };
  await prisma.passwordResetToken.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  return { token, email: user.email };
}

export async function resetPassword(input: PasswordResetInput, now = () => new Date()) {
  const tokenHash = digest(input.token);
  const row = await prisma.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: now() }, authVersion: { not: null } } });
  if (!row || row.authVersion === null) return false;
  const version = row.authVersion;
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({ where: { id: row.userId, role: "CUSTOMER", isBlocked: false, authVersion: version }, data: { passwordHash, authVersion: { increment: 1 } } });
    if (!changed.count) return false;
    const stamp = now();
    const used = await tx.passwordResetToken.updateMany({ where: { id: row.id, tokenHash, usedAt: null, expiresAt: { gt: stamp }, authVersion: version }, data: { usedAt: stamp } });
    if (!used.count) throw new Error("Reset link no longer valid"); // Rolls back the password write.
    await tx.authSession.deleteMany({ where: { userId: row.userId } });
    await tx.auditLog.create({ data: { userId: row.userId, action: "PASSWORD_RESET", entity: "User", entityId: row.userId } });
    return true;
  });
}

export async function changePassword(userId: string, current: string, password: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, isBlocked: false }, select: { role: true, passwordHash: true, authVersion: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) return false;
  if (user.role === "ADMIN" && password.length < 16) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({ where: { id: userId, role: user.role, isBlocked: false, authVersion: user.authVersion }, data: { passwordHash, authVersion: { increment: 1 } } });
    if (!changed.count) return false;
    await tx.authSession.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.auditLog.create({ data: { userId, action: "PASSWORD_CHANGE", entity: "User", entityId: userId } });
    return true;
  });
}
