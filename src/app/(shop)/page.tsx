import { excerpt, mediaUrl, publicMetadata, siteUrl } from '@/lib/seo';
import { JsonLd } from '@/components/shared/json-ld';
import { catalogDisplay } from '@/server/services/catalog-display';
import { safeLink } from "@/lib/safe-urls";
import { CategoryShowcase } from '@/components/customer/category-showcase';
import { HeroBanner } from '@/components/customer/hero-banner';
import { NewsletterCta } from '@/components/customer/newsletter-cta';
import { ProductGridSection } from '@/components/customer/product-grid-section';
import { ReviewsSection } from '@/components/customer/reviews-section';
import { SocialFeed } from '@/components/customer/social-feed';
import { TrustStrip } from '@/components/customer/trust-strip';
import { WhyShopSection } from '@/components/customer/why-shop-section';
import { Button } from '@/components/ui/button';
import { getStoreSettings } from '@/server/repositories/settings.repo';
import { getHomepageData } from '@/server/services/homepage.service';
import { attempt } from '@/lib/errors';
import { AppError } from '@/components/shared/app-error';
import type { Banner } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';

// Personalized wishlist indicators and stock display are never in a shared page cache.
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const s = await getStoreSettings();
  return publicMetadata({ title: s.storeName, description: excerpt(s.footerText) ?? 'Shop online in Bangladesh.', store: s.storeName,
    path: '/', image: mediaUrl(s.socialShareImage) ?? siteUrl('/brand/editorial-desk.webp') });
}

export default async function HomePage() {
  const [homepage, settings] = await Promise.all([
    attempt('homepage.load', getHomepageData),
    getStoreSettings(),
  ]);

  if (!homepage.ok) {
    return (
      <AppError
        title="We're updating the storefront"
        description="Our store is having a brief technical issue while loading the homepage. Please try again in a moment — your account and cart are safe."
      />
    );
  }

  const { sections, data } = homepage.value;
  const displayPromise = catalogDisplay([...new Set(sections
    .filter(section => ['NEW_ARRIVALS','BEST_SELLERS','FEATURED_COLLECTION'].includes(section.sectionKey))
    .flatMap(section => (data[section.id] as { id: string }[] | undefined)?.map(p => p.id) ?? []))]);
  const url = siteUrl('/');
  const identity = url ? { '@graph': [
    { '@type': 'Organization', '@id': `${url}#organization`, name: settings.storeName, url,
      logo: mediaUrl(settings.logoUrl), sameAs: [settings.facebookUrl, settings.instagramUrl, settings.youtubeUrl].map(link => safeLink(link, false)).filter(Boolean) },
    { '@type': 'WebSite', '@id': `${url}#website`, name: settings.storeName, url, publisher: { '@id': `${url}#organization` } },
  ] } : undefined;

  // A brand-new store (or one whose section list was cleared) should still show
  // a welcoming page instead of a blank screen.
  if (sections.length === 0) {
    return (
      <section className="container-page py-20 text-center">
        <JsonLd data={identity} />
        <h1 className="text-3xl font-bold sm:text-4xl">
          Welcome to {settings.storeName}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Our storefront is getting ready. In the meantime, you can browse all of
          our latest products.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Browse products</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-col">
      <JsonLd data={identity} />
      {sections.map((section) => {
        const sectionData = data[section.id];
        const s = (section.settings ?? {}) as Record<string, unknown>;
        switch (section.sectionKey) {
          case 'HERO': {
            const hero = sectionData as { slides?: Banner[]; side?: Banner[] } | undefined;
            return (
              <div key={section.id}>
                <HeroBanner section={section} banners={hero?.slides} />
                <OfferBanner banners={hero?.side} compact />
              </div>
            );
          }
          case 'TRUST_STRIP':
            return <TrustStrip key={section.id} section={section} />;
          case 'SHOP_BY_CATEGORY':
            return (
              <CategoryShowcase
                key={section.id}
                section={section}
                categories={sectionData as never}
              />
            );
          case 'NEW_ARRIVALS':
            return (
              <ProductGridSection
                key={section.id}
                section={section}
                products={sectionData as never}
                settings={settings}
                displayPromise={displayPromise}
                viewAllHref={safeLink(s.viewAllHref) || "/products?sort=newest"}
                viewAllText={(s.viewAllText as string) || "View All"}
              />
            );
          case 'BEST_SELLERS':
            return (
              <ProductGridSection
                key={section.id}
                section={section}
                products={sectionData as never}
                settings={settings}
                displayPromise={displayPromise}
                viewAllHref={safeLink(s.viewAllHref) || "/products?sort=best_selling"}
                viewAllText={(s.viewAllText as string) || "View All"}
              />
            );
          case 'OFFER_BANNER':
            return (
              <OfferBanner key={section.id} banners={sectionData as never} />
            );
          case 'FEATURED_COLLECTION':
            return (
              <ProductGridSection
                key={section.id}
                section={section}
                products={sectionData as never}
                settings={settings}
                displayPromise={displayPromise}
                viewAllHref={safeLink(s.viewAllHref) ?? undefined}
                viewAllText={s.viewAllText as string}
              />
            );
          case 'WHY_SHOP':
            return <WhyShopSection key={section.id} section={section} />;
          case 'REVIEWS':
            return (
              <ReviewsSection
                key={section.id}
                section={section}
                reviews={sectionData as never}
              />
            );
          case 'SOCIAL_FEED':
            return (
              <SocialFeed
                key={section.id}
                section={section}
                settings={settings}
              />
            );
          case 'NEWSLETTER_CTA':
            return (
              <NewsletterCta
                key={section.id}
                section={section}
                settings={settings}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function OfferBanner({ banners, compact = false }: { banners: Banner[] | undefined; compact?: boolean }) {
  if (!banners || banners.length === 0) return null;
  return <section aria-label="Store offers" className={`container-page grid gap-3 ${compact ? "pt-4 sm:grid-cols-2" : "py-5"}`}>
    {(compact ? banners : banners.slice(0, 1)).map(banner => <div key={banner.id} className="relative isolate flex min-h-32 flex-col justify-center overflow-hidden rounded-2xl bg-[#16243d] p-4 text-white sm:p-6">
      <Image src={banner.image} alt={banner.title ?? "Store offer"} fill className="-z-10 object-cover" sizes={compact ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1279px) 47vw, 600px" : "(max-width: 1279px) 95vw, 1216px"} />
      <div className="absolute inset-0 -z-10 bg-black/65" />
      {banner.title && <h2 className="text-lg font-bold sm:text-xl">{banner.title}</h2>}
      {banner.subtitle && <p className="mt-1 text-sm">{banner.subtitle}</p>}
      {banner.ctaText && safeLink(banner.ctaLink) && <Button asChild size="sm" className="mt-3 self-start"><Link href={safeLink(banner.ctaLink) ?? "/products"}>{banner.ctaText}</Link></Button>}
    </div>)}
  </section>;
}
