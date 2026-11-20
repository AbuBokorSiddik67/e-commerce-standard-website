"use client";

import { useState } from "react";
import Image from "next/image";
import { Breadcrumbs } from "@/components/shared/page-heading";
import { toggleWishlistAction } from "@/server/actions/account";
import { formatCurrency } from "@/lib/utils";
import { Star, Minus, Plus, ShoppingBag, Truck, ShieldCheck, RotateCcw, Heart } from "lucide-react";
import { useCartStore } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReviewForm } from "./review-form";

type Variant = { id: string; name: string; value: string; sku: string | null; price: string | null; stock: number };
type Review = { id: string; customerName: string; city: string | null; rating: number; title: string | null; body: string | null; createdAt: string };

export function ProductDetail({
  product,
  settings,
  initialWishlisted,
}: {
  product: {
    id: string; name: string; slug: string; shortDesc: string | null; description: string | null;
    requiresVariant: boolean; price: string; compareAtPrice: string | null; sku: string | null; stock: number; weightGrams: number | null;
    images: { id: string; url: string; altText: string | null }[];
    variants: Variant[]; reviews: Review[]; reviewCount: number;
  };
  settings: { currencySymbol: string };
  initialWishlisted: boolean;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [saving, setSaving] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const variant = product.variants.find((v) => v.id === selectedVariant);
  const effectivePrice = variant?.price ?? product.price;
  const effectiveStock = Math.min(100, variant?.stock ?? (product.requiresVariant ? 0 : product.stock));
  const needsVariant = product.requiresVariant && !variant && product.variants.some((option) => option.stock > 0);
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
      quantity: Math.min(qty, effectiveStock),
      variantId: selectedVariant ?? undefined,
      variantName: variant ? `${variant.name}: ${variant.value}` : undefined,
      maxStock: effectiveStock,
    });
    toast.success("Added to cart");
  };

  const avgRating = product.reviews.length ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length : 0;
  const money = (amount: string) => formatCurrency(Number(amount), settings.currencySymbol);
  async function wishlist() {
    setSaving(true);
    try {
      const result = await toggleWishlistAction(product.id);
      if (!result.success) { toast.error(result.error ?? "Could not update wishlist"); return; }
      setWishlisted(Boolean(result.wishlisted));
      toast.success(result.wishlisted ? "Added to wishlist" : "Removed from wishlist");
    } catch { toast.error("Could not update wishlist"); }
    finally { setSaving(false); }
  }
  return (
    <div>
      <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Shop",href:"/products"},{label:product.name}]} />

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage].url}
                alt={product.images[activeImage].altText ?? product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={activeImage === 0}
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
                  aria-label={`View image ${i + 1}`} aria-pressed={i === activeImage}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 ${i === activeImage ? "border-primary" : "border-transparent"}`}
                >
                  <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="surface space-y-5 p-4 sm:p-6 lg:p-8">
          <div>
            <p className="eyebrow mb-2 text-primary">Product details</p><h1 className="page-title">{product.name}</h1>
            {product.shortDesc && <p className="mt-2 text-muted-foreground">{product.shortDesc}</p>}
          </div>

          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">{product.reviewCount ? <><Star className="size-4 fill-amber-500 text-amber-700" aria-hidden="true" /><strong className="text-foreground">{avgRating.toFixed(1)} / 5</strong> · {product.reviewCount} reviews</> : "No reviews yet"}</p>
          <div className="flex flex-wrap items-baseline gap-3 tabular-nums">
            {(!product.requiresVariant || variant) && <span className="text-3xl font-bold">{money(effectivePrice)}</span>}
            {(!product.requiresVariant || variant) && compareAt && discount > 0 && <del className="text-lg text-muted-foreground">{money(compareAt)}</del>}
          </div>

          {product.variants.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Select {product.variants[0]?.name}</span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    aria-pressed={selectedVariant === v.id}
                    onClick={() => { setSelectedVariant(v.id); setQty(1); }}
                    disabled={v.stock <= 0}
                    className={`rounded-md border px-4 py-2 text-sm transition ${selectedVariant === v.id ? "border-primary bg-primary/10" : "hover:border-foreground/30"} ${v.stock <= 0 ? "opacity-50 line-through" : ""}`}
                  >
                    {v.value} · {money(v.price ?? product.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p aria-live="polite" className="text-sm font-semibold text-muted-foreground">{needsVariant ? "Choose a variant to check availability." : isOutOfStock ? "Out of stock" : "In stock"}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded-md border">
              <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-10 place-items-center hover:bg-muted" disabled={isOutOfStock || qty <= 1}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-7 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))} className="grid size-10 place-items-center hover:bg-muted" disabled={isOutOfStock || qty >= effectiveStock}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleAddToCart} disabled={isOutOfStock} size="lg" className="flex-1">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {needsVariant ? "Select a variant" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Button size="icon" variant="outline" aria-label="Wishlist" aria-pressed={wishlisted} disabled={saving} onClick={wishlist}><Heart className={wishlisted ? "size-5 fill-rose-600 text-rose-600" : "size-5"} /></Button>
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

          {(product.sku || product.weightGrams) && <dl className="grid gap-2 border-t pt-4 text-sm sm:grid-cols-2">{(variant?.sku || product.sku) && <div><dt className="text-xs text-muted-foreground">SKU</dt><dd className="font-semibold">{variant?.sku || product.sku}</dd></div>}{product.weightGrams && <div><dt className="text-xs text-muted-foreground">Weight</dt><dd className="font-semibold">{product.weightGrams} g</dd></div>}</dl>}
          {product.description && (
            <div className="prose prose-sm max-w-none pt-4">
              <h3 className="text-base font-semibold">Description</h3>
              <div className="whitespace-pre-line text-muted-foreground">{product.description}</div>
            </div>
          )}
        </div>
      </div>

      <section className="surface mt-8 p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Customer reviews ({product.reviewCount})</h2>
          <Button variant="outline" size="sm" aria-expanded={showReviewForm} onClick={() => setShowReviewForm((s) => !s)}>
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
                  <div className="flex" aria-label={`${r.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} aria-hidden="true" className={`h-4 w-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
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
