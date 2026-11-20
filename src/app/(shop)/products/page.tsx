import { catalogAvailability } from "@/lib/product-availability";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { storefrontListProducts } from "@/server/repositories/product.repo";
import { listCategories } from "@/server/services/category.service";
import { ProductCard } from "@/components/customer/product-card";
import { ProductFilters, ProductSort } from "@/components/customer/product-filters";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { toFiniteNumber, toPositiveInt } from "@/lib/utils";
import { attempt } from "@/lib/errors";
import { AppError } from "@/components/shared/app-error";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  }>;
}) {
  const params = await searchParams;
  const page = toPositiveInt(params.page, 1);
  const [productsResult, categoriesResult, settings] = await Promise.all([
    attempt("products.list", () =>
      storefrontListProducts({
        search: params.search,
        categorySlug: params.category,
        sort: params.sort,
        page,
        perPage: ITEMS_PER_PAGE,
        minPrice: toFiniteNumber(params.minPrice),
        maxPrice: toFiniteNumber(params.maxPrice),
        inStock: params.inStock === "true",
      }),
    ),
    attempt("products.categories", listCategories),
    getStoreSettings(),
  ]);

  if (!productsResult.ok) {
    return (
      <AppError
        title="Products are temporarily unavailable"
        description="We couldn't load the product catalog right now. This is usually brief — please try again, or contact us if it continues."
      />
    );
  }

  const result = productsResult.value;
  const categories = categoriesResult.ok ? categoriesResult.value : [];

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {categories.find((c) => c.slug === params.category)?.name ?? "All Products"}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <ProductFilters categories={categories} current={params} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{result.total} products</p>
            <ProductSort current={params} />
          </div>

          {result.items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-lg">No products found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {result.items.map((p) => (
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
                  }}
                  currencySymbol={settings.currencySymbol}
                />
              ))}
            </div>
          )}

          {result.pages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: Math.min(result.pages, 10) }, (_, i) => i + 1).map((n) => {
                const p = new URLSearchParams(params as Record<string, string>);
                p.set("page", n.toString());
                return (
                  <a key={n} href={`/products?${p.toString()}`}>
                    <button className={`rounded-md px-3 py-1.5 text-sm ${n === page ? "bg-primary text-primary-foreground" : "border"}`}>
                      {n}
                    </button>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
