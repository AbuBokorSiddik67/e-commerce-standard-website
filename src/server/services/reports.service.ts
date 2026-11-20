import { getOrderMetrics, listLowStock } from "./order-metrics";
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

  const [metrics, allOrderItems, topCustomers, lowStock] = await Promise.all([
    getOrderMetrics(range),
    prisma.orderItem.findMany({
      where: { order: where },
      select: { productId: true, name: true, price: true, costPrice: true, quantity: true, lineTotal: true,
        product: { select: { categories: { select: { id: true, name: true } } } },
      },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where,
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    listLowStock(10),
  ]);

  const profit = allOrderItems
    .reduce((sum, oi) => sum + (oi.costPrice ? (Number(oi.price) - Number(oi.costPrice)) * oi.quantity : 0), 0);

  const productSales = new Map<string, { name: string; qty: number; itemValue: number }>();
  for (const oi of allOrderItems) {
    if (!oi.productId) continue;
    const prev = productSales.get(oi.productId) ?? { name: oi.name, qty: 0, itemValue: 0 };
    prev.qty += oi.quantity;
    prev.itemValue += Number(oi.lineTotal);
    productSales.set(oi.productId, prev);
  }
  const bestSelling = [...productSales.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const catSales = new Map<string, { name: string; itemValue: number }>();
  for (const oi of allOrderItems) {
    for (const cat of oi.product?.categories ?? []) {
      const prev = catSales.get(cat.id) ?? { name: cat.name, itemValue: 0 };
      prev.itemValue += Number(oi.lineTotal);
      catSales.set(cat.id, prev);
    }
  }

  const customerIds = topCustomers.map((t) => t.customerId).filter((c): c is string => !!c);
  const customers = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds } } })
    : [];

  return {
    ...metrics,
    profit,
    bestSelling,
    lowStock,
    topCustomers: topCustomers.map((t) => {
      const c = customers.find((cu) => cu.id === t.customerId);
      return {
        id: t.customerId,
        name: c?.fullName ?? "Guest",
        phone: c?.phone ?? "",
        orderCount: t._count._all,
        orderValue: Number(t._sum.total ?? 0),
      };
    }),
    categorySales: [...catSales.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.itemValue - a.itemValue),
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
