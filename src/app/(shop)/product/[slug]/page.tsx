import { catalogAvailability } from "@/lib/product-availability";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { getRelatedProducts } from "@/server/repositories/product.repo";
import { ProductDetail } from "@/components/customer/product-detail";
import { ProductCard } from "@/components/customer/product-card";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) return { title: "Product not found" };
    const images = await prisma.productImage
      .findMany({
        where: { productId: product.id },
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      })
      .catch(() => []);
    const imageUrls = images.map((i) => i.url).filter((u) => /^https?:\/\//.test(u));
    return {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.shortDesc ?? undefined,
      alternates: { canonical: `/product/${product.slug}` },
      openGraph: {
        title: product.seoTitle ?? product.name,
        description: product.seoDescription ?? product.shortDesc ?? undefined,
        images: imageUrls.length ? imageUrls : undefined,
        type: "website",
      },
    };
  } catch {
    // Never let metadata generation turn a temporary database hiccup into a 500.
    return { title: "Product" };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const productResult = await attempt("product.load", () =>
    prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true } },
        categories: true,
        reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { reviews: true, variants: true } },
      },
    }),
  );

  if (!productResult.ok) {
    return (
      <AppError
        title="This product couldn't be loaded"
        description="We're having a brief issue loading product details. Please try again in a moment."
      />
    );
  }

  const product = productResult.value;
  if (!product || !product.isActive) notFound();

  const [settings, relatedResult] = await Promise.all([
    getStoreSettings(),
    attempt("product.related", () =>
      getRelatedProducts(product.id, product.categories.map((c) => c.id), 4),
    ),
  ]);
  const related = relatedResult.ok ? relatedResult.value : [];

  const base = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const structuredImages = product.images
    .map((i) => i.url)
    .filter((u) => /^https?:\/\//.test(u));
  const averageRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription ?? product.shortDesc ?? product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: structuredImages.length ? structuredImages : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: catalogAvailability(product).price,
      availability:
        catalogAvailability(product).stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${base}/product/${product.slug}`,
    },
    ...(averageRating && product._count.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating.toFixed(1),
            reviewCount: product._count.reviews,
          },
        }
      : {}),
  };

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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
          reviews: product.reviews.map((r) => ({
            id: r.id,
            customerName: r.customerName,
            city: r.city,
            rating: r.rating,
            title: r.title,
            body: r.body,
            createdAt: r.createdAt.toISOString(),
          })),
          reviewCount: product._count.reviews,
        }}
        settings={settings}
      />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-xl font-bold">Related Products</h2>
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
                }}
                currencySymbol={settings.currencySymbol}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
