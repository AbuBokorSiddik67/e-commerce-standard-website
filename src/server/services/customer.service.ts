import { prisma } from "@/lib/prisma";
import { toPositiveInt } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";

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
      include: { user: true, _count: { select: { orders: true } } },
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
      user: true,
      orders: { orderBy: { placedAt: "desc" }, include: { items: true } },
    },
  });
}

export async function setCustomerBlocked(id: string, isBlocked: boolean, adminId: string) {
  const customer = await prisma.customer.update({ where: { id }, data: { isBlocked } });
  if (customer.userId) {
    await prisma.user.update({ where: { id: customer.userId }, data: { isBlocked } });
  }
  await writeAuditLog({
    userId: adminId,
    action: isBlocked ? "CUSTOMER_BLOCK" : "CUSTOMER_UNBLOCK",
    entity: "Customer",
    entityId: id,
  });
  return customer;
}
