import type { Metadata } from "next";
import { safeImageUrl } from "@/lib/safe-urls";

export const noIndex: Metadata["robots"] = { index: false, follow: true };

export function siteOrigin(env: Record<string, string | undefined> = process.env): URL | undefined {
  const configured = env.NEXT_PUBLIC_APP_URL || env.AUTH_URL || env.NEXTAUTH_URL;
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return undefined;
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:') return undefined;
    return url;
  } catch { return undefined; }
}

export function siteUrl(path: string) {
  const origin = siteOrigin();
  if (!origin || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return undefined;
  const url = new URL(path, origin);
  return url.origin === origin.origin ? url.href : undefined;
}

export const productPath = (slug: string) => `/product/${encodeURIComponent(slug)}`;
export const categoryPath = (slug: string) => `/products?category=${encodeURIComponent(slug)}`;

export function mediaUrl(src: unknown) {
  const safe = safeImageUrl(src);
  if (!safe) return undefined;
  return safe.startsWith('/') ? siteUrl(safe) : safe;
}

export function excerpt(input: string | null | undefined, max = 160) {
  const text = input?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

export function publicMetadata({ title, description, path, store, image, imageAlt, index = true }: {
  title: string; description?: string; path: string; store: string; image?: string; imageAlt?: string; index?: boolean;
}): Metadata {
  const url = siteUrl(path);
  const shareTitle = title === store ? store : `${title} | ${store}`;
  return {
    title, description,
    ...(url && { alternates: { canonical: url } }),
    ...(!index && { robots: noIndex }),
    openGraph: { type: 'website', siteName: store, title: shareTitle, description, url, images: image ? [{ url: image, alt: imageAlt }] : [] },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: shareTitle, description, images: image ? [image] : [] },
  };
}

export function catalogIndex(params: Record<string, string | string[] | undefined>, category?: string) {
  const cleanPath = category ? categoryPath(category) : '/products';
  const n = typeof params.page === 'string' && /^[1-9]\d{0,3}$/.test(params.page) ? Number(params.page) : 1;
  const hasFacet = Object.keys(params).some(key => !['category', 'page'].includes(key) && !/^utm_[a-z_]+$/i.test(key) && !['gclid', 'fbclid'].includes(key));
  const validCategory = params.category === undefined || (typeof params.category === 'string' && params.category === category);
  const validPage = params.page === undefined || (typeof params.page === 'string' && String(n) === params.page);
  const index = !hasFacet && validCategory && validPage;
  const path = index && n > 1 ? `${cleanPath}${category ? '&' : '?'}page=${n}` : cleanPath;
  return { index, path, page: n };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  if (!siteOrigin()) return undefined;
  return { '@type': 'BreadcrumbList', itemListElement: items.map(({ name, path }, i) => ({ '@type': 'ListItem', position: i + 1, name, item: siteUrl(path) })) };
}

export function serializeJsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
