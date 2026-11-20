"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useCartStore } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistAction } from "@/server/actions/account";

type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  images: { url: string }[];
  stock: number;
  isActive: boolean;
  isNew?: boolean;
};

export function ProductCard({
  product,
  currencySymbol = "৳",
  isNew = false,
  initialWishlisted = false,
  refreshOnWishlist = false,
}: {
  product: ProductCardData;
  currencySymbol?: string;
  isNew?: boolean;
  initialWishlisted?: boolean;
  refreshOnWishlist?: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);

  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const discount = compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const outOfStock = product.stock <= 0;
  const image = product.images[0]?.url;

  function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) { toast.error("Out of stock"); return; }
    setAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price,
      image: image ?? null,
      quantity: 1,
      maxStock: product.stock,
    });
    toast.success("Added to cart");
    setTimeout(() => setAdding(false), 500);
  }

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleWishlistAction(product.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not update wishlist");
      return;
    }
    setWishlisted(Boolean(result.wishlisted));
    toast.success(result.wishlisted ? "Added to wishlist" : "Removed from wishlist");
    if (refreshOnWishlist) router.refresh();
  }

  return (
    <Link href={`/product/${product.slug}`} className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && <Badge variant="destructive">-{discount}%</Badge>}
          {isNew && <Badge>New</Badge>}
          {outOfStock && <Badge variant="secondary">Out of stock</Badge>}
        </div>
        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm transition-colors hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold">{formatCurrency(price, currencySymbol)}</span>
          {compareAt && compareAt > price && (
            <span className="text-xs text-muted-foreground line-through">{formatCurrency(compareAt, currencySymbol)}</span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <Button
            size="sm"
            className="w-full"
            onClick={addToCart}
            disabled={outOfStock || adding}
          >
            <ShoppingCart className="h-4 w-4" /> {adding ? "Added!" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </Link>
  );
}
