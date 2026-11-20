import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, Truck, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const orderResult = await attempt("orderSuccess.load", () =>
    prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, zone: true },
    }),
  );
  if (!orderResult.ok) {
    return (
      <AppError
        title="We couldn't load this order"
        description="Your order may still be confirmed, but we can't display the details right now. Please check Track Order or contact support."
      />
    );
  }
  const order = orderResult.value;
  if (!order) notFound();

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold">Order Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">Thank you for your order. We'll call you to confirm shortly.</p>

        <div className="mt-8 rounded-lg border p-6 text-left">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-lg font-bold">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-bold">৳{Number(order.total)}</p>
            </div>
          </div>

          <div className="space-y-2 py-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} {item.variant && `(${item.variant})`} × {item.quantity}</span>
                <span>৳{Number(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span>{order.shippingAddress}, {order.city}, {order.district}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>{order.zone?.name ?? "Standard delivery"} · Cash on Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Status: {order.status}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild><Link href="/track-order">Track Your Order</Link></Button>
          <Button asChild variant="outline"><Link href="/products">Continue Shopping</Link></Button>
        </div>
      </div>
    </div>
  );
}
