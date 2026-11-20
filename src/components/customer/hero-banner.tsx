'use client';

import { safeLink } from "@/lib/safe-urls";
import { useEffect, useRef, useState } from 'react';
import Image, { getImageProps } from 'next/image';
import { ArrowDown, ArrowRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { SafeHomepageSection } from '@/types/domain';
import type { Banner } from '@prisma/client';

type Slide = {
  id: string | null;
  image: string | null;
  mobileImage: string | null;
  href: string;
  alt: string;
};

const HERO_SIZES = '(min-width: 1280px) 1280px, 100vw';
const SLIDE_MS = 5000;
const SWIPE_THRESHOLD = 50;

// The standard way banners are done: two banner sizes, one per device type.
// The box always takes the exact shape of the banner you upload, so the whole
// image is shown (never cropped, no blurred bars).
//
//   Desktop / tablet (768px and up): 2293 x 590 px
//   Phone (below 768px):             1200 x 900 px (4:3)
//
// No phone banner uploaded? The desktop banner is used on phones too, in its
// own shape (shorter, but complete and sharp).
//
// To change a size, edit the numbers below. If you change the desktop numbers,
// change them in BOTH lines.
const DESKTOP_SHAPE = 'aspect-[2293/590]';
const PHONE_SHAPE = 'aspect-[4/3] md:aspect-[2293/590]';

/**
 * Shows the image with object-contain, so nothing is ever cropped. If the
 * image ratio differs from the banner box, the leftover space is filled with a
 * blurred copy of the same image instead of empty bars.
 */
function HeroImage({
  image,
  mobileImage,
  alt,
  priority,
}: {
  image: string;
  mobileImage: string | null;
  alt: string;
  priority: boolean;
}) {
  const { props: desktop } = getImageProps({
    src: image,
    alt,
    fill: true,
    sizes: HERO_SIZES,
    loading: priority ? 'eager' : 'lazy',
    fetchPriority: priority ? 'high' : 'auto',
  });

  const mobile = mobileImage
    ? getImageProps({
        src: mobileImage,
        alt,
        fill: true,
        sizes: HERO_SIZES,
        loading: priority ? 'eager' : 'lazy',
        fetchPriority: priority ? 'high' : 'auto',
      }).props
    : null;

  return (
    <>
      {priority && (
        <>
          {mobile && (
            <link
              rel="preload"
              as="image"
              media="(max-width: 767px)"
              imageSrcSet={mobile.srcSet}
              imageSizes={mobile.sizes}
              fetchPriority="high"
            />
          )}
          <link
            rel="preload"
            as="image"
            media={mobile ? '(min-width: 768px)' : undefined}
            imageSrcSet={desktop.srcSet}
            imageSizes={desktop.sizes}
            fetchPriority="high"
            data-hero-preload="desktop"
          />
        </>
      )}

      {/* Blurred backdrop: same srcSet as the foreground, so it comes from cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={desktop.src}
        srcSet={desktop.srcSet}
        sizes={desktop.sizes}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl"
      />

      <picture>
        {mobile && (
          <>
            <source
              media="(min-width: 768px)"
              srcSet={desktop.srcSet}
              sizes={desktop.sizes}
            />
            <source
              media="(max-width: 767px)"
              srcSet={mobile.srcSet}
              sizes={mobile.sizes}
            />
          </>
        )}
        <img
          {...desktop}
          alt={alt}
          className="relative h-full w-full object-contain object-center"
        />
      </picture>
    </>
  );
}

export function HeroBanner({
  section,
  banners,
}: {
  section: SafeHomepageSection;
  banners: Banner[] | undefined;
}) {
  const settings = section.settings ?? {};
  const fallbackHref =
    safeLink(settings.primaryCtaLink) ?? "/products";
  // Only used on the placeholder slide (when no banner image exists).
  const ctaLabel =
    typeof settings.primaryCtaText === 'string' &&
    settings.primaryCtaText.trim()
      ? settings.primaryCtaText
      : 'Shop now';

  // Per-slide mobile images are stored on the HERO section settings, keyed by
  // banner id, so the existing Banner schema does not need a migration.
  const mobileImages =
    settings.mobileImages &&
    typeof settings.mobileImages === 'object' &&
    !Array.isArray(settings.mobileImages)
      ? (settings.mobileImages as Record<string, unknown>)
      : {};

  const slides: Slide[] = banners?.length
    ? banners.map((banner) => ({
        id: banner.id,
        image: banner.image,
        mobileImage:
          typeof mobileImages[banner.id] === 'string'
            ? (mobileImages[banner.id] as string)
            : null,
        href: safeLink(banner.ctaLink) ?? fallbackHref,
        alt: banner.title?.trim() || section.title?.trim() || 'Store promotion',
      }))
    : [
        {
          id: null,
          image: null,
          mobileImage: null,
          href: fallbackHref,
          alt: section.title ?? 'Store promotion',
        },
      ];

  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionOk, setMotionOk] = useState(false);
  const [stopped, setStopped] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Autoplay is driven by the progress bar's CSS animation (see onAnimationEnd
  // below), so the bar and the slide change always stay in sync.
  const autoplay = count > 1 && motionOk && !stopped;

  // Use the taller phone shape only if EVERY slide has a phone banner, so the
  // box height never jumps between slides. Otherwise phones use the desktop shape.
  const usePhoneShape = slides.every(
    (slide) => slide.image && slide.mobileImage,
  );
  const boxShape = usePhoneShape ? PHONE_SHAPE : DESKTOP_SHAPE;
  // The text-only placeholder (no banner uploaded yet) needs some height on phones.
  const isPlaceholder = !slides.some((slide) => slide.image);

  const next = () => setActive((prev) => (prev + 1) % count);
  const prev = () => setActive((prev) => (prev - 1 + count) % count);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotionOk(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false);
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) next();
    else prev();
  };

  if (isPlaceholder) {
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
        <div className="relative min-h-[13rem] md:min-h-full"><Image src="/brand/editorial-desk.webp" alt="" fill priority sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" /></div>
      </div>
    </section>;
  }

  return (
    <section
      className="w-full pt-4"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <style>
        {
          '@keyframes hero-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}'
        }
      </style>

      {/* Same side gaps as the other homepage sections (max-w-7xl + px-8 = 1216px) */}
      <div className="container-page">
        <h1 className="sr-only">{section.title || "Featured promotions"}</h1>
        <div
          className={`relative w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-black/5 ${boxShape} ${
            isPlaceholder ? 'min-h-[200px] md:min-h-0' : ''
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((item, index) => {
            const isActive = index === active;

            return (
              <Link
                key={item.id ?? index}
                href={item.href}
                aria-label={item.alt}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className={`group absolute inset-0 block cursor-pointer overflow-hidden transition-opacity duration-700 ease-out ${
                  isActive
                    ? 'z-10 opacity-100'
                    : 'pointer-events-none z-0 opacity-0'
                }`}
              >
                {item.image ? (
                  <HeroImage
                    image={item.image}
                    mobileImage={item.mobileImage}
                    alt={item.alt}
                    priority={index === 0}
                  />
                ) : (
                  <div className="flex h-full w-full items-center bg-primary px-6 sm:px-12 lg:px-20">
                    <div className="max-w-xl text-primary-foreground">
                      <p className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                        {item.alt}
                      </p>
                      <span className="mt-5 inline-flex h-10 items-center rounded-full bg-primary-foreground px-5 text-sm font-medium text-primary transition-transform group-hover:scale-[1.03]">
                        {ctaLabel}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}

          {count > 1 && (
            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-white">
              {slides.map((item, index) => {
                const isActive = index === active;

                return (
                  <button
                    key={item.id ?? index}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                    className={`relative h-6 min-w-6 overflow-hidden rounded-full border-4 border-black transition-colors ${
                      isActive
                        ? autoplay
                          ? 'w-9 bg-white/35'
                          : 'w-9 bg-white'
                        : 'w-2 bg-white/60 hover:bg-white'
                    }`}
                  >
                    {isActive && autoplay && (
                      <span
                        className="absolute inset-0 origin-left rounded-full bg-white"
                        style={{
                          animation: `hero-progress ${SLIDE_MS}ms linear forwards`,
                          animationPlayState: paused ? 'paused' : 'running',
                        }}
                        onAnimationEnd={next}
                      />
                    )}
                  </button>
                );
              })}
              {motionOk && <button type="button" className="grid size-7 place-items-center rounded-full hover:bg-white/20" aria-label={stopped ? 'Play slides' : 'Pause slides'} onClick={() => setStopped(!stopped)}>{stopped ? <Play className="size-3" /> : <Pause className="size-3" />}</button>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
