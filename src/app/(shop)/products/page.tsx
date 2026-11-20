import { SearchX } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { Breadcrumbs, EmptyState, PageHeading } from "@/components/shared/page-heading";
import { catalogDisplay } from "@/server/services/catalog-display";
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
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string")) as Awaited<typeof searchParams>;
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
  const categories = categoriesResult.ok ? categoriesResult.value.filter(c => c.isActive) : [];
  const display = await catalogDisplay(result.items.map(p => p.id));
  const title = categories.find(c => c.slug === params.category)?.name ?? "All products";
  const filterCount = [params.category, params.minPrice, params.maxPrice, params.inStock].filter(Boolean).length;
  return <div className="container-page py-6 sm:py-9">
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Shop"}]} />
    <div className="mb-5 rounded-2xl border border-[#dbe4f7] bg-[#eaf0fd] px-5 pt-5 text-[#14213c] sm:px-7 sm:pt-7"><PageHeading label="The catalog" title={title} description={params.search ? `Results for “${params.search}”` : "Browse the collection and find what fits your day."} /></div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
      <ProductFilters key={JSON.stringify(params)} categories={categories} current={params} currency={settings.currencySymbol} count={filterCount} />
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 sm:px-4"><p className="text-sm font-semibold" aria-live="polite">{result.total} {result.total === 1 ? "product" : "products"}</p><ProductSort current={params} /></div>
        {result.items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {result.items.map(p => <ProductCard key={p.id} product={{ id: p.id, name:p.name, slug:p.slug,
            ...catalogAvailability(p), compareAtPrice: p.compareAtPrice?.toString() ?? null, images:p.images,
            isActive:p.isActive, rating:display.ratings.get(p.id) }} initialWishlisted={display.wishlist.has(p.id)} currencySymbol={settings.currencySymbol} />)}
        </div> : <EmptyState icon={SearchX} title="No products found" description="Try a different search or clear your filters to browse the full catalog." href="/products" action="Reset catalog" />}
        <Pagination page={page} pages={result.pages} base="/products" query={params} label="Catalog pages" />
      </div>
    </div>
  </div>;
}
