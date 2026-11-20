import { prisma } from "@/lib/prisma";
import { toPositiveInt } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";

export async function listCustomers(params: { search?: string; page?: number; perPage?: number }) {
  const where: Prisma.CustomerWhereInput = {};
  if (params.search) {
    where.OR = [
      { fullName: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }
  const page = toPositiveInt(params.page, 1);
  const perPage = toPositiveInt(params.perPage, 20, 100);

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { user: { select: { id: true, role: true, isBlocked: true } }, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.customer.count({ where }),
  ]);
  return { items, total, pages: Math.ceil(total / perPage) };
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, role: true, isBlocked: true } },
      orders: { orderBy: { placedAt: "desc" }, include: { items: true } },
    },
  });
}

export async function setCustomerBlocked(id: string, isBlocked: boolean, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id }, select: { userId: true } });
    if (!customer) return null;
    // This is customer management, never an alternate way to modify an admin account.
    if (customer.userId) {
      const changed = await tx.user.updateMany({ where: { id: customer.userId, role: "CUSTOMER" }, data: { isBlocked, authVersion: { increment: 1 } } });
      if (!changed.count) return null;
      await tx.authSession.deleteMany({ where: { userId: customer.userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: customer.userId } });
    }
    const result = await tx.customer.update({ where: { id }, data: { isBlocked } });
    await audit(tx, { userId: adminId, action: isBlocked ? "CUSTOMER_BLOCK" : "CUSTOMER_UNBLOCK", entity: "Customer", entityId: id });
    return result;
  });
}
