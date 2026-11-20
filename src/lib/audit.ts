import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function writeAuditLog(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
}) {
  try {
    // A JWT session can outlive the user row it points to (for example after
    // the database is reset or re-seeded). Never trust the id blindly: if the
    // user no longer exists, store the log with a null user instead of failing
    // the AuditLog_userId_fkey foreign key constraint.
    let userId: string | null = params.userId ?? null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) userId = null;
    }

    const h = await headers();
    const ip = h.get("x-forwarded-for") ?? undefined;
    await prisma.auditLog.create({
      data: {
        userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        detail: params.detail ? (params.detail as never) : undefined,
        ipAddress: ip,
      },
    });
  } catch {
    // Audit log failure should never break the main operation
  }
}
