import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { getOrderById } from "@/server/services/order.service";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusControls } from "@/components/admin/order-status-controls";
import { AppError } from "@/components/shared/app-error";
import { attempt, isPlainObject } from "@/lib/errors";
import { ArrowLeft } from "lucide-react";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const orderResult = await attempt("admin.orderDetail", () => getOrderById(id));
  await getStoreSettings();

  if (!orderResult.ok) {
    return (
      <AppError
        variant="admin"
        title="This order could not be loaded"
        description="We couldn't fetch the order details. The order is safe — please retry in a moment."
      />
    );
  }

  const order = orderResult.value;
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground" aria-label="Back to orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.placedAt)}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {ORDER_STATUS_LABELS[order.status]?.en ?? order.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(item.price))} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(Number(item.lineTotal))}</p>
                  </li>
                ))}
              </ul>
              <Separator className="my-4" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span></div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(Number(order.discount))}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery ({order.zone?.name})</span><span>{formatCurrency(Number(order.deliveryCharge))}</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(Number(order.total))}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader><CardTitle className="text-base">Manage Order</CardTitle></CardHeader>
            <CardContent>
              <OrderStatusControls
                orderId={order.id}
                status={order.status}
                paymentStatus={order.paymentStatus}
                adminNotes={order.adminNotes}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.fullName}</p>
              <p>{order.phone}</p>
              {order.email && <p className="text-muted-foreground">{order.email}</p>}
              {order.userId && (
                <Badge variant="outline" className="mt-1">Registered customer</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Delivery Address</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.shippingAddress}</p>
              <p>{order.city}, {order.district}</p>
              {order.postalCode && <p>{order.postalCode}</p>}
              {order.zone && <p className="text-muted-foreground">Zone: {order.zone.name} ({order.zone.estimatedDays})</p>}
            </CardContent>
          </Card>

          {order.customerNotes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Customer Notes</CardTitle></CardHeader>
              <CardContent className="text-sm">{order.customerNotes}</CardContent>
            </Card>
          )}

          <Card className="print:hidden">
            <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Method: Cash on Delivery (COD)</p>
              <p>Status: <Badge variant={order.paymentStatus === "PAID" ? "secondary" : "outline"}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus]?.en ?? order.paymentStatus}
              </Badge></p>
              {order.cancelReason && <p className="text-destructive">Cancelled: {order.cancelReason}</p>}
            </CardContent>
          </Card>
          <Card className="print:hidden">
            <CardHeader><CardTitle className="text-base">Recent Order Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Order received · {formatDateTime(order.placedAt)}</p>
              {order.activity.map((event) => {
                const detail = isPlainObject(event.detail) ? event.detail : {};
                const payment = event.action === "ORDER_PAYMENT_STATUS_CHANGE";
                const labels = payment ? PAYMENT_STATUS_LABELS : ORDER_STATUS_LABELS;
                const label = (value: unknown) => typeof value === "string" ? labels[value]?.en ?? value : "";
                const from = label(detail.from);
                const to = label(detail.to ?? detail.paymentStatus);
                return <p key={event.id}>{payment ? "Payment" : "Order"}: {from && `${from} → `}{to || "Updated"} · {formatDateTime(event.createdAt)}</p>;
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
