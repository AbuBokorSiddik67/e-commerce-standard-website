import { catalogDisplay } from "@/server/services/catalog-display";
import { catalogAvailability } from "@/lib/product-availability";
import { notFound } from "next/navigation";
import { findPublicProduct, listProductReviews, REVIEWS_PER_PAGE } from "@/server/repositories/product-detail";
import { Breadcrumbs } from "@/components/shared/page-heading";
import { Pagination } from "@/components/shared/pagination";
import { JsonLd } from "@/components/shared/json-ld";
import { ReviewComposer } from "@/components/customer/review-composer";
import { Star } from "lucide-react";
import { breadcrumbSchema, categoryPath, excerpt, mediaUrl, noIndex, productPath, publicMetadata, siteUrl } from "@/lib/seo";
import { toPositiveInt } from "@/lib/utils";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { getRelatedProducts } from "@/server/repositories/product.repo";
import { ProductDetail } from "@/components/customer/product-detail";
import { ProductCard } from "@/components/customer/product-card";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import type { Metadata } from "next";

type RouteProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const [result, settings] = await Promise.all([attempt('product.metadata', () => findPublicProduct(slug)), getStoreSettings()]);
  if (!result.ok || !result.value) return { title: 'Product unavailable', robots: noIndex };
  const product = result.value;
  return publicMetadata({ title: product.seoTitle?.trim() || product.name,
    description: excerpt(product.seoDescription) ?? excerpt(product.shortDesc) ?? excerpt(product.description),
    path: productPath(product.slug), store: settings.storeName,
    image: product.images.map(i => mediaUrl(i.url)).find(Boolean) ?? mediaUrl(settings.socialShareImage), imageAlt: product.images[0]?.altText || product.name });
}

export default async function ProductDetailPage({ params, searchParams }: RouteProps) {
  const [{slug}, {page}] = await Promise.all([params, searchParams]);
  const reviewPage = toPositiveInt(typeof page === 'string' ? page : undefined, 1, 1000);
  const productResult = await attempt('product.load', () => findPublicProduct(slug));

  if (!productResult.ok) {
    return (
      <AppError
        title="This product couldn't be loaded"
        description="We're having a brief issue loading product details. Please try again in a moment."
      />
    );
  }

  const product = productResult.value;
  if (!product) notFound();
  const path = productPath(product.slug);
  const [settings, relatedResult, reviewsResult] = await Promise.all([
    getStoreSettings(),
    attempt('product.related', () => getRelatedProducts(product.id, product.categories.map(c => c.id), 4)),
    attempt('product.reviews', () => listProductReviews(product.id, reviewPage)),
  ]);
  const related = relatedResult.ok ? relatedResult.value : [];
  const reviews = reviewsResult.ok ? reviewsResult.value : [];
  const display = await catalogDisplay([product.id, ...related.map(p => p.id)]);
  const rating = display.ratings.get(product.id);
  const url = siteUrl(path);
  const category = product.categories[0];
  const crumbs = [{ name: 'Home', path:'/' }, {name:'Shop',path:'/products'},
    ...(category ? [{name:category.name,path:categoryPath(category.slug)}] : []), {name:product.name,path}];
  // If variants exist, use their actual prices rather than a potentially unrelated
  // base display price. Never offer a SKU for which all variants were archived.
  const available = product.variants.filter(v => v.stock > 0);
  const shownVariants = available.length ? available : product.variants;
  const productOffer = product._count.variants > 0
    ? shownVariants.length ? shownVariants.map(v => ({ price: (v.price ?? product.price).toString(), stock: v.stock, sku: v.sku })) : []
    : [{ price: product.price.toString(), stock: product.stock, sku: product.sku }];
  // The schema has a display symbol, not a currency code. Only declare a
  // denomination supported by this store instead of guessing from a symbol.
  const usesBdt = ['৳', 'BDT'].includes(settings.currencySymbol.trim().toUpperCase());
  const jsonLd = url ? {
    '@type': 'Product', name: product.name, url, description: excerpt(product.shortDesc) ?? excerpt(product.description, 500),
    sku: product.sku || undefined, image: product.images.map(i => mediaUrl(i.url)).filter(Boolean),
    offers: usesBdt && productOffer.length ? productOffer.map(v => ({ '@type': 'Offer', url, priceCurrency: 'BDT', price: v.price,
      sku: v.sku || undefined, availability: `https://schema.org/${v.stock > 0 ? 'InStock' : 'OutOfStock'}` })) : undefined,
    aggregateRating: rating?.count ? { '@type': 'AggregateRating', ratingValue: Number(rating.average.toFixed(2)), reviewCount: rating.count } : undefined,
    review: reviews.length ? reviews.filter(r => r.customerName.trim() && r.body?.trim()).map(r => ({ '@type': 'Review', name: r.title || undefined,
      reviewBody: r.body, datePublished: r.createdAt.toISOString(), author: { '@type': 'Person', name: r.customerName },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 } })) : undefined,
  } : undefined;

  return (
    <div className="container-page py-8">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <Breadcrumbs items={crumbs.map((c,i) => ({label: c.name, href: i < crumbs.length - 1 ? c.path : undefined}))} />
      <ProductDetail
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDesc: product.shortDesc,
          description: product.description,
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? null,
          sku: product.sku,
          stock: product.stock,
          requiresVariant: product._count.variants > 0,
          weightGrams: product.weightGrams,
          images: product.images.map((i) => ({ id: i.id, url: i.url, altText: i.altText })),
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            value: v.value,
            sku: v.sku,
            price: v.price?.toString() ?? null,
            stock: v.stock,
          })),
          reviewCount: rating?.count ?? 0,
          averageRating: rating?.average ?? 0,
        }}
        settings={{ currencySymbol: settings.currencySymbol }}
        initialWishlisted={display.wishlist.has(product.id)}
      />

      <section id="reviews" aria-labelledby="reviews-title" className="surface mt-8 p-4 sm:p-7">
        <h2 id="reviews-title" className="section-title mb-4">Customer reviews ({rating?.count ?? 0})</h2>
        <ReviewComposer productId={product.id} />
        {!reviewsResult.ok ? <p className="text-muted-foreground">Reviews are temporarily unavailable.</p> : !reviews.length ?
          <p className="text-muted-foreground">{rating?.count ? 'No reviews on this page.' : 'No reviews yet. Be the first to review!'}</p> :
          <ul className="space-y-4">{reviews.map(r => <li key={r.id} className="break-words border-b pb-4">
            <div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1 text-sm font-semibold"><Star className="size-4 fill-amber-400 text-amber-700" aria-hidden="true" />{r.rating} out of 5</span><span>{r.customerName}</span>{r.city && <span className="text-sm text-muted-foreground">· {r.city}</span>}</div>
            {r.title && <p className="mt-1 font-medium">{r.title}</p>}<p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
          </li>)}</ul>}
        <Pagination base={path} page={reviewPage} pages={Math.ceil((rating?.count ?? 0) / REVIEWS_PER_PAGE)} label="Review pages" />
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 section-title">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
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
                currencySymbol={settings.currencySymbol}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
