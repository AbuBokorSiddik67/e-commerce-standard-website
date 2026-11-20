import { getStoreSettings } from "@/server/repositories/settings.repo";
import { bangladeshDate, reportDates } from "@/lib/report-dates";
import { requireAdmin } from "@/lib/auth-guard";
import { getReportData } from "@/server/services/reports.service";
import { formatCurrency } from "@/lib/utils";
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
  const { fromDate: fromISO, toDate: toISO, dateFrom, dateTo } = reportDates(params.from, params.to, now);
  const reportResult = await attempt("admin.reports", () => getReportData({ dateFrom, dateTo }));

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
  const { currencySymbol } = await getStoreSettings();
  const money = (value: number) => formatCurrency(value, currencySymbol);

  const ranges = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 6 },
    { label: "Last 30 days", days: 29 },
    { label: "Last 90 days", days: 89 },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {fromISO} — {toISO} (Bangladesh time)
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/admin/orders/export?from=${fromISO}&to=${toISO}`}>Export CSV</a>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ranges.map((r) => {
          const dISO = bangladeshDate(new Date(now.getTime() - r.days * 86_400_000));
          const todayISO = bangladeshDate(now);
          return (
            <Button key={r.label} variant="outline" size="sm" asChild><Link href={`/admin/reports?from=${dISO}&to=${todayISO}`}>{r.label}</Link></Button>
          );
        })}
      </div>

      <form className="surface flex min-w-0 flex-wrap items-end gap-3 p-3 sm:p-4">
        <div className="min-w-0 space-y-1">
          <label htmlFor="report-from" className="block text-sm text-muted-foreground">From</label>
          <input id="report-from" type="date" name="from" defaultValue={fromISO} className="h-10 max-w-full rounded-md border border-input bg-card px-3 text-sm" />
        </div>
        <div className="min-w-0 space-y-1">
          <label htmlFor="report-to" className="block text-sm text-muted-foreground">To</label>
          <input id="report-to" type="date" name="to" defaultValue={toISO} className="h-10 max-w-full rounded-md border border-input bg-card px-3 text-sm" />
        </div>
        <Button type="submit" variant="outline">Apply</Button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Card className="surface min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Order Value</CardTitle></CardHeader>
          <CardContent><p className="break-words text-2xl font-bold tabular-nums">{money(data.orderValue)}</p></CardContent>
        </Card>
        <Card className="surface min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending COD</CardTitle></CardHeader>
          <CardContent><p className="break-words text-2xl font-bold tabular-nums">{money(data.pendingCod)}</p></CardContent>
        </Card>
        <Card className="surface min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Collected COD</CardTitle></CardHeader>
          <CardContent><p className="break-words text-2xl font-bold tabular-nums">{money(data.collectedCod)}</p></CardContent>
        </Card>
        <Card className="surface min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Estimated Item Margin</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-green-600">{money(data.profit)}</p></CardContent>
        </Card>
        <Card className="surface min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle></CardHeader>
          <CardContent><p className="break-words text-2xl font-bold tabular-nums">{data.totalOrders}</p></CardContent>
        </Card>
        <Card className="surface min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle></CardHeader>
          <CardContent>
            <p className="break-words text-2xl font-bold tabular-nums">
              {money(data.totalOrders > 0 ? data.orderValue / data.totalOrders : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">Figures use the order placement date and current status. Collected COD is recorded paid on delivered orders, including delivered returns until a refund is recorded. It is not a settlement total. Item margin excludes coupons, delivery and expenses.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="surface min-w-0">
          <CardHeader><CardTitle className="text-base">Order Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.statusCounts.map((s) => (
                <li key={s.status} className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-sm">
                  <span>{ORDER_STATUS_LABELS[s.status]?.en ?? s.status}</span>
                  <Badge variant="outline">{s.count}</Badge>
                </li>
              ))}
              {data.statusCounts.length === 0 && <p className="text-sm text-muted-foreground">No orders in this period</p>}
            </ul>
          </CardContent>
        </Card>

        <Card className="surface min-w-0">
          <CardHeader><CardTitle className="text-base">Best-Selling Products</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.bestSelling.slice(0, 5).map((p) => (
                <li key={p.id} className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-sm">
                  <span className="min-w-0 break-words">{p.name}</span>
                  <span className="min-w-0 text-muted-foreground">{p.qty} ordered · {money(p.itemValue)}</span>
                </li>
              ))}
              {data.bestSelling.length === 0 && <p className="text-sm text-muted-foreground">No order items yet</p>}
            </ul>
          </CardContent>
        </Card>

        <Card className="surface min-w-0">
          <CardHeader><CardTitle className="text-base">Low Stock SKUs</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-sm">
                  <span className="min-w-0 break-words">{p.name}</span>
                  <Badge variant={p.stock === 0 ? "destructive" : "outline"}>{p.stock} left</Badge>
                </li>
              ))}
              {data.lowStock.length === 0 && <p className="text-sm text-muted-foreground">No products</p>}
            </ul>
          </CardContent>
        </Card>

        <Card className="surface min-w-0">
          <CardHeader><CardTitle className="text-base">Top Customers</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.topCustomers.map((c) => (
                <li key={c.id ?? "guest"} className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-sm">
                  <span className="min-w-0 break-words">{c.name} ({c.phone})</span>
                  <span className="min-w-0 text-muted-foreground">{c.orderCount} orders · {money(c.orderValue)}</span>
                </li>
              ))}
              {data.topCustomers.length === 0 && <p className="text-sm text-muted-foreground">No customers yet</p>}
            </ul>
          </CardContent>
        </Card>

        <Card className="surface min-w-0 lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Order Item Value by Category</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.categorySales.map((c) => (
                <li key={c.id} className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-sm">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{money(c.itemValue)}</span>
                </li>
              ))}
              {data.categorySales.length === 0 && <p className="text-sm text-muted-foreground">No order items yet</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
