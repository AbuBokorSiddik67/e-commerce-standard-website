import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // HTML routes may be crawled to discover their noindex; access control is independent.
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }], sitemap: siteUrl('/sitemap.xml') };
}
