import type { NextConfig } from "next";
import { mediaHosts } from "./src/lib/safe-urls";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  images: {
    // Never let the shared image cache fetch private application routes.
    localPatterns: [{ pathname: '/uploads/**', search: '' }, { pathname: '/brand/**', search: '' }],
    remotePatterns: mediaHosts.map((hostname) => ({ protocol: "https", hostname, port: "" })),
    // Filenames assigned by the uploader are versioned; respect higher upstream TTL.
    minimumCacheTTL: 14_400,
    maximumRedirects: 0,
    dangerouslyAllowLocalIP: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/:privatePath(login|register|forgot-password|cart|checkout|track-order)",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, follow" },
        ],
      },
      ...["/account/:path*", "/admin/:path*"].map(source => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      })),
      {
        source: "/reset-password",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/order-success/:orderNumber",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
