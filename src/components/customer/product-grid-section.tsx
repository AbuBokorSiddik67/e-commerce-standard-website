import { catalogAvailability, type CatalogInventory } from "@/lib/product-availability";
import { catalogDisplay } from "@/server/services/catalog-display";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/customer/product-card";
import type { SafeHomepageSection, StoreSettings } from "@/types/domain";
import type { Product } from "@prisma/client";

export async function ProductGridSection({
  section, products, settings, viewAllHref, viewAllText,
}: {
  section: SafeHomepageSection;
  products: (Product & CatalogInventory & { images: { url: string }[] })[] | undefined;
  settings: StoreSettings;
  viewAllHref?: string;
  viewAllText?: string;
}) {
  if (!products || products.length === 0) return null;

  const display = await catalogDisplay(products.map(p => p.id));

  return (
    <section className="container-page py-7 lg:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
        <div>
          <p className="eyebrow mb-2 text-primary">From the catalog</p>
          {section.title && <h2 className="section-title">{section.title}</h2>}
          {section.subtitle && <p className="mt-1 text-muted-foreground">{section.subtitle}</p>}
        </div>
        {viewAllHref && viewAllText && (
          <Button variant="outline" size="sm" asChild>
            <Link href={viewAllHref}>{viewAllText}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              slug: p.slug,
              ...catalogAvailability(p),
              compareAtPrice: p.compareAtPrice?.toString() ?? null,
              images: p.images,
              isActive: p.isActive,
              rating: display.ratings.get(p.id),
            }}
            initialWishlisted={display.wishlist.has(p.id)}
            isNew={section.sectionKey === "NEW_ARRIVALS"}
            currencySymbol={settings.currencySymbol}
          />
        ))}
      </div>
    </section>
  );
}
