import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowUpRight, Star } from "lucide-react";
import { CardCartButton, CardWishlistButton } from "./product-card-actions";

type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  images: { url: string }[];
  stock: number;
  requiresVariant: boolean;
  isActive: boolean;
  rating?: { average: number; count: number };
};

export function ProductCard({
  product,
  currencySymbol = "৳",
  isNew = false,
  initialWishlisted = false,
  refreshOnWishlist = false,
  eager = false,
}: {
  product: ProductCardData;
  currencySymbol?: string;
  isNew?: boolean;
  initialWishlisted?: boolean;
  refreshOnWishlist?: boolean;
  eager?: boolean;
}) {
  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const discount = compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const outOfStock = !product.isActive || product.stock <= 0;
  const image = product.images[0]?.url;

  return <article className="surface group relative flex min-w-0 flex-col transition-colors hover:border-primary/40">
    <Link prefetch={false} className="relative block aspect-[1.16] overflow-hidden rounded-t-2xl bg-[#e8edf5]" href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
      {image ? <Image src={image} alt="" fill loading={eager ? "eager" : "lazy"} sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, (max-width: 1279px) 24vw, 294px" className="object-cover transition-transform duration-300 group-hover:scale-[1.035]" />
        : <div className="grid h-full place-items-center text-muted-foreground"><ShoppingBag className="size-7" aria-hidden="true" /></div>}
      <div className="absolute left-2 top-2 flex max-w-[calc(100%-3rem)] flex-wrap gap-1 sm:left-3 sm:top-3">
        {discount > 0 && <Badge className="border-transparent bg-[#fde6e2] text-[#8a261a] hover:bg-[#fde6e2]">−{discount}%</Badge>}
        {isNew && <Badge className="border-transparent bg-white text-[#244eab] hover:bg-white">New</Badge>}
        {outOfStock && <Badge variant="secondary">Out of stock</Badge>}
      </div>
    </Link>
    <CardWishlistButton productId={product.id} name={product.name} initial={initialWishlisted} refresh={refreshOnWishlist} />
    <div className="flex flex-1 flex-col p-3 sm:p-4">
      <h3 className="text-sm font-bold leading-snug"><Link prefetch={false} href={`/product/${product.slug}`} className="hover:underline">{product.name}</Link></h3>
      {product.rating && product.rating.count > 0 && <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground" aria-label={`${product.rating.average.toFixed(1)} out of 5, ${product.rating.count} approved reviews`}><Star className="size-3 fill-amber-500 text-amber-700" aria-hidden="true" /> {product.rating.average.toFixed(1)} ({product.rating.count})</p>}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
        <span className="text-sm font-extrabold sm:text-base">{product.requiresVariant ? 'From ' : ''}{formatCurrency(price, currencySymbol)}</span>
        {compareAt && compareAt > price && <del className="text-xs text-muted-foreground">{formatCurrency(compareAt, currencySymbol)}</del>}
      </div>
      <div className="mt-auto pt-3">{product.requiresVariant && !outOfStock ?
        <Button asChild variant="outline" size="sm" className="w-full px-1.5 text-[0.7rem] sm:text-xs"><Link prefetch={false} href={`/product/${product.slug}`}><ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" /> Choose variant</Link></Button> :
        <CardCartButton disabled={outOfStock} item={{ productId: product.id, name: product.name, slug: product.slug, price, image: image ?? null, quantity: 1, maxStock: Math.min(100, product.stock) }} />}</div>
    </div>
  </article>;
}
