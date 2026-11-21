import { sitemapResponse } from '@/server/repositories/sitemap';
import { logError } from '@/lib/errors';

export async function GET(_request: Request, {params}: {params: Promise<{ batch: string }>}) {
  try { return await sitemapResponse((await params).batch); }
  catch (error) { logError('sitemap.batch', error); return new Response(null, { status: 503, headers: {'Cache-Control':'no-store'} }); }
}
