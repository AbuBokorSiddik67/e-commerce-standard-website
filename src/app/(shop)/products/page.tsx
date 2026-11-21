import Link from "next/link";
import { SearchX } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { Breadcrumbs, EmptyState, PageHeading } from "@/components/shared/page-heading";
import { catalogDisplay } from "@/server/services/catalog-display";
import { catalogAvailability } from "@/lib/product-availability";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { storefrontListProducts } from "@/server/repositories/product.repo";
import { listPublicCategories } from "@/server/repositories/public-categories";
import { breadcrumbSchema, catalogIndex, categoryPath, excerpt, mediaUrl, noIndex, publicMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { cache } from "react";
import { ProductCard } from "@/components/customer/product-card";
import { ProductFilters, ProductSort } from "@/components/customer/product-filters";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { toFiniteNumber, toPositiveInt } from "@/lib/utils";
import { attempt } from "@/lib/errors";
import { AppError } from "@/components/shared/app-error";

type Params = Record<string, string | string[] | undefined>;
const categoriesForPage = cache(() => attempt('catalog.categories', listPublicCategories));
const simpleParams = (raw: Params) => Object.fromEntries(Object.entries(raw).filter((entry): entry is [string,string] => typeof entry[1] === 'string'));
const loadProducts = cache((search?: string, category?: string, sort?: string, page?: number, minPrice?: string, maxPrice?: string, inStock?: string) =>
  attempt('products.list', () => storefrontListProducts({ search, categorySlug: category, sort, page, perPage: ITEMS_PER_PAGE,
    minPrice: toFiniteNumber(minPrice), maxPrice: toFiniteNumber(maxPrice), inStock: inStock === 'true' })));

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const [categories, settings] = await Promise.all([categoriesForPage(), getStoreSettings()]);
  if (!categories.ok) return {title: 'Shop', robots: noIndex};
  const category = categories.value.find(c => c.slug === raw.category);
  const { index, path, page } = catalogIndex(raw, category?.slug);
  const result = index && page > 1 ? await loadProducts(undefined, category?.slug, undefined, page, undefined, undefined, undefined) : undefined;
  const pageExists = !result || (result.ok && result.value.pages >= page);
  const title = category?.name ?? 'Shop products';
  return publicMetadata({ title: page > 1 && pageExists ? `${title} – Page ${page}` : title,
    path: pageExists ? path : (category ? categoryPath(category.slug) : '/products'),
    description: excerpt(category?.description) ?? `Browse ${category ? category.name : 'products'} from ${settings.storeName}.`,
    store: settings.storeName, image: mediaUrl(settings.socialShareImage), index: index && pageExists });
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const params = simpleParams(raw);
  const page = toPositiveInt(params.page, 1);
  const [productsResult, categoriesResult, settings] = await Promise.all([
    loadProducts(params.search, params.category, params.sort, page, params.minPrice, params.maxPrice, params.inStock),
    categoriesForPage(),
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
  const display = await catalogDisplay(result.items.map(p => p.id));
  const category = categories.find(c => c.slug === params.category);
  const title = category?.name ?? 'All products';
  const crumbs = [{label:'Home',href:'/'}, ...(category ? [{label:'Shop',href:'/products'},{label:title}] : [{label:'Shop'}])];
  const filterCount = [params.category, params.minPrice, params.maxPrice, params.inStock].filter(Boolean).length;
  return <div className="container-page py-6 sm:py-9">
    <JsonLd data={breadcrumbSchema([{name:'Home',path:'/'},{name:'Shop',path:'/products'}, ...(category ? [{name:title,path:categoryPath(category.slug)}] : [])])} />
    <Breadcrumbs items={crumbs} />
    <div className="mb-5 rounded-2xl border border-[#dbe4f7] bg-[#eaf0fd] px-5 pt-5 text-[#14213c] sm:px-7 sm:pt-7"><PageHeading label="The catalog" title={title} description={params.search ? `Results for “${params.search}”` : category?.description || "Browse the collection and find what fits your day."} /></div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
      <ProductFilters key={JSON.stringify(params)} categories={categories} current={params} currency={settings.currencySymbol} count={filterCount} />
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 sm:px-4"><p className="text-sm font-semibold" aria-live="polite">{result.total} {result.total === 1 ? "product" : "products"}</p><ProductSort current={params} /></div>
        {result.items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {result.items.map((p, i) => <ProductCard key={p.id} eager={i < 2} product={{ id: p.id, name:p.name, slug:p.slug,
            ...catalogAvailability(p), compareAtPrice: p.compareAtPrice?.toString() ?? null, images:p.images,
            isActive:p.isActive, rating:display.ratings.get(p.id) }} initialWishlisted={display.wishlist.has(p.id)} currencySymbol={settings.currencySymbol} />)}
        </div> : <EmptyState icon={SearchX} title="No products found" description="Try a different search or clear your filters to browse the full catalog." href="/products" action="Reset catalog" />}
        <Pagination page={page} pages={result.pages} base="/products" query={params} label="Catalog pages" />
        {categories.length > 0 && <nav aria-label="Shop by category" className="surface p-4">
          <h2 className="mb-2 text-sm font-bold">Shop by category</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{categories.map(c => <li key={c.id}><Link prefetch={false} aria-current={c.id === category?.id ? 'page' : undefined} href={categoryPath(c.slug)} className="inline-block py-1 text-primary underline underline-offset-4">{c.name}</Link></li>)}</ul>
        </nav>}

      </div>
    </div>
  </div>;
}
