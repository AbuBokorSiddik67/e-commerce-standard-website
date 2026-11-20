import { bangladeshDate, bangladeshDayStart } from "@/lib/report-dates";
import { getOrderMetrics, listLowStock } from "@/server/services/order-metrics";
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
      include: { items: true },
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

  const [ordersToday, metrics, pendingCount, lowStock, recentOrders] =
    dashboardData.value;

  const stats = [
    { title: "Orders Today", value: ordersToday.toString(), icon: ShoppingBag },
    { title: "Total Orders", value: metrics.totalOrders.toString(), icon: TrendingUp },
    { title: "Order Value", value: formatCurrency(metrics.orderValue), icon: Banknote },
    { title: "Pending COD", value: formatCurrency(metrics.pendingCod), icon: Banknote },
    { title: "Collected COD", value: formatCurrency(metrics.collectedCod), icon: Banknote },
    { title: "Active Orders", value: pendingCount.toString(), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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
                  <li key={o.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {o.fullName} · {formatDateTime(o.placedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(Number(o.total))}</p>
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

        <Card>
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
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${p.stock === 0 ? "text-destructive" : "text-amber-500"}`} />
                      <span className="text-sm">{p.name}</span>
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
