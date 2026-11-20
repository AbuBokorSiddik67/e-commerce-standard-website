# ShopBD — Phase 4: Storefront and admin UI/UX

- **Branch:** `arena/21e30fbb-e-commerce-standard-website`
- **Base:** `dc77690491cbddc576a019f23582f1cfcc2f073d` (`AI-Agent`, merge of Phase 3 PR #8)
- **Date:** 2026-11-20 (UTC)

## Baseline and scope

The branch began clean. The Phase 3 PR head was fetched without changing branches; its tree matched this branch’s starting tree. The audit and Phase 1–3 reports and all five migration directories were present. The design work addresses the audit’s navigation, paging, interactive semantics, loading, review display and admin workflow findings. Before edits, 15 unit tests and all three PostgreSQL regression suites passed on disposable data. The first three phases were not reset or replaced.

The design uses an editorial storefront and a denser operations workspace. Both share the same form, button, typography, spacing and feedback conventions. Existing settings, products, categories, homepage sections, orders, customers, discounts and inventory remain database-backed. The fallback hero photograph is a generated editorial asset, not a product photo or inventory record. No production records, schema or migration history changed, and no application dependency was added.

## Before and after

| Area | Before | Phase 4 |
| --- | --- | --- |
| Storefront shell | Generic single-row header, hidden mobile search, link/button nesting | Announcement and shipping link, configurable mark, always-available labeled search, independent account/bag controls, desktop nav, accessible mobile menu and shortcuts, branded footer |
| Home | Plain text fallback and desktop-only animated benefits; side banners loaded but not shown | Split editorial hero when no slides are configured, preserved uploaded desktop/mobile art direction, explicit pause/play, responsive benefits and collection cards, styled merchandise grids, distinct side offers, newsletter and reviews when enabled |
| Catalog | Stacked filters, price changes on blur, a ten-page ceiling | Desktop filter panel and mobile sheet, explicit Apply/Clear, sorting and query-preserving navigation, previous/next, cards with distinct wishlist and cart controls, approved review aggregates, empty state and loading skeleton |
| Product | Default square gallery and hardcoded four-star display | Responsive gallery with labeled thumbnails, visible quantity/stock/variant state, configured money symbol, saved-heart state, approved rating/reviews, available specs, description and related items |
| Cart and checkout | Compact inline controls and less differentiated delivery/summary | Named item controls, thumbnails, currency-aware summary and coupon display, grouped contact/address and delivery choices, phone guidance, COD quote/review stage, and no-zone recovery link |
| Auth and account | Mixed form feedback and narrow tab header | Consistent form and workspace surfaces, inline announced errors and neutral recovery acknowledgement, account navigation and active states; retained profile, addresses, password, orders, tracking, wishlist and sign-out |
| Admin navigation | Fixed desktop sidebar and clipped horizontal mobile bar | Grouped sidebar, persistent context header, direct store link, full mobile sheet, visible sign-out and active destination |
| Admin operations | Plain KPI cards, inconsistent table/pagination layout, no review moderation | Labeled DB metrics and COD comparison, order status counts, actionable low-stock/recent orders; keyboard-scrollable tables, bounded pagination, responsive settings tabs, accessible order cancellation, and protected review publishing/hiding with audit logging |

### Business and security boundaries

- Order placement still uses Phase 2’s authoritative quote, delivery-zone district mapping, Decimal pricing, retry identity, stock and coupon transaction and COD rules. Cart prices are estimates; checkout submits the same existing server-reviewed intent. Product card variants go to the detail page rather than bypassing required selection.
- Phase 1 ownership predicates, guest receipt grant, response headers and minimal receipt fields are unchanged. No customer or delivery details were added to receipts.
- Phase 3 Auth.js role checks, DB sessions and revocation, validation, shared abuse limits, provider configuration, safe media/link and export policies remain in place. The raster allowlist now recognizes the existing static `/uploads/products/<filename>` folder so seeded and legacy checked-in media can be retained in the product editor; traversal, arbitrary subdirectories, URL arguments, unexpected file types and new remote origins are still rejected. No test-only or preview bypass was added. Review moderation independently requires live admin auth, validates the identifier and boolean, and writes its audit row in the same transaction as approval. Public ratings use only approved reviews; approval is not proof of purchase.
- Editorial section order, visibility, selected items, safe CTAs, media and store customization are retained. Admin dashboard shows actual values and counts; **order value is not collected cash or revenue**. Payment/reporting calculations and order transitions were not rewritten.

## Design system

| Token family | Standard |
| --- | --- |
| Surfaces and ink | Canvas `hsl(216 33% 98%)`, white cards, navy ink `#0F172A`, pale editorial blue `#EAF0FD`, dark admin sidebar `#121E36`, admin primary `hsl(222 79% 47%)`. Sale uses pale red plus an explicit discount; stock/status never uses color alone. |
| Store brand | Saved primary sets announcement/footer; configurable button color has a contrast-selected black/white label; accent/text get a readable fallback on light surfaces; non-white background makes a light canvas tint. Existing font setting gets first choice with local fallbacks. Admin has a stable operational palette. |
| Type | Locally hosted variable Inter, plus local Noto Sans Bengali for Bengali script and `৳` (both SIL OFL; licenses next to fonts). Body generally 14–16px; labels 11–14px; page titles 30–46px, section titles 27–42px, editorial display 42–77px. Weights 400/500/600/700–750, tabular numerals for money/metrics. |
| Space and shape | 4px grid; core gaps 8/12/16/24/32px; 16/24/32px responsive page gutters; 1280px storefront container. 14px base radius, 16px common card, ~25px hero, low-opacity elevation on surfaces. |
| Controls | Shared `Button`, `Input`, `Badge`, `Card`, `Table`, title/breadcrumb/empty-state and pagination primitives. Lucide 16–20px controls; decorative icons hidden where action text provides the label. Radix sheet and alert dialog, Sonner feedback, real `<button>` and `<a>` elements. |
| Breakpoints | Tailwind `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px and `2xl` 1536px. Mobile and tablet filters/admin destinations in sheets; long data tables scroll inside their regions. |
| Motion and keyboard | Visible focus outlines, skip target, current-page and pressed states, scoped form and table labels, screen-reader status for quote/quantity changes and recovery. Respect reduced motion; no autoplay when reduced motion is requested. |

## Main file map

- **System:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/fonts/`, `src/lib/storefront-colors.ts`, `src/components/shared/{page-heading,pagination}.tsx`, and shared `ui` button/table primitives.
- **Shop:** `src/app/(shop)/{layout,page}.tsx`, `products/`, `product/[slug]/`, `cart/`, `checkout/`, and customer header/footer, hero, category, trust, product, filters, reviews and newsletter components. `public/brand/editorial-desk.webp` is the optimized fallback asset. Catalog display enrichment lives in `src/server/services/catalog-display.ts`; `product.repo.ts` filters active catalog categories and `homepage.service.ts` supplies the configured side offers.
- **Account:** customer form shell and recovery/validation feedback in `auth-forms.tsx`, account navigation in `account-nav.tsx`, and admin sign-in in `src/app/admin/login/`.
- **Admin:** protected layout, dashboard and management routes; grouped `sidebar.tsx`; settings, category, coupon and order-status components; review listing, `review-moderation.tsx`, and `src/server/actions/reviews.ts`.

## Verification

- Node `v22.22.3`; locked dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund`, and Prisma Client generated from the existing schema.
- `npm test`: **18/18 passed**, including two new contrast tests and one product-media regression. `npm run typecheck` and `git diff --check`: passed.
- Disposable loopback PostgreSQL: all **five migrations** replayed in order using their SQL. `npm run test:security:db`, `npm run test:core:db`, `npm run test:auth:db`: **10, 11, and 9 substantive subtests passed** respectively (the TAP totals of 11, 12 and 10 each include a suite wrapper). Native hosted migration deployment was not exercised.
- Browser fixtures: existing opt-in seed on a fresh loopback DB; synthetic customer, operator-provisioned admin, review and COD order. No provider credentials or real customer/order data were used.
- `npm run lint`: **0 errors, 4 existing warnings** (unused symbols in policy page, category manager, chart and toast hook).
- `npm run build`: **passed** using the normal Next.js/Turbopack production command, with no remote font fetch or mock. Next emitted non-blocking Browserslist and Tailwind-config module-type notices.
- Chromium used Playwright with a throwaway loopback HTTPS reverse proxy and unmodified app cookie/CSP settings. An early run used the headless package’s single-process arguments and lost secure session persistence on navigation; the normal multi-process Chromium run resolved the harness issue. The browser sweep also found a 320px reports overflow and an invalid block badge inside order-detail paragraphs; both were corrected in the app.

### Final Chromium results

The final production run exited **0**. The browser recorded **no uncaught page errors** during the tested flows.

| Flow | Verified |
| --- | --- |
| Search and purchase | Desktop keyboard skip link and header search; opened a real product; changed its quantity and added it; decreased cart quantity; reviewed the authoritative Dhaka delivery quote; placed a guest COD order; reached the private “Order received” page without the submitted address in its body. |
| Mobile shopper | Opened the mobile menu and catalog filter sheet, applied a real category, selected price sort, registered a customer, saved a product to the wishlist, verified it remained visible after navigation, and confirmed the customer could not open the admin review queue. |
| Admin | Signed in with the operator-provisioned admin; viewed real pending COD data; published a review via confirmation and verified both the stored approval and public rating; navigated the mobile menu; edited a seeded product’s summary and confirmed its persisted value; opened and dismissed the order cancellation dialog with Escape; confirmed the guest order and verified its stored status. |
| Layout | Swept **16 routes at 320, 390, 768, 1024 and 1440 CSS pixels** for document-level overflow: home, catalog, product, cart, checkout, admin dashboard, products, orders, categories, customers, banners, coupons, homepage, reports, settings and reviews. Also checked mobile product editor and order detail during the write flows. |

### Screenshots

These are captures from the running application using disposable database fixtures, not design mockups. The admin chart shows a synthetic COD order with no collection recorded. The checkout image includes synthetic delivery contact details only.

| Surface | Capture |
| --- | --- |
| Home | [Desktop](docs/phase-4/storefront-desktop.jpg) · [Mobile](docs/phase-4/storefront-mobile.jpg) |
| Catalog and product | [Mobile catalog](docs/phase-4/catalog-mobile.jpg) · [Desktop product detail](docs/phase-4/product-desktop.jpg) |
| Checkout | [Desktop server-quoted COD review](docs/phase-4/checkout-desktop.jpg) |
| Admin | [Desktop dashboard](docs/phase-4/admin-dashboard-desktop.jpg) · [Mobile dashboard](docs/phase-4/admin-dashboard-mobile.jpg) · [Mobile products](docs/phase-4/admin-products-mobile.jpg) |

### Coverage limits and handoff

- This is targeted Chromium/keyboard coverage, not WCAG certification, a full screen-reader audit, or real-device Safari/Firefox testing. The width sweep does not cover every possible record length, dialog, configuration, or zoom setting. With very long data, the admin tables are designed to scroll within the panel rather than widen the document.
- A separate quick-view purchase flow was not added. Card quick-add applies only to in-stock non-variant products; variant buyers go to the full detail page. Existing catalog price filtering and best-seller ranking semantics remain; the existing homepage ranking falls back to arrivals when no order-item data exists. Existing saved addresses remain manageable in the account, rather than becoming a new checkout input.
- Review moderation uses the existing approved flag: hiding returns a review to the unpublished queue, not a separate rejection state. No fraud/verified-purchase or ratings backfill was introduced. Product content under hosted media and live uploads was not tested.
- The deployment, email-provider delivery, real CDN behavior, production ingress, settlement data and third-party integrations were not exercised. Phase 3 staging checks and secret/provider requirements continue to apply. Other font families in saved branding use an installed font if available, then the bundled fallback stack. Currency formatting was improved in the covered purchase/admin surfaces; some older pages still use the existing BDT default.
- Before/after above is a source-based feature comparison. Captures show the redesigned app only. No Phase 5 work, deployment or pull request was started.
