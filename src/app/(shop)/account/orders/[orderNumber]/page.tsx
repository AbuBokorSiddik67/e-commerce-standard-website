import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth-guard";
import { getCustomerOrder } from "@/server/services/account.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await requireCustomer();
  const { orderNumber } = await params;
  const orderResult = await attempt("account.orderDetail", () =>
    getCustomerOrder(session.user.id, orderNumber),
  );

  if (!orderResult.ok) {
    return (
      <AppError
        title="We couldn't load this order"
        description="Your order is safe. Please try again in a moment."
      />
    );
  }

  const order = orderResult.value;
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
            ← Back to orders
          </Link>
          <h2 className="mt-1 text-xl font-bold">{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{ORDER_STATUS_LABELS[order.status]?.en ?? order.status}</Badge>
          <Badge variant="outline">
            {PAYMENT_STATUS_LABELS[order.paymentStatus]?.en ?? order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h3 className="font-semibold">Items</h3>
            </div>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(Number(item.price))} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(Number(item.lineTotal))}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 font-semibold">Delivery address</h3>
            <p className="text-sm">{order.fullName}</p>
            <p className="text-sm text-muted-foreground">{order.phone}</p>
            <p className="mt-1 text-sm">
              {order.shippingAddress}, {order.city}, {order.district}
              {order.postalCode ? ` - ${order.postalCode}` : ""}
            </p>
            {order.zone && (
              <p className="mt-1 text-sm text-muted-foreground">
                {order.zone.name}
                {order.zone.estimatedDays ? ` · ${order.zone.estimatedDays}` : ""}
              </p>
            )}
            {order.customerNotes && (
              <p className="mt-2 text-sm text-muted-foreground">Note: {order.customerNotes}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(Number(order.discount))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{formatCurrency(Number(order.deliveryCharge))}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/track-order?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.phone)}`}>
              Track order
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
