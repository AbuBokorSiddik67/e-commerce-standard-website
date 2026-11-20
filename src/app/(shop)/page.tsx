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

export const revalidate = 300;

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

  // A brand-new store (or one whose section list was cleared) should still show
  // a welcoming page instead of a blank screen.
  if (sections.length === 0) {
    return (
      <section className="container-page py-20 text-center">
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
      {sections.map((section) => {
        const sectionData = data[section.sectionKey];
        const s = (section.settings ?? {}) as Record<string, unknown>;
        switch (section.sectionKey) {
          case 'HERO': {
            const hero = sectionData as { slides?: Banner[] } | undefined;
            return (
              <HeroBanner
                key={section.id}
                section={section}
                banners={hero?.slides}
              />
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
                viewAllHref={(s.viewAllHref as string) || "/products?sort=newest"}
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
                viewAllHref={(s.viewAllHref as string) || "/products?sort=best_selling"}
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
                viewAllHref={s.viewAllHref as string}
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

function OfferBanner({ banners }: { banners: Banner[] | undefined }) {
  if (!banners || banners.length === 0) return null;
  const banner = banners[0];
  return (
    <section className="container-page py-5">
      <div className="relative w-full overflow-hidden rounded-lg">
        <div className="relative h-24 w-full sm:h-32 lg:h-36">
          <Image
            src={banner.image}
            alt={banner.title ?? 'Offer'}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-4 text-center text-white">
            {banner.title && (
              <h2 className="text-lg font-bold sm:text-2xl">{banner.title}</h2>
            )}
            {banner.subtitle && (
              <p className="mt-1 text-xs sm:text-sm">{banner.subtitle}</p>
            )}
            {banner.ctaText && banner.ctaLink && (
              <Button asChild className="mt-2 h-8 px-3 text-xs" size="sm">
                <Link href={banner.ctaLink}>{banner.ctaText}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
