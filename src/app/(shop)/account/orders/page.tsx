import Link from "next/link";
import { requireCustomer } from "@/lib/auth-guard";
import { listCustomerOrders } from "@/server/services/account.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  PACKED: "default",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
  RETURNED: "outline",
};

export default async function AccountOrdersPage() {
  const session = await requireCustomer();
  const ordersResult = await attempt("account.orders", () =>
    listCustomerOrders(session.user.id),
  );

  if (!ordersResult.ok) {
    return (
      <AppError
        title="We couldn't load your orders"
        description="Your order history is safe. Please try again in a moment."
      />
    );
  }

  const orders = ordersResult.value;

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground">You have not placed any orders yet.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Order history</h2>
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/account/orders/${order.orderNumber}`} className="font-semibold hover:underline">
                {order.orderNumber}
              </Link>
              <p className="text-xs text-muted-foreground">{formatDateTime(order.placedAt)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.items.length} item{order.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                {ORDER_STATUS_LABELS[order.status]?.en ?? order.status}
              </Badge>
              <Badge variant="outline">
                {PAYMENT_STATUS_LABELS[order.paymentStatus]?.en ?? order.paymentStatus}
              </Badge>
              <span className="font-semibold">{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link href={`/account/orders/${order.orderNumber}`}>View details</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
