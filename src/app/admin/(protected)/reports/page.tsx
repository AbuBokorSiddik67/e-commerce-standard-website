import { requireAdmin } from "@/lib/auth-guard";
import { getReportData } from "@/server/services/reports.service";
import { formatCurrency, formatDate, toValidDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import Link from "next/link";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const now = new Date();
  const to = toValidDate(params.to, now);
  let from = toValidDate(
    params.from,
    new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000),
  );
  // Guard against reversed ranges (e.g. ?from=2026-01-01&to=2020-01-01).
  if (from.getTime() > to.getTime()) {
    from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);

  const reportResult = await attempt("admin.reports", () =>
    getReportData({ dateFrom: from, dateTo: to }),
  );

  if (!reportResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Reports could not be loaded"
        description="We couldn't reach the reporting database. Please retry in a moment."
      />
    );
  }

  const data = reportResult.value;
  const fromISO = from.toISOString().slice(0, 10);
  const toISO = to.toISOString().slice(0, 10);

  const ranges = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(from)} — {formatDate(to)}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/admin/orders/export?from=${fromISO}&to=${toISO}`}>Export CSV</a>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ranges.map((r) => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - r.days);
          const dISO = d.toISOString().slice(0, 10);
          const todayISO = new Date().toISOString().slice(0, 10);
          return (
            <Link key={r.label} href={`/admin/reports?from=${dISO}&to=${todayISO}`}>
              <Button variant="outline" size="sm">{r.label}</Button>
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">From</label>
          <input type="date" name="from" defaultValue={fromISO} className="h-10 rounded-md border bg-background px-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">To</label>
          <input type="date" name="to" defaultValue={toISO} className="h-10 rounded-md border bg-background px-3 text-sm" />
        </div>
        <Button type="submit" variant="outline">Apply</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatCurrency(data.revenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Estimated Profit</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-green-600">{formatCurrency(data.profit)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.totalOrders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(data.totalOrders > 0 ? data.revenue / data.totalOrders : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Order Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.statusCounts.map((s) => (
                <li key={s.status} className="flex items-center justify-between text-sm">
                  <span>{ORDER_STATUS_LABELS[s.status]?.en ?? s.status}</span>
                  <Badge variant="outline">{s.count}</Badge>
                </li>
              ))}
              {data.statusCounts.length === 0 && <p className="text-sm text-muted-foreground">No orders in this period</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Best-Selling Products</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.bestSelling.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="ml-2 whitespace-nowrap text-muted-foreground">{p.qty} sold · {formatCurrency(p.revenue)}</span>
                </li>
              ))}
              {data.bestSelling.length === 0 && <p className="text-sm text-muted-foreground">No sales yet</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Low Stock Products</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <Badge variant={p.stock === 0 ? "destructive" : "outline"}>{p.stock} left</Badge>
                </li>
              ))}
              {data.lowStock.length === 0 && <p className="text-sm text-muted-foreground">No products</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.topCustomers.map((c) => (
                <li key={c.id ?? "guest"} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name} ({c.phone})</span>
                  <span className="ml-2 whitespace-nowrap text-muted-foreground">{c.orderCount} orders · {formatCurrency(c.totalSpent)}</span>
                </li>
              ))}
              {data.topCustomers.length === 0 && <p className="text-sm text-muted-foreground">No customers yet</p>}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Sales by Category</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.categorySales.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(c.revenue)}</span>
                </li>
              ))}
              {data.categorySales.length === 0 && <p className="text-sm text-muted-foreground">No sales yet</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
