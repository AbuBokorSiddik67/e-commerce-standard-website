"use client";

import { PageHeading, EmptyState } from "@/components/shared/page-heading";
import { useStoreSettings } from "@/hooks/use-store-settings";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { useState } from "react";
import { useCartStore, useCartSubtotal, useCartHydrated } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { applyCouponAction } from "@/server/actions/customer";

import { CART_VIEWPORT, CartLoading } from "@/components/customer/cart-loading";

export default function CartPage() {
  const currency = useStoreSettings()?.currencySymbol as string | undefined ?? "৳";
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const estimate = useCartSubtotal();
  const lines = items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity }));
  const lineKey = JSON.stringify(lines);
  const [code, setCode] = useState(couponCode ?? "");
  const [preview, setPreview] = useState<{ key: string; code: string | null; discount: string; subtotal: string; total: string }>();
  const [loading, setLoading] = useState(false);

  const validPreview = couponCode && preview?.code === couponCode && preview.key === lineKey ? preview : undefined;
  const subtotal = validPreview?.subtotal ?? estimate.toFixed(2);
  const discount = validPreview?.discount;
  const total = validPreview?.total ?? subtotal;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await applyCouponAction({ couponCode: code, items: lines });
      if (res.success) {
        setCoupon(res.code);
        setPreview({ key: lineKey, code: res.code, subtotal: res.subtotal, discount: res.discount, total: res.total });
        toast.success("Coupon applied");
      } else toast.error(res.error);
    } catch { toast.error("Could not check your coupon"); }
    finally { setLoading(false); }
  }

  return (
    <div className={`container-page py-8 ${CART_VIEWPORT}`}>
      <PageHeading label="Your bag" title="Shopping cart" description="Review your items before choosing delivery at checkout." />
      {!hydrated ? <CartLoading label="Loading cart" /> : items.length === 0 ?
        <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Browse the catalog and add something you like." href="/products" action="Continue shopping" /> :
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="min-w-0 space-y-3">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId ?? ""}`} className="surface flex flex-wrap items-start gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
              <div className="relative size-16 sm:size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="(max-width: 639px) 64px, 96px" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/product/${item.slug}`} className="font-medium hover:text-primary">{item.name}</Link>
                {item.variantName && <span className="text-sm text-muted-foreground">{item.variantName}</span>}
                <span className="text-sm font-medium">{currency}{item.price}</span>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center rounded-md border">
                    <button aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)} className="grid size-9 place-items-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                    <span className="w-10 text-center text-sm">{item.quantity}</span>
                    <button aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= item.maxStock} onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="grid size-9 place-items-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.productId, item.variantId)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="w-full text-right text-sm font-bold sm:w-auto">{currency}{item.price * item.quantity}</div>
            </div>
          ))}
          <button onClick={clearCart} className="text-sm text-muted-foreground hover:text-foreground">Clear cart</button>
        </div>

        <div className="space-y-4">
          <div className="surface space-y-4 p-4 sm:p-5">
            <h2 className="font-semibold">Order Summary</h2>
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Coupon code" maxLength={64} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="pl-8" />
              </div>
              <Button type="submit" variant="outline" disabled={loading}>{loading ? "Checking…" : "Apply"}</Button>
            </form>
            {couponCode && <p className="text-sm text-muted-foreground">Coupon {couponCode} {validPreview ? "applied" : "saved; final discount checked at checkout"}. <button type="button" className="underline" onClick={() => { setCoupon(null); setCode(""); setPreview(undefined); }}>Remove</button></p>}
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{currency}{subtotal}</span></div>
              {discount && Number(discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{currency}{discount}</span></div>}
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Items total</span><span>{currency}{total}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Delivery charge calculated at checkout.</p>
            <Button asChild className="w-full" size="lg"><Link href="/checkout">Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href="/products">Continue Shopping</Link></Button>
          </div>
        </div>
      </div>}
    </div>
  );
}
