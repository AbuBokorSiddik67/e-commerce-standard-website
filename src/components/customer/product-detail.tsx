"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Minus, Plus, ShoppingBag, Truck, ShieldCheck, RotateCcw, ChevronRight } from "lucide-react";
import { useCartStore } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReviewForm } from "./review-form";

type Variant = { id: string; name: string; value: string; sku: string | null; price: string | null; stock: number };
type Review = { id: string; customerName: string; city: string | null; rating: number; title: string | null; body: string | null; createdAt: string };

export function ProductDetail({
  product,
  settings,
}: {
  product: {
    id: string; name: string; slug: string; shortDesc: string | null; description: string | null;
    price: string; compareAtPrice: string | null; sku: string | null; stock: number; weightGrams: number | null;
    images: { id: string; url: string; altText: string | null }[];
    variants: Variant[]; reviews: Review[]; reviewCount: number;
  };
  settings: { currencySymbol: string };
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const variant = product.variants.find((v) => v.id === selectedVariant);
  const effectivePrice = variant?.price ?? product.price;
  const effectiveStock = variant ? variant.stock : product.stock;
  const isOutOfStock = effectiveStock <= 0;

  const compareAt = product.compareAtPrice;
  const discount = compareAt && parseFloat(compareAt) > parseFloat(effectivePrice)
    ? Math.round(((parseFloat(compareAt) - parseFloat(effectivePrice)) / parseFloat(compareAt)) * 100)
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(effectivePrice),
      image: product.images[0]?.url ?? null,
      quantity: qty,
      variantId: selectedVariant ?? undefined,
      variantName: variant ? `${variant.name}: ${variant.value}` : undefined,
      maxStock: effectiveStock,
    });
    toast.success("Added to cart");
  };

  const avgRating = product.reviewCount > 0 ? 4 : 0;

  return (
    <div>
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-foreground">Products</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage].url}
                alt={product.images[activeImage].altText ?? product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
            )}
            {discount > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                -{discount}%
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 ${i === activeImage ? "border-primary" : "border-transparent"}`}
                >
                  <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" sizes="80px" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {product.shortDesc && <p className="mt-2 text-muted-foreground">{product.shortDesc}</p>}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= avgRating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{settings.currencySymbol}{effectivePrice}</span>
            {compareAt && parseFloat(compareAt) > parseFloat(effectivePrice) && (
              <span className="text-lg text-muted-foreground line-through">{settings.currencySymbol}{compareAt}</span>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Select {product.variants[0]?.name}</span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v.id); setQty(1); }}
                    disabled={v.stock <= 0}
                    className={`rounded-md border px-4 py-2 text-sm transition ${selectedVariant === v.id ? "border-primary bg-primary/10" : "hover:border-foreground/30"} ${v.stock <= 0 ? "opacity-50 line-through" : ""}`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-md border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 hover:bg-muted" disabled={isOutOfStock}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center font-medium">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))} className="p-2 hover:bg-muted" disabled={isOutOfStock}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleAddToCart} disabled={isOutOfStock} size="lg" className="flex-1">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t pt-5 text-center text-xs">
            <div className="space-y-1">
              <Truck className="mx-auto h-5 w-5 text-primary" />
              <p>Fast Delivery</p>
            </div>
            <div className="space-y-1">
              <ShieldCheck className="mx-auto h-5 w-5 text-primary" />
              <p>100% Authentic</p>
            </div>
            <div className="space-y-1">
              <RotateCcw className="mx-auto h-5 w-5 text-primary" />
              <p>Easy Returns</p>
            </div>
          </div>

          {product.description && (
            <div className="prose prose-sm max-w-none pt-4">
              <h3 className="text-base font-semibold">Description</h3>
              <div className="whitespace-pre-line text-muted-foreground">{product.description}</div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-12 border-t pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Customer Reviews ({product.reviewCount})</h2>
          <Button variant="outline" size="sm" onClick={() => setShowReviewForm((s) => !s)}>
            Write a Review
          </Button>
        </div>

        {showReviewForm && <ReviewForm productId={product.id} onDone={() => setShowReviewForm(false)} />}

        {product.reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {product.reviews.map((r) => (
              <div key={r.id} className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
                    ))}
                  </div>
                  <span className="font-medium">{r.customerName}</span>
                  {r.city && <span className="text-sm text-muted-foreground">· {r.city}</span>}
                </div>
                {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
