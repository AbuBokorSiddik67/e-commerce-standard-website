import { sitemapResponse } from '@/server/repositories/sitemap';
import { logError } from '@/lib/errors';

// Cache tagged public data, not deployment-specific XML from build time.
export const revalidate = 0;

export async function GET() {
  try { return await sitemapResponse(); }
  catch (error) { logError('sitemap.load', error); return new Response(null, { status: 503, headers: {'Cache-Control':'no-store'} }); }
}
