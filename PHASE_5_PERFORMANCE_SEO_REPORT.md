# ShopBD — Phase 5: Performance and technical SEO

- **Branch:** `arena/7be460fa-e-commerce-standard-website`
- **Baseline:** `a33599213750b09751d2afdbdfb6cce8c41230c5` (`AI-Agent`, merge of Phase 4 PR #9)
- **Date:** 2026-11-20 UTC
- **Scope:** Phase 5 only. No production records, deployments, providers or credentials were used.

## 1. Baseline gate and measurement method

The starting worktree was clean. Phase 4’s development branch was based on `dc77690491cbddc576a019f23582f1cfcc2f073d`. The fetched Phase 4 head (`3cf4648`) and this branch’s baseline matched by `git diff --exit-code`; no reset or branch switch was needed. Reviewed `PROJECT_AUDIT_REPORT.md` and the Phase 1–4 reports, and verified the five prior migrations, eighteen baseline unit tests and all 30 baseline PostgreSQL regression subtests before the optimization build.

Both measurements use Next.js 16.4.6 production builds on Node 22.22.3, the same existing eight-product demo seed and disposable local PostgreSQL, with an operator-provisioned admin and a synthetic customer/cart. Runs use a loopback HTTPS proxy with the normal app cookies and CSP, not a production host or CDN. Three Chromium 153.0.8010.0 navigations per route at 390×844, scale 1, with browser HTTP cache disabled (Playwright 1.65.1); application/image caches can warm across navigations. The table shows medians. Local CLS sums unexpected shift entries during the short navigation sample; it is not a complete visit or field CLS measurement. JS and image figures are encoded resource body sizes, not total bytes on the wire, build-directory totals or an estimate of hydration time. Public settings and sitemap reads do not create database rows.

## 2. Measured results

### Chromium navigation medians: before → after

| Route | TTFB (ms) | FCP (ms) | LCP (ms) | CLS | JS (bytes) | Images (bytes) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 62.1 → 78.6 | 252 → 308 | 252 → 336 | 0.00000 → 0.00000 | 205,554 → 193,171 | 43,996 → 35,296 |
| Catalog | 38.0 → 66.3 | 140 → 248 | 476 → 420 | 0.00000 → 0.00000 | 202,368 → 191,398 | 28,398 → 28,398 |
| Product detail | 34.5 → 45.1 | 188 → 252 | 188 → 312 | 0.00000 → 0.00000 | 204,562 → 193,810 | 25,426 → 20,726 |
| Cart | 11.8 → 16.0 | 104 → 160 | 104 → 160 | 0.11109 → 0.00000 | 191,754 → 190,744 | 1,012 → 632 |
| Checkout | 29.7 → 28.4 | 184 → 140 | 328 → 140 | 0.52015 → 0.00000 | 198,662 → 188,859 | 0 → 0 |
| Customer account | 47.2 → 32.2 | 208 → 168 | 208 → 168 | 0.00000 → 0.00000 | 197,310 → 187,532 | 0 → 0 |
| Admin dashboard | 67.9 → 59.5 | 264 → 188 | 264 → 188 | 0.00000 → 0.00000 | 189,269 → 189,311 | 0 → 0 |

Home, catalog and PDP JS declined by **6.0%, 5.4% and 5.3%**, respectively; admin was essentially flat (+42 bytes). Home and PDP image payloads declined **19.8% and 18.5%**; cart image bytes declined **37.5%**. Catalog image bytes did not change for this fixture. Median cart and checkout CLS fell to zero. Local timings were mixed: home, product and cart LCP were slower, while catalog, checkout, account and admin LCP were faster. Repeat on a controlled staging host before judging time-to-render regressions or wins.

### Lighthouse mobile: before → after

| Route | Performance | Accessibility | SEO | FCP (ms) | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 70 → 83 | 100 → 100 | 100 → 100 | 1,144 → 940 | 4,465 → 4,100 | 0.00000 → 0.00000 | 573 → 237 |
| Product detail | 82 → 92 | 95 → 95 | 92 → 100 | 784 → 828 | 3,794 → 2,649 | 0.00000 → 0.00000 | 326 → 239 |

The optimized homepage still exceeds the 2.5 s LCP reference under this simulated mobile profile, and the product page remains slightly above it. The PDP accessibility score stayed at 95; no claim of full conformance.

### Loopback endpoint timing: before → after

Median total request time including body consumption, 3 HTTP 200s per endpoint per build:
- `/api/auth/session`: 17.3 → 16.7 ms.
- `/robots.txt`: 14.6 → 7.9 ms.
- `/sitemap.xml`: 10.0 → 7.8 ms.

The catalog and checkout use server code and Server Actions, not catalog/checkout REST endpoints. The numbers above are not concurrent-load measurements. Raw samples (including HTML bytes, resource counts, speed index and endpoint status): [baseline](docs/phase-5/baseline.json) and [optimized](docs/phase-5/optimized.json).

The Lighthouse 13.6.0 audits are a separate emulated-mobile simulated-throttling run, one navigation per URL per build. Local navigation times and Lighthouse values are not interchangeable. These are lab LCP/CLS measurements; **field p75 LCP, CLS and INP were not measured**. Total Blocking Time (TBT) is a lab diagnostic, not INP. Small timing differences, particularly for loopback requests, should not be treated as production guarantees.

## 3. Client and media changes

- Product card markup, static footer and the fallback editorial hero are Server Components. Card buttons retain small client boundaries; cart quantity updates no longer re-render the rest of the header. Disabled speculative prefetch on repeated product links and private header shortcuts. The review form loads only when requested; approved review bodies are server-rendered.
- Cart and checkout no longer render a false empty cart during local-storage hydration. They share a stable page heading and viewport-sized loading layout. The cart subtotal is still an estimate; checkout action, quote and idempotent submission logic are unchanged.
- Responsive Next.js Image widths for the editorial hero, catalog, product gallery, cart, offers and admin previews. Catalog begins with a bounded eager set; the PDP first image and primary hero use high priority; other cards, offers and previews are lazy. For the CMS carousel, first-frame priority is retained, other slide images are deferred until selected, and the blurred background selects the same mobile/desktop source as the foreground.
- Existing image paths and originals are retained, including `/uploads/products/` and UploadThing media. Optimized image responses reuse versioned URLs and the Next.js image cache. No new external image origin, open redirect, local-IP image fetching or changes to upload authorization or signature validation were introduced.

## 4. Database, API and caching

| Area | Strategy / freshness |
| --- | --- |
| Settings | Concurrent metadata/layout/page reads share a React request memo. A tagged public-only Data Cache entry revalidates after 120 s; authenticated save expires the tag immediately. A missing singleton uses bundled defaults without public writes; admin save can create it. Checkout pricing still reads its authoritative settings inside existing server logic. |
| Homepage / catalog | CMS section reads parallelized; each section keeps its own identity and CMS order. One deduplicated homepage batch for approved ratings and personalized wishlist. Active category projection is tagged for 120 s and expired on save/delete. Prices, variants, stock, scheduled banners, ratings and personalized pages are not in the new shared cache. Catalog lists fetch only card fields, one image and variant availability; sort has a deterministic tiebreaker. |
| Product and customer | Metadata/page share a live projected product read. Related cards use projections; public reviews use 12-row pages and a separate approved aggregate. Account overview uses database counts/sums rather than downloading order lines, addresses and wishlist items; order history fetches 20 rows and item counts per page with the existing `Order.userId` predicate. |
| Admin and connection usage | Request-local auth memo avoids repeating a live role check within a render, not between requests. One Prisma adapter pool per process. Admin list/report reads fetch fewer unused fields. The new additive migration adds deterministic catalog, image, approved review and status/date indexes; it does not rewrite data. |
| Sitemap | Public-only counts and active slug batches are tagged for 120 s and expired after product/category edits, archive and bulk actions; policy changes expire the relevant store settings and sitemap data. HTTP clients revalidate the XML; no private data is ever returned. |
| Private routes | `private, no-store` and `X-Robots-Tag` for protected and transactional page groups. Guest receipt’s stronger no-store/no-referrer policy remains; existing Auth.js API and CSV export protections remain. No shared cache of session, account, admin, checkout or receipt data. |

### PostgreSQL plan evidence

On the disposable PostgreSQL 18.7 fixture, added 25,000 synthetic catalog rows inside a rollback-only transaction and ran `ANALYZE`. Probed an isolated first-page query: select `id, name, price` from active products, order by `createdAt DESC, id ASC`, limit 12. Collected five `EXPLAIN (ANALYZE, BUFFERS)` runs with the index, then removed just `Product_active_created_id_idx` inside the same transaction for five counterfactual samples. These are warm execution times, not end-to-end Prisma query times.

| Index state | Median query execution | Representative plan |
| --- | ---: | --- |
| Without the new index | 8.841 ms | Sequential scan + top-N sort; 384 shared-buffer hits, 22,924 active rows read |
| With the new index | 0.024 ms | Ordered index scan; 3 shared-buffer hits, 12 rows returned |

This isolates the first-page ordering index, not the full ORM query, catalog count, late pages, other added indexes, or the cost of maintaining indexes on writes. See the [raw PostgreSQL plans](docs/phase-5/catalog-plans.json).

## 5. Metadata and indexing

- **Origin:** `NEXT_PUBLIC_APP_URL` → `AUTH_URL` → legacy `NEXTAUTH_URL`. Production SEO requires an explicit HTTPS origin with no credentials, path, fragment or query. No guessed localhost URLs or request-host-derived canonicals. Misconfiguration omits site-derived absolute metadata and the sitemap reports unavailable, rather than advertising a fake host.
- **Indexable:** home, clean catalog, active `?category=` URLs, real catalog pagination (self-canonical), active product routes, about, contact and configured policy pages. These have titles, descriptions where supported by the source data, absolute canonicals, Open Graph and Twitter metadata. Existing catalog and product URLs stay in place. Four old short policy slugs permanently redirect to the advertised full policy URLs.
- **Duplicate / non-indexable:** search, sort, price/stock facets, malformed/unknown filters, invalid category or unavailable catalog page are `noindex,follow` and point to the clean catalog/category canonical. Tracking parameters collapse to clean canonical URLs without excluding the page. Review pagination canonicalizes to the product page. Login, registration, recovery, cart, checkout, tracking, account, admin and receipts carry noindex directives and never enter the sitemap.
- **Discovery:** `robots.txt` advertises the configured XML sitemap and disallows API paths. Private HTML can be crawled to discover `noindex`; authentication remains the access boundary. Sitemap emits only active public catalogs/products and configured informational URLs; above 10,000 catalog entries it emits an index with bounded category/product shards. Category descriptions and crawlable links complement the sitemap, and product/category breadcrumbs use live catalog names.
- **JSON-LD:** home `Organization` and `WebSite`; catalog and product `BreadcrumbList`; product `Product`, `Offer`, approved `AggregateRating` and visible approved `Review`. Absolute allowlisted media URLs include legacy local uploads. When the store uses `৳` or `BDT`, the BDT price and availability come from live base or active variant records; other display symbols do not imply a currency code. A product with only archived variants has no offer. No fabricated rating or price and no order, account identifier, email, phone, or delivery information from customers. Reviewer names/body shown in structured data are the same moderated public values displayed on the page.

## 6. Files and verification

- **SEO:** `src/lib/seo.ts`, `src/components/shared/json-ld.tsx`, root metadata, public catalog/product/home/about/contact/policy pages, `robots.ts`, `/sitemap.xml` and `/sitemaps/[batch]` handlers, sitemap repository and SEO tests.
- **UI/performance:** server footer and card markup, header cart control, homepage carousel/hero split, product detail and lazy review composer, catalog and cart loading, gallery and admin media preview sizes.
- **Data/config:** public cache tags and repositories, homepage and catalog-display services, account/history and reports projections, auth render memo, Prisma process singleton, index migration/schema, admin invalidation and Next.js headers/image settings.

| Check | Observed result |
| --- | --- |
| Prisma Client, TypeScript, whitespace | Client regenerated from the updated schema. `npm run typecheck` and `git diff --check` passed. |
| Unit tests | `npm test`: **21/21 passed**, including three SEO policy tests for origin validation, URL and canonical/facet decisions, and safe JSON-LD serialization. |
| Database regression | Applied all **six** migration SQL files in order to disposable PostgreSQL. `test:security:db`, `test:core:db`, `test:auth:db` passed **10, 11 and 9** substantive subtests respectively (exclude TAP suite wrappers). Covered receipt/ownership, pricing/stock/coupon/transaction, role/revocation/recovery and related Phase 1–3 guards. No hosted `prisma migrate deploy` was run. |
| Lint and build | `npm run lint`: **0 errors, 3 pre-existing warnings** (category manager, chart, toast hook). Standard `npm run build` passed without mocked fonts or providers. |
| Chromium SEO and privacy | Home social tags and organization/site schema, active category canonicals and breadcrumbs, search/facet/out-of-range noindex, tracking canonicalization, PDP image/offer schema, approved review counts and pagination (pending review omitted), lazy review form, `/robots.txt`, root sitemap and a shard, missing shard, permanent policy redirect, transactional/account/admin/receipt no-store/noindex. |
| Chromium commerce and invalidation | Registered a customer and signed in with an operator-provisioned admin. Saved public settings, added/deleted a category and archived a product via admin UI. Verified fresh public settings/catalog/sitemap following mutations. Added to cart and completed guest COD checkout after a live test price change; authoritative total was ৳935.00 (৳875 + ৳60 delivery), not the cart snapshot price. Confirmed authorized receipt was no-store/no-referrer and did not show the submitted address; the separate customer could not open it and saw no guest order in their history. |
| Responsive/keyboard | No horizontal document overflow at **320, 390, 768 and 1440 CSS px** on home, category listing, product, cart and checkout for tested fixture states. Tested keyboard skip link, carousel keyboard selection, no autoplay control in reduced-motion mode, mobile/desktop source selection and no second-slide image fetch before selection. No uncaught page error in the public browser checks. Firefox and WebKit executables were unavailable in this environment. |

## 7. Remaining limits and deployment recommendations

1. Configure and verify the single public HTTPS origin. Check issued canonicals, sitemap and policy redirects on staging; submit `/sitemap.xml` in Search Console. This work does not assert indexing or Google rich-result approval. Use an approved real social image and descriptive product alt text in the CMS where available.
2. Apply the additive migration before release. The migration uses normal PostgreSQL index builds; schedule an appropriate deployment window for large live tables or coordinate an operator-managed concurrent index plan. The PostgreSQL probe does not establish capacity at production concurrency. Substring search, later offset pages, large report aggregation and CSV throughput need separate volume testing.
3. Keep HTML for personalized storefront routes and all account/admin/checkout/receipt responses out of the CDN shared cache. If running multiple instances, use a shared Next.js cache/tag invalidation configuration or accept bounded public-data staleness until revalidation. Resize deployment DB pools to fit the PostgreSQL connection budget. Keep product/order authorization and server quote checks enabled.
4. Measure real-user p75 LCP/INP/CLS across device and network classes after staging. Repeat multiple Lighthouse runs in a stable environment before enforcing budgets. No real provider delivery, hosted UploadThing/CDN performance, real-device Firefox/WebKit, search-engine crawl, or full screen-reader/contrast certification is covered. Existing app features outside the tested paths were not claimed as independently verified.
5. Phase 6 was not started.
