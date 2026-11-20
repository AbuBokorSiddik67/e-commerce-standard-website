import { catalogAvailability } from "@/lib/product-availability";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth-guard";
import { listWishlist } from "@/server/services/account.service";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { ProductCard } from "@/components/customer/product-card";
import { Button } from "@/components/ui/button";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AccountWishlistPage() {
  const session = await requireCustomer();
  const [wishlistResult, settings] = await Promise.all([
    attempt("account.wishlist", () => listWishlist(session.user.id)),
    getStoreSettings(),
  ]);

  if (!wishlistResult.ok) {
    return (
      <AppError
        title="We couldn't load your wishlist"
        description="Your saved items are safe. Please try again in a moment."
      />
    );
  }

  const items = wishlistResult.value;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground">Your wishlist is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Wishlist ({items.length})</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(({ product }) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              ...catalogAvailability(product),
              compareAtPrice: product.compareAtPrice?.toString() ?? null,
              images: product.images,
                            isActive: product.isActive,
            }}
            currencySymbol={settings.currencySymbol}
            initialWishlisted
            refreshOnWishlist
          />
        ))}
      </div>
    </div>
  );
}
