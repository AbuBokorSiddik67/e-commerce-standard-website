"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrderAction } from "@/server/actions/customer";
import { toast } from "sonner";

const STATUS_FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];
const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-5 w-5" />,
  CONFIRMED: <CheckCircle2 className="h-5 w-5" />,
  PACKED: <Package className="h-5 w-5" />,
  SHIPPED: <Truck className="h-5 w-5" />,
  DELIVERED: <CheckCircle2 className="h-5 w-5" />,
  CANCELLED: <XCircle className="h-5 w-5" />,
  RETURNED: <XCircle className="h-5 w-5" />,
};

export function TrackOrderClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    orderNumber: string; status: string; paymentStatus: string;
    placedAt: string; deliveredAt: string | null; total: number;
    zone: string | null; items: { name: string; variant: string | null; quantity: number; price: number; lineTotal: number }[];
  }>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const res = await trackOrderAction({
      orderNumber: (form.elements.namedItem("orderNumber") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
    });
    setLoading(false);
    if (res.success) {
      setResult(res.order);
    } else {
      toast.error(res.error ?? "Order not found");
      setResult(null);
    }
  }

  if (!result) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        <div>
          <Label htmlFor="orderNumber">Order Number</Label>
          <Input id="orderNumber" name="orderNumber" placeholder="e.g. ORD-..." required />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" name="phone" placeholder="01XXXXXXXXX" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          <Search className="mr-2 h-4 w-4" /> {loading ? "Searching..." : "Track Order"}
        </Button>
      </form>
    );
  }

  const isCancelled = result.status === "CANCELLED" || result.status === "RETURNED";
  const currentStep = STATUS_FLOW.indexOf(result.status);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-sm text-muted-foreground">Order</p>
            <p className="font-bold">{result.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-bold">৳{result.total}</p>
          </div>
        </div>

        {!isCancelled ? (
          <div className="py-6">
            <div className="flex justify-between">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${i <= currentStep ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background text-muted-foreground"}`}>
                    {STATUS_ICONS[s]}
                  </div>
                  <span className={`mt-2 text-xs ${i <= currentStep ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-6 text-red-600">
            {STATUS_ICONS[result.status]}
            <span className="font-medium">Order {result.status.toLowerCase()}</span>
          </div>
        )}

        <div className="border-t pt-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{result.paymentStatus}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Placed</span><span>{new Date(result.placedAt).toLocaleDateString()}</span></div>
          {result.deliveredAt && <div className="flex justify-between"><span className="text-muted-foreground">Delivered</span><span>{new Date(result.deliveredAt).toLocaleDateString()}</span></div>}
          {result.zone && <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{result.zone}</span></div>}
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 font-semibold">Items</h2>
        <div className="space-y-2 text-sm">
          {result.items.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span>{item.name} {item.variant && `(${item.variant})`} × {item.quantity}</span>
              <span>৳{item.lineTotal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
