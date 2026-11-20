import { bangladeshDate, bangladeshDayStart } from "@/lib/report-dates";
import { getOrderMetrics, listLowStock } from "@/server/services/order-metrics";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import {
  ShoppingBag, Banknote, TrendingUp, Package, ArrowRight, AlertTriangle,
} from "lucide-react";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const todayStart = bangladeshDayStart(bangladeshDate());

  const dashboardData = await attempt("admin.dashboard", () => Promise.all([
    prisma.order.count({ where: { placedAt: { gte: todayStart }, status: { notIn: ["CANCELLED", "RETURNED"] } } }),
    getOrderMetrics(),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PACKED", "SHIPPED"] } } }),
    listLowStock(5),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, fullName: true, placedAt: true, total: true, status: true },
    }),
  ]));

  if (!dashboardData.ok) {
    return (
      <AppError
        variant="admin"
        title="Dashboard data is unavailable"
        description="We couldn't reach the store database. Your data is safe — please retry in a moment."
      />
    );
  }

  const { currencySymbol } = await getStoreSettings();
  const [ordersToday, metrics, pendingCount, lowStock, recentOrders] =
    dashboardData.value;

  const stats = [
    { title: "Orders Today", value: ordersToday.toString(), icon: ShoppingBag },
    { title: "Total Orders", value: metrics.totalOrders.toString(), icon: TrendingUp },
    { title: "Order Value", value: formatCurrency(metrics.orderValue, currencySymbol), icon: Banknote },
    { title: "Pending COD", value: formatCurrency(metrics.pendingCod, currencySymbol), icon: Banknote },
    { title: "Collected COD", value: formatCurrency(metrics.collectedCod, currencySymbol), icon: Banknote },
    { title: "Active Orders", value: pendingCount.toString(), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <PageHeading label="Store overview" title="Dashboard" description="Follow orders, cash on delivery and inventory from one workspace."
        action={<Button asChild variant="outline"><Link href="/admin/reports">View reports <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.title} className="surface min-w-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-2 sm:p-5 sm:pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eaf0ff] text-[#254ba7]"><s.icon className="size-4" aria-hidden="true" /></span>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
              <p className="break-words text-lg font-bold tracking-tight tabular-nums sm:text-[1.6rem]">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="surface min-w-0">
          <CardHeader><CardTitle className="text-base">Order value vs. collected COD</CardTitle><p className="text-sm text-muted-foreground">All time · order value includes orders awaiting payment.</p></CardHeader>
          <CardContent className="space-y-4">
            {[{ label: "Order value", value: metrics.orderValue, color: "bg-primary" }, { label: "Collected COD", value: metrics.collectedCod, color: "bg-[#227564]" }].map(row => <div key={row.label}>
              <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{row.label}</span><span className="font-bold tabular-nums">{formatCurrency(row.value, currencySymbol)}</span></div>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${row.color}`} style={{width: `${100 * row.value / Math.max(1, metrics.orderValue, metrics.collectedCod)}%`}} /></div>
            </div>)}
          </CardContent>
        </Card>
        <Card className="surface min-w-0"><CardHeader><CardTitle className="text-base">Order status</CardTitle><p className="text-sm text-muted-foreground">All recorded orders, including cancelled and returned.</p></CardHeader>
          <CardContent>{metrics.statusCounts.length ? <ul className="flex flex-wrap gap-2">{metrics.statusCounts.map(row => <li key={row.status} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">{ORDER_STATUS_LABELS[row.status]?.en ?? row.status}: {row.count}</li>)}</ul> : <p className="text-sm text-muted-foreground">Status counts will appear when orders come in.</p>}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="surface min-w-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <ul className="divide-y">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {o.fullName} · {formatDateTime(o.placedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(Number(o.total), currencySymbol)}</p>
                      <Badge variant="outline" className="mt-0.5">
                        {ORDER_STATUS_LABELS[o.status]?.en ?? o.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="surface min-w-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            <Link href="/admin/products" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {lowStock.filter((p) => p.stock <= p.lowStockThreshold).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">All stock levels are healthy</p>
            ) : (
              <ul className="divide-y">
                {lowStock.filter((p) => p.stock <= p.lowStockThreshold).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${p.stock === 0 ? "text-destructive" : "text-amber-500"}`} />
                      <Link href={`/admin/products/${p.productId}`} className="min-w-0 break-words text-sm font-semibold hover:underline">{p.name}</Link>
                    </div>
                    <Badge variant={p.stock === 0 ? "destructive" : "outline"}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
