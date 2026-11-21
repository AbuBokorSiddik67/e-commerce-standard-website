import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { POLICY_PAGES } from '@/config/site';
import { categoryPath, productPath, siteUrl } from '@/lib/seo';
import { getStoreSettings } from './settings.repo';
import { SITEMAP_TAG } from '@/lib/public-cache-tags';

const BATCH_SIZE = 10_000;
const opts = { tags: [SITEMAP_TAG], revalidate: 120 };
const counts = unstable_cache(async () => Promise.all([
  prisma.product.count({where: {isActive: true}}), prisma.category.count({where: {isActive: true}}),
]), ['sitemap-counts-v1'], opts);
const rows = unstable_cache(async (kind: 'products' | 'categories', page: number) => {
  const query = { where: { isActive: true }, orderBy: { id: 'asc' as const }, select: { slug: true, updatedAt: true }, skip: page * BATCH_SIZE, take: BATCH_SIZE };
  const result = await (kind === 'products' ? prisma.product.findMany(query) : prisma.category.findMany(query));
  return result.map(({slug,updatedAt}) => ({ path: kind === 'products' ? productPath(slug) : categoryPath(slug), lastModified: updatedAt.toISOString() }));
}, ['sitemap-rows-v1'], opts);

type Entry = { path: string; lastModified?: string };
async function staticEntries(): Promise<Entry[]> {
  const settings = await getStoreSettings();
  return ['/', '/products', '/about', '/contact', ...POLICY_PAGES.filter(p => settings[p.field]?.trim()).map(p => `/policies/${p.slug}`)].map(path => ({path}));
}

const escapeXml = (s: string) => s.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {headers: {'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});
const ns = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
function urlset(entries: Entry[]) {
  return xml(`<urlset ${ns}>${entries.map(({path,lastModified}) => `<url><loc>${escapeXml(siteUrl(path)!)}</loc>${lastModified ? `<lastmod>${lastModified}</lastmod>` : ''}</url>`).join('')}</urlset>`);
}

export async function sitemapResponse(batch?: string) {
  if (!siteUrl('/')) return new Response('Canonical site origin is not configured', {status: 503, headers: {'Cache-Control':'no-store'}});
  if (batch === 'pages.xml') return urlset(await staticEntries());
  const shard = batch && /^(products|categories)-(0|[1-9]\d{0,5})\.xml$/.exec(batch);
  if (batch && !shard) return new Response(null,{status:404});
  const [products, categories] = await counts();
  if (shard) {
    const kind = shard[1] === 'products' ? 'products' : 'categories';
    const page = Number(shard[2]);
    if (page * BATCH_SIZE >= (kind === 'products' ? products : categories)) return new Response(null,{status:404});
    return urlset(await rows(kind,page));
  }
  if (products + categories <= BATCH_SIZE) return urlset((await Promise.all([staticEntries(), rows('products',0), rows('categories',0)])).flat());
  const paths = ['/sitemaps/pages.xml', ...(['products','categories'] as const).flatMap((kind,i) =>
    Array.from({length: Math.ceil([products,categories][i]/BATCH_SIZE)}, (_, page) => `/sitemaps/${kind}-${page}.xml`))];
  return xml(`<sitemapindex ${ns}>${paths.map(path => `<sitemap><loc>${escapeXml(siteUrl(path)!)}</loc></sitemap>`).join('')}</sitemapindex>`);
}
