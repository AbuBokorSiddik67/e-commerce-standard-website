"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Truck, ShieldCheck, Loader2 } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { placeOrderAction } from "@/server/actions/customer";
import { BANGLADESH_DISTRICTS } from "@/lib/constants";
import type { SafeDeliveryZone } from "@/types/domain";

export default function CheckoutClient({ zones, minOrderValue }: { zones: SafeDeliveryZone[]; minOrderValue: number | null }) {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCartStore((s) => s.couponCode);
  const subtotal = useCartSubtotal();
  const router = useRouter();
  const [zoneId, setZoneId] = useState("");
  const [loading, startTransition] = useTransition();

  const zone = zones.find((z) => z.id === zoneId);
  const deliveryCharge = zone ? Number(zone.charge) : 0;
  const total = subtotal + deliveryCharge;

  const meetsMin = minOrderValue === null || subtotal >= minOrderValue;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!meetsMin) {
      toast.error(`Minimum order amount is ৳${minOrderValue}`);
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const form = e.currentTarget;
    const data = {
      fullName: (form.elements.namedItem("fullName") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      address: (form.elements.namedItem("address") as HTMLInputElement).value,
      district: (form.elements.namedItem("district") as HTMLSelectElement).value,
      city: (form.elements.namedItem("city") as HTMLInputElement).value,
      postalCode: (form.elements.namedItem("postalCode") as HTMLInputElement).value,
      zoneId,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      couponCode: couponCode ?? "",
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variantId: i.variantId ?? "",
      })),
      idempotencyKey: crypto.randomUUID(),
    };
    startTransition(async () => {
      const res = await placeOrderAction(data);
      if (res.success && res.orderNumber) {
        clearCart();
        router.push(`/order-success/${res.orderNumber}`);
      } else {
        toast.error(res.error ?? "Failed to place order");
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add items before checking out.</p>
        <Button asChild className="mt-6"><Link href="/products">Browse Products</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-8 text-2xl font-bold">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Delivery Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" placeholder="01XXXXXXXXX" required />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div>
              <Label htmlFor="address">Full Address *</Label>
              <Textarea id="address" name="address" rows={2} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="district">District *</Label>
                <select id="district" name="district" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Select district</option>
                  {BANGLADESH_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="city">City / Area *</Label>
                <Input id="city" name="city" required />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" name="postalCode" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Delivery Zone *</h2>
            <div className="space-y-2">
              {zones.map((z) => (
                <label key={z.id} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition ${zoneId === z.id ? "border-primary bg-primary/5" : "hover:border-foreground/30"}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="zoneRadio" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="h-4 w-4" />
                    <div>
                      <span className="font-medium">{z.name}</span>
                      {z.estimatedDays && <span className="block text-sm text-muted-foreground">{z.estimatedDays}</span>}
                    </div>
                  </div>
                  <span className="font-semibold">৳{z.charge}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Order Notes (optional)</h2>
            <Textarea name="notes" rows={2} placeholder="Any special instructions for delivery..." />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-5 space-y-4">
            <h2 className="font-semibold">Order Summary</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? ""}`} className="flex justify-between">
                  <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span>৳{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>৳{subtotal}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>{deliveryCharge > 0 ? `৳${deliveryCharge}` : "Select zone"}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>৳{total}</span></div>
            </div>
            {!meetsMin && (
              <p className="text-sm text-red-600">Minimum order ৳{minOrderValue}. Add ৳{minOrderValue! - subtotal} more.</p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading || !zoneId || !meetsMin}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order...</> : "Place Order (COD)"}
            </Button>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Fast Delivery</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Cash on Delivery</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
