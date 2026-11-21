'use client';

import { useEffect, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import { Pause, Play } from 'lucide-react';
import Link from 'next/link';

type Slide = {
  id: string;
  image: string;
  mobileImage: string | null;
  href: string;
  alt: string;
};

const HERO_SIZES = '(min-width: 1280px) 1216px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)';
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

      {/* Use the same selected art-direction source for the background, never
          download the desktop file just to paint a mobile backdrop. */}
      <picture>
        {mobile && <source media="(max-width: 767px)" srcSet={mobile.srcSet} sizes={mobile.sizes} />}
        <img src={desktop.src} srcSet={desktop.srcSet} sizes={desktop.sizes} alt="" loading="lazy" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" />
      </picture>
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

export function HeroCarousel({ slides, title }: { slides: Slide[]; title: string }) {
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
        <h1 className="sr-only">{title}</h1>
        <div
          className={`relative w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-black/5 ${boxShape}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((item, index) => {
            const isActive = index === active;

            return (
              <Link
                key={item.id ?? index}
                prefetch={false}
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
                {(isActive || index === 0) && <HeroImage image={item.image} mobileImage={item.mobileImage} alt={item.alt} priority={index === 0} />}
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
