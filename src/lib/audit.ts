import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/errors";

type AuditEntry = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: Prisma.InputJsonObject;
};

// Critical writes pass their transaction so mutation and audit commit together.
export async function audit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  await tx.auditLog.create({ data: entry });
}

// Older editorial actions retain best-effort auditing. Do not record request IP headers,
// arbitrary objects, credentials, free-form notes, or provider data.
export async function writeAuditLog(entry: AuditEntry) {
  try { await audit(prisma, entry); }
  catch (error) { logError("audit.write", error); }
}
