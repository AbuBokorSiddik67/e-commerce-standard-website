import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/customer/product-card";
import type { SafeHomepageSection, StoreSettings } from "@/types/domain";
import type { Product } from "@prisma/client";

export function ProductGridSection({
  section, products, settings, viewAllHref, viewAllText,
}: {
  section: SafeHomepageSection;
  products: (Product & { images: { url: string }[] })[] | undefined;
  settings: StoreSettings;
  viewAllHref?: string;
  viewAllText?: string;
}) {
  if (!products || products.length === 0) return null;

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
          {section.subtitle && <p className="mt-1 text-muted-foreground">{section.subtitle}</p>}
        </div>
        {viewAllHref && viewAllText && (
          <Button variant="outline" size="sm" asChild>
            <Link href={viewAllHref}>{viewAllText}</Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.price.toString(),
              compareAtPrice: p.compareAtPrice?.toString() ?? null,
              images: p.images,
              stock: p.stock,
              isActive: p.isActive,
            }}
            currencySymbol={settings.currencySymbol}
          />
        ))}
      </div>
    </section>
  );
}
