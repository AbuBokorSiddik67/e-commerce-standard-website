import { prisma } from "@/lib/prisma";
import { toValidDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function getReportData(params: { dateFrom: Date; dateTo: Date }) {
  const dateTo = toValidDate(params.dateTo, new Date());
  const dateFrom = toValidDate(
    params.dateFrom,
    new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000),
  );
  const range = { gte: dateFrom, lte: dateTo };

  const where: Prisma.OrderWhereInput = {
    placedAt: range,
    status: { notIn: ["CANCELLED", "RETURNED"] },
  };

  const [orders, allOrderItems, statusCounts, topCustomers] = await Promise.all([
    prisma.order.findMany({ where, include: { items: true } }),
    prisma.orderItem.findMany({
      where: { order: { placedAt: range } },
      include: { product: { include: { categories: true } }, order: { select: { status: true } } },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { placedAt: range },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where,
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const profit = allOrderItems
    .filter((oi) => oi.order.status !== "CANCELLED" && oi.order.status !== "RETURNED")
    .reduce((sum, oi) => sum + (oi.costPrice ? (Number(oi.price) - Number(oi.costPrice)) * oi.quantity : 0), 0);

  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const oi of allOrderItems) {
    if (!oi.productId) continue;
    if (oi.order.status === "CANCELLED" || oi.order.status === "RETURNED") continue;
    const prev = productSales.get(oi.productId) ?? { name: oi.name, qty: 0, revenue: 0 };
    prev.qty += oi.quantity;
    prev.revenue += Number(oi.lineTotal);
    productSales.set(oi.productId, prev);
  }
  const bestSelling = [...productSales.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const catSales = new Map<string, { name: string; revenue: number }>();
  for (const oi of allOrderItems) {
    if (oi.order.status === "CANCELLED" || oi.order.status === "RETURNED") continue;
    for (const cat of oi.product?.categories ?? []) {
      const prev = catSales.get(cat.id) ?? { name: cat.name, revenue: 0 };
      prev.revenue += Number(oi.lineTotal);
      catSales.set(cat.id, prev);
    }
  }

  const lowStock = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { stock: "asc" },
    take: 10,
  });

  const customerIds = topCustomers.map((t) => t.customerId).filter((c): c is string => !!c);
  const customers = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds } } })
    : [];

  return {
    totalOrders: orders.length,
    revenue,
    profit,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    bestSelling,
    lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, lowStockThreshold: p.lowStockThreshold })),
    topCustomers: topCustomers.map((t) => {
      const c = customers.find((cu) => cu.id === t.customerId);
      return {
        id: t.customerId,
        name: c?.fullName ?? "Guest",
        phone: c?.phone ?? "",
        orderCount: t._count._all,
        totalSpent: Number(t._sum.total ?? 0),
      };
    }),
    categorySales: [...catSales.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue),
  };
}

export async function getOrdersForExport(params: { dateFrom: Date; dateTo: Date }) {
  const dateTo = toValidDate(params.dateTo, new Date());
  const dateFrom = toValidDate(
    params.dateFrom,
    new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000),
  );
  return prisma.order.findMany({
    where: { placedAt: { gte: dateFrom, lte: dateTo } },
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });
}
