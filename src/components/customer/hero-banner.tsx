import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeLink, safeImageUrl } from '@/lib/safe-urls';
import type { SafeHomepageSection } from '@/types/domain';
import type { Banner } from '@prisma/client';
import { HeroCarousel } from './hero-carousel';

export function HeroBanner({ section, banners }: { section: SafeHomepageSection; banners?: Banner[] }) {
  const settings = section.settings ?? {};
  const fallbackHref = safeLink(settings.primaryCtaLink) ?? '/products';
  const ctaLabel = typeof settings.primaryCtaText === 'string' && settings.primaryCtaText.trim() ? settings.primaryCtaText : 'Shop now';
  if (banners?.length) {
    const images = settings.mobileImages && typeof settings.mobileImages === 'object' && !Array.isArray(settings.mobileImages)
      ? settings.mobileImages as Record<string, unknown> : {};
    return <HeroCarousel title={section.title || 'Featured promotions'} slides={banners.map(banner => ({
      id: banner.id, image: banner.image, mobileImage: safeImageUrl(images[banner.id]),
      href: safeLink(banner.ctaLink) ?? fallbackHref, alt: banner.title?.trim() || section.title?.trim() || 'Store promotion',
    }))} />;
  }

    const secondaryHref = safeLink(settings.secondaryCtaLink);
    const secondaryText = typeof settings.secondaryCtaText === 'string' && settings.secondaryCtaText.trim() ? settings.secondaryCtaText : null;
    return <section className="container-page pt-4 sm:pt-6">
      <div className="grid overflow-hidden rounded-[1.55rem] border border-[#d7e0f3] bg-[#eaf0fd] text-[#14213c] md:min-h-[26.25rem] md:grid-cols-[1fr_1.07fr]">
        <div className="relative z-10 flex flex-col items-start justify-center px-6 py-9 sm:px-10 md:px-10 lg:px-14">
          <p className="eyebrow mb-4 flex items-center gap-2.5 text-[#234aa1]"><span className="h-px w-6 bg-current" /> The everyday edit</p>
          <h1 className="display-title">{section.title || 'Explore the store'}</h1>
          {section.subtitle && <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#425370] sm:text-base">{section.subtitle}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button asChild size="lg"><Link href={fallbackHref}>{ctaLabel}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
            {secondaryHref && secondaryText ? <Button asChild variant="outline"><Link href={secondaryHref}>{secondaryText}</Link></Button> : <Link href="/products" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#203d7b] hover:underline">Explore catalog <ArrowDown className="size-4" aria-hidden="true" /></Link>}
          </div>
        </div>
        <div className="relative min-h-[13rem] md:min-h-full"><Image src="/brand/editorial-desk.webp" alt="" fill loading="eager" fetchPriority="high" sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc(100vw - 48px), (max-width: 1279px) 51vw, 629px" className="object-cover" /></div>
      </div>
    </section>;

}
