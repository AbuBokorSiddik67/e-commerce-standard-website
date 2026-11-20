"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { useState } from "react";
import { useCartStore, useCartSubtotal } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { applyCouponAction } from "@/server/actions/customer";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const subtotal = useCartSubtotal();
  const [code, setCode] = useState(couponCode ?? "");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  const total = subtotal - discount;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    const res = await applyCouponAction(code, subtotal);
    setLoading(false);
    if (res.success) {
      setCoupon(code);
      setDiscount(res.discount);
      toast.success("Coupon applied");
    } else {
      toast.error(res.error ?? "Invalid coupon");
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our products and add items to your cart.</p>
        <Button asChild className="mt-6"><Link href="/products">Continue Shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-8 text-2xl font-bold">Shopping Cart</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId ?? ""}`} className="flex gap-4 rounded-lg border p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" unoptimized />}
              </div>
              <div className="flex flex-1 flex-col">
                <Link href={`/product/${item.slug}`} className="font-medium hover:text-primary">{item.name}</Link>
                {item.variantName && <span className="text-sm text-muted-foreground">{item.variantName}</span>}
                <span className="text-sm font-medium">৳{item.price}</span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-md border">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)} className="p-1.5 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                    <span className="w-10 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="p-1.5 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => removeItem(item.productId, item.variantId)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="text-right font-semibold">৳{item.price * item.quantity}</div>
            </div>
          ))}
          <button onClick={clearCart} className="text-sm text-muted-foreground hover:text-foreground">Clear cart</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-lg border p-5">
            <h2 className="font-semibold">Order Summary</h2>
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="pl-8" />
              </div>
              <Button type="submit" variant="outline" disabled={loading}>Apply</Button>
            </form>
            {couponCode && discount > 0 && <p className="text-sm text-green-600">Coupon "{couponCode}" applied</p>}
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>৳{subtotal}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-৳{discount}</span></div>}
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>৳{total}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Delivery charge calculated at checkout.</p>
            <Button asChild className="w-full" size="lg"><Link href="/checkout">Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href="/products">Continue Shopping</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
