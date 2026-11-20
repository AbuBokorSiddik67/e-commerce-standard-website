"use client";

import { useRef, useState, useTransition } from "react";
import { PageHeading } from "@/components/shared/page-heading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, ShieldCheck, Loader2 } from "lucide-react";
import { useCartStore } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { placeOrderAction, quoteCheckoutAction } from "@/server/actions/customer";
import { BANGLADESH_DISTRICTS } from "@/lib/constants";
import type { SafeDeliveryZone } from "@/types/domain";

type Quote = Extract<Awaited<ReturnType<typeof quoteCheckoutAction>>, { success: true }>["quote"];
type Intent = { inputHash: string; key: string; quote?: Quote };
const INTENT_KEY = "shopbd-checkout-intent";

async function intentHash(input: unknown) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function CheckoutClient({ zones, codEnabled, currency }: { zones: SafeDeliveryZone[]; codEnabled: boolean; currency: string }) {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const router = useRouter();
  const [zoneId, setZoneId] = useState("");
  const [district, setDistrict] = useState("");
  const [displayQuote, setDisplayQuote] = useState<Quote>();
  const [loading, startTransition] = useTransition();
  const inFlight = useRef(false);
  const currentIntent = useRef<Intent | null>(null);
  const availableZones = zones.filter((zone) => zone.districts.includes(district));

  function saveIntent(intent: Intent | null) {
    currentIntent.current = intent;
    try {
      if (intent) sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
      else sessionStorage.removeItem(INTENT_KEY);
    } catch { /* The in-memory intent still protects retries in this page. */ }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || !items.length || !zoneId || !codEnabled) return;
    const fields = new FormData(e.currentTarget);
    const field = (key: string) => String(fields.get(key) ?? "").trim();
    const payload = {
      fullName: field("fullName"), phone: field("phone"), email: field("email"), address: field("address"),
      district, city: field("city"), postalCode: field("postalCode"), notes: field("notes"), zoneId,
      couponCode: couponCode ?? "", items: items.map(({ productId, quantity, variantId }) => ({ productId, quantity, variantId: variantId ?? "" }))
        .sort((a, b) => a.productId.localeCompare(b.productId) || a.variantId.localeCompare(b.variantId)),
    };
    inFlight.current = true;
    startTransition(async () => {
      try {
        const inputHash = await intentHash(payload);
        let stored = currentIntent.current;
        if (!stored) {
          try { stored = JSON.parse(sessionStorage.getItem(INTENT_KEY) ?? "null") as Intent | null; } catch { /* ignore invalid storage */ }
        }
        let intent = stored?.inputHash === inputHash && stored.key ? stored : { inputHash, key: crypto.randomUUID() };
        if (!intent.quote) {
          const response = await quoteCheckoutAction(payload);
          if (!response.success) { setDisplayQuote(undefined); toast.error(response.error); return; }
          intent = { ...intent, quote: response.quote };
          saveIntent(intent);
          setDisplayQuote(response.quote);
          return;
        }
        // A quote recovered after refresh must be displayed before confirming it.
        const quote = intent.quote;
        if (!displayQuote || displayQuote.fingerprint !== quote.fingerprint) {
          saveIntent(intent);
          setDisplayQuote(quote);
          return;
        }
        saveIntent(intent);
        const result = await placeOrderAction({ ...payload, idempotencyKey: intent.key, expectedQuote: quote.fingerprint });
        if (!result.success || !result.orderNumber) {
          const error = result.error ?? "Could not confirm the order";
          if (/checkout prices changed|checkout session expired/i.test(error)) {
            saveIntent({ inputHash, key: intent.key });
            setDisplayQuote(undefined);
          }
          toast.error(error);
          return;
        }
        saveIntent(null);
        clearCart();
        if (result.receiptExpired) {
          toast.success(`Order ${result.orderNumber} was already placed. Use Track Order to see its status.`);
          router.push("/track-order");
        } else router.push(`/order-success/${encodeURIComponent(result.orderNumber)}`);
      } catch {
        toast.error("Could not confirm the request. Retry without changing your checkout details to avoid placing a second order.");
      } finally { inFlight.current = false; }
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
      <PageHeading label="Your order · Delivery and payment" title="Checkout" description="Enter your delivery details, then review the total before placing your order." />
      <form onSubmit={handleSubmit} onChange={() => setDisplayQuote(undefined)} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="min-w-0 space-y-4">
          <div className="surface space-y-4 p-4 sm:p-6">
            <h2 className="text-lg font-bold tracking-tight">1. Contact & delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" minLength={2} maxLength={100} autoComplete="name" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" placeholder="01XXXXXXXXX" aria-describedby="phone-help" type="tel" autoComplete="tel-national" pattern="01[3-9][0-9]{8}" maxLength={11} required /><p id="phone-help" className="mt-1 text-xs text-muted-foreground">Use your 11-digit Bangladesh mobile number.</p>
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" name="email" type="email" maxLength={254} autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="address">Full Address *</Label>
              <Textarea id="address" name="address" rows={2} minLength={5} maxLength={500} autoComplete="street-address" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="district">District *</Label>
                <select id="district" name="district" value={district} onChange={(e) => { setDistrict(e.target.value); setZoneId(""); }} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Select district</option>
                  {BANGLADESH_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="city">City / Area *</Label>
                <Input id="city" name="city" maxLength={100} autoComplete="address-level2" required />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" name="postalCode" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="postal-code" />
              </div>
            </div>
          </div>

          <div className="surface space-y-4 p-4 sm:p-6">
            <h2 id="delivery-options" className="text-lg font-bold tracking-tight">2. Delivery option</h2>
            <div className="space-y-2" role="group" aria-labelledby="delivery-options">
              {zones.length === 0 && <p className="text-sm text-destructive" role="status">No delivery options are configured. <Link href="/contact" className="underline">Contact us</Link> for help.</p>}
              {!district && zones.length > 0 && <p className="text-sm text-muted-foreground">Select a district to see delivery options.</p>}
              {district && availableZones.length === 0 && <p className="text-sm text-muted-foreground">Delivery is not currently available for this district.</p>}
              {availableZones.map((z) => (
                <label key={z.id} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition ${zoneId === z.id ? "border-primary bg-primary/5" : "hover:border-foreground/30"}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="zoneRadio" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="size-4 accent-primary" />
                    <div>
                      <span className="font-medium">{z.name}</span>
                      {z.estimatedDays && <span className="block text-sm text-muted-foreground">{z.estimatedDays}</span>}
                    </div>
                  </div>
                  <span className="font-semibold">{currency}{z.charge}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="surface space-y-4 p-4 sm:p-6">
            <h2 className="font-semibold">Order Notes (optional)</h2>
            <Textarea aria-label="Order notes" name="notes" rows={2} maxLength={500} placeholder="Any special instructions for delivery..." />
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Order Summary</h2>
              <Link href="/cart" className="text-sm underline">Edit cart</Link>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId ?? ""}`} className="flex justify-between">
                  <span className="text-muted-foreground">{item.name}{item.variantName ? ` (${item.variantName})` : ""} × {item.quantity}</span>
                  <span>{displayQuote ? `${currency}${displayQuote.lines.find((line) => line.productId === item.productId && (line.variantId ?? "") === (item.variantId ?? ""))?.lineTotal ?? "—"}` : "—"}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3 text-sm tabular-nums" aria-live="polite">
              <div className="flex justify-between"><span>Subtotal</span><span>{displayQuote ? `${currency}${displayQuote.subtotal}` : "Review total"}</span></div>
              {couponCode && <div className="flex justify-between"><span>Discount ({couponCode}) <button type="button" className="underline" onClick={() => { setCoupon(null); setDisplayQuote(undefined); }}>Remove</button></span><span>{displayQuote ? `−${currency}${displayQuote.discount}` : "—"}</span></div>}
              <div className="flex justify-between"><span>Delivery</span><span>{displayQuote ? `${currency}${displayQuote.shipping}` : "—"}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Payable on delivery</span><span>{displayQuote ? `${currency}${displayQuote.total}` : "—"}</span></div>
            </div>
            {!codEnabled && <p className="text-sm text-destructive">Cash on delivery is currently unavailable.</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading || !zoneId || !codEnabled}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</> : displayQuote ? "Place Order (COD)" : "Review order total"}
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
