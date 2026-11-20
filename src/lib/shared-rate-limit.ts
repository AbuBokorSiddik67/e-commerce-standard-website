import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

export function trustedClientIp(headers: Headers): string | null {
  const header = process.env.AUTH_CLIENT_IP_HEADER;
  if (!header || !/^[a-zA-Z0-9-]+$/.test(header)) return null;
  const value = headers.get(header)?.trim();
  // A configured ingress must replace the header with exactly one address.
  return value && isIP(value) ? value : null;
}

export function limitKey(scope: string, value: string) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing security configuration");
  return createHmac("sha256", secret).update(JSON.stringify([scope, value])).digest("hex");
}

/** Atomic, capped window shared by every application instance. Uses the DB clock. */
export async function consumeRateLimit(key: string, limit: number, seconds: number) {
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "SecurityRateBucket" ("key", "count", "expiresAt")
    VALUES (${key}, 1, (statement_timestamp() AT TIME ZONE 'UTC') + ${seconds}::int * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "SecurityRateBucket"."expiresAt" <= (statement_timestamp() AT TIME ZONE 'UTC') THEN 1 ELSE "SecurityRateBucket"."count" + 1 END,
      "expiresAt" = CASE WHEN "SecurityRateBucket"."expiresAt" <= (statement_timestamp() AT TIME ZONE 'UTC') THEN EXCLUDED."expiresAt" ELSE "SecurityRateBucket"."expiresAt" END
    WHERE "SecurityRateBucket"."expiresAt" <= (statement_timestamp() AT TIME ZONE 'UTC') OR "SecurityRateBucket"."count" <= ${limit}
    RETURNING "count"`;
  return { allowed: Boolean(row && row.count <= limit), firstDenied: row?.count === limit + 1 };
}

export async function allowPublicRequest(scope: string, headers: Headers, limit: number, seconds: number, identity?: string) {
  const ip = trustedClientIp(headers);
  // Always cap the application-wide route, even when trusted per-IP attribution is unavailable.
  if (!(await consumeRateLimit(limitKey(scope, "global"), Math.max(100, limit * 30), seconds)).allowed) return false;
  if (ip && !(await consumeRateLimit(limitKey(scope, `ip:${ip}`), limit, seconds)).allowed) return false;
  return !identity || (await consumeRateLimit(limitKey(scope, `entity:${identity}`), limit, seconds)).allowed;
}
