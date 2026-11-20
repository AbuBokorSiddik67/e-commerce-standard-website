import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getOrderMetrics(placedAt?: Prisma.DateTimeFilter) {
  const [rows, returnedCash] = await prisma.$transaction([
    prisma.order.groupBy({
      by: ["status", "paymentMethod", "paymentStatus"],
      where: { placedAt }, _count: { _all: true }, _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { placedAt, status: "RETURNED", deliveredAt: { not: null }, paymentMethod: "COD", paymentStatus: "PAID" },
      _sum: { total: true },
    }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  let orderValue = new Prisma.Decimal(0);
  let pendingCod = new Prisma.Decimal(0);
  let collectedCod = new Prisma.Decimal(returnedCash._sum.total ?? 0);
  let totalOrders = 0;
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + row._count._all);
    if (row.status === "CANCELLED" || row.status === "RETURNED") continue;
    const total = row._sum.total ?? 0;
    totalOrders += row._count._all;
    orderValue = orderValue.add(total);
    if (row.paymentMethod !== "COD") continue;
    if (row.status === "DELIVERED" && row.paymentStatus === "PAID") collectedCod = collectedCod.add(total);
    if (row.paymentStatus === "PENDING" || row.paymentStatus === "FAILED") pendingCod = pendingCod.add(total);
  }
  return {
    orderValue: orderValue.toNumber(), pendingCod: pendingCod.toNumber(), collectedCod: collectedCod.toNumber(), totalOrders,
    statusCounts: [...counts].map(([status, count]) => ({ status, count })),
  };
}

export async function listLowStock(take: number) {
  const [base, variants] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, variants: { none: {} }, stock: { lte: prisma.product.fields.lowStockThreshold } },
      select: { id: true, name: true, stock: true, lowStockThreshold: true }, orderBy: [{ stock: "asc" }, { id: "asc" }], take,
    }),
    // Variants share the parent threshold. Compare across tables in SQL before LIMIT.
    prisma.$queryRaw<{ id: string; productId: string; name: string; stock: number; lowStockThreshold: number }[]>`
      SELECT v."id", p."id" AS "productId", p."name" || ' — ' || v."name" || ': ' || v."value" AS "name", v."stock", p."lowStockThreshold"
      FROM "ProductVariant" v JOIN "Product" p ON v."productId" = p."id"
      WHERE p."isActive" AND v."isActive" AND v."stock" <= p."lowStockThreshold"
      ORDER BY v."stock", v."id" LIMIT ${take}`,
  ]);
  return [...base.map((product) => ({ ...product, productId: product.id })), ...variants]
    .sort((a, b) => a.stock - b.stock || a.id.localeCompare(b.id)).slice(0, take);
}
