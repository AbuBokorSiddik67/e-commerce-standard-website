import { Pagination } from "@/components/shared/pagination";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { listOrders } from "@/server/services/order.service";
import { formatCurrency, formatDateTime, toPositiveInt } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import { Search } from "lucide-react";

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "outline" | "default"> = {
  PENDING: "outline",
  CONFIRMED: "secondary",
  PACKED: "secondary",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
  RETURNED: "destructive",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = toPositiveInt(params.page, 1);
  const ordersResult = await attempt("admin.orders", () =>
    listOrders({
      status: params.status,
      search: params.search,
      page,
      perPage: 20,
    }),
  );

  if (!ordersResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Orders could not be loaded"
        description="We couldn't reach the orders database. No changes were made — please retry in a moment."
      />
    );
  }

  const { items, total, pages } = ordersResult.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Orders</h1>
        <p className="text-sm text-muted-foreground">{total} orders</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={params.status ? "outline" : "default"} size="sm" asChild>
          <Link href="/admin/orders">All</Link>
        </Button>
        {Object.keys(ORDER_STATUS_LABELS).map((s) => (
          <Button key={s} variant={params.status === s ? "default" : "outline"} size="sm" asChild>
            <Link href={`/admin/orders?status=${s}`}>{ORDER_STATUS_LABELS[s].en}</Link>
          </Button>
        ))}
      </div>

      <form role="search" className="flex flex-wrap gap-2">
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search orders" name="search" placeholder="Order number, phone, or name" defaultValue={params.search} className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" role="region" aria-label="Orders table" tabIndex={0}>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Payment</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No orders found</td></tr>
                )}
                {items.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-4">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4">
                      <p>{o.fullName}</p>
                      <p className="text-xs text-muted-foreground">{o.phone}</p>
                    </td>
                    <td className="p-4">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="p-4 font-medium">{formatCurrency(Number(o.total))}</td>
                    <td className="p-4">
                      <Badge variant={o.paymentStatus === "PAID" ? "secondary" : "outline"}>
                        {PAYMENT_STATUS_LABELS[o.paymentStatus]?.en ?? o.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>
                        {ORDER_STATUS_LABELS[o.status]?.en ?? o.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDateTime(o.placedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} pages={pages} base="/admin/orders" query={params} label="Orders pages" />
    </div>
  );
}
