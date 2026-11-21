# ShopBD — Phase 6 production readiness and final security review

**Release decision: BLOCKED.** The branch is prepared for an authorized staging rehearsal, not approved for production. No live database, provider account, customer data, deployment or production infrastructure was used or modified.

## 1. Verified baseline

- Working branch: `arena/bb7c010e-e-commerce-standard-website`; initial clean HEAD: `67515c0ea10e1c8490047741c7be736fbe533451` (`AI-Agent`, merge of Phase 5 PR #10).
- Fetched the Phase 5 branch `arena/7be460fa-e-commerce-standard-website`. Its head `13921859d5d5b1b7ec76d18f50f11d5703fe2f4f` is the second parent of the merge; ancestry and exact tree parity were verified before changes. **PASS:** no Phase 5 implementation or commit was missing. No reset, overwrite or unrelated merge.
- Reviewed `PROJECT_AUDIT_REPORT.md` and the Phase 1–5 reports against current routes, services, tests and six migrations. Baseline carries forward Phase 1 private receipts/ownership, Phase 2 order transactions/stock/coupon/COD rules, Phase 3 sessions/revocation/provider safeguards, Phase 4 keyboard/responsive controls and review moderation, and Phase 5 SEO/media/queries/public-only cache policy. These earlier reports and migration SQL files are unchanged.

## 2. Production environment and deployment

| Area | Result |
| --- | --- |
| Runtime | **PASS** locally on Node 22.22.3, Next.js 16.4.6/Turbopack. Node 22.12+ and 24 LTS are documented in the manifest; Node 24 and the managed hosting target were **NOT TESTED**. |
| Startup validation | **PASS**: `next start` exits nonzero on unsafe/missing production configuration and names invalid variables without values. Requires an explicit matching HTTPS Auth.js/SEO origin, nonblank 32+-byte auth secret, configured trusted ingress flag, valid DB URL and remote `verify-full`, and rejects disabled certificate verification and demo seed opt-in. `DIRECT_URL` belongs in the migration job only. Optional Resend values must be paired; the app does not silently invent credentials or approve a provider. |
| PostgreSQL adapter | **PASS** using disposable loopback PostgreSQL with `pg`. One pool per process; `DB_POOL_MAX` default 5 (1–50), five-second connection acquisition and 30-second idle timeout. Hosted remote TLS, startup scaling and load against a real pooler are **NOT TESTED**. |
| Health and shutdown | **PASS**: production `/api/health/live` and `/api/health/ready` returned uncached 200 on normal startup. After stopping disposable PostgreSQL, readiness returned 503 with a generic body and liveness stayed 200. Next exited on `SIGTERM`. In-flight production drain and restart on the target host are **NOT TESTED**. |
| Error and logging | **PASS** source review: startup config diagnostics use fixed labels, production browser and proxy logging no longer serializes error objects, existing server error classification preserved. External APM, edge log scrubbing/retention, alert routing and restart/drain policies require staging verification. |
| CI | Release workflow added: locked install, lint/type/unit checks, native migration deploy/repeat/status, all DB suites, production build on its own PostgreSQL service. **NOT TESTED** on GitHub Actions in this turn. |

## 3. Database and migration audit

**PASS — SQL replay:** all six checked-in migrations applied in order to empty disposable PostgreSQL 18.7. The integration suites ran against that schema. No Phase 6 migration, FK change, data backfill or production SQL was introduced.

| Migration | Purpose and release implications |
| --- | --- |
| `20261117111805_init` | Base tables/enums, joins, unique lookup keys, relational FKs and indexes. Nullable operational customer/product links and history must not be used as identity. |
| `20261117132539_add_order_item_variant_id` | Nullable historical variant reference, not an FK. Preserve existing snapshots; missing legacy SKU references require operator review, not guessing during restock. |
| `20261120153000_add_guest_receipt_grant` | Nullable digest and expiry; no retroactive grant for old guests. |
| `20261120163000_core_checkout_integrity` | Adds ownership/date index, buyer-scoped coupon redemption, inventory versions and delivery mappings. Stock floors are `NOT VALID` for old rows but enforced for new writes; review historic negatives before validating any constraint separately. |
| `20261120173000_auth_security` | Session/recovery versioning, rate buckets and expiry indexes, auth version trigger, no rewrite of credentials. |
| `20261120190000_catalog_query_indexes` | Additive sort/read indexes on products, images, approved reviews and orders. Ordinary index builds may lock writers; Phase 5 synthetic plan is not a capacity or migration lock measurement. |

**BLOCKED — native migration:** attempted `npm run db:deploy` on the disposable DB. Prisma could not download its native schema-engine checksum from `binaries.prisma.sh`; no application tables were created by that attempt. The tests used the original SQL files instead, not a shim pretending to run `migrate deploy`. The installed Prisma generator successfully produced the client with the schema-engine download bypassed **for generation only**. Native `_prisma_migrations` history, repeat/no-op and target DB grants have not been verified here.

**MANUAL ACTION REQUIRED:** run native deploy twice and `prisma migrate status` with the direct DB role on a supported stage/runner. Rehearse a backup/PITR restore into a separate database, validate constraints/counts/security and reconciliation, and measure recovery against agreed objectives. No `pg_dump`/`pg_restore` binaries were available locally; the [backup/restore guide](DATABASE_BACKUP_RESTORE_GUIDE.md) documents exact safe steps. Existing PK/FK/unique indexes and order/stock/coupon/receipt transactional tests provide evidence, not approval of live data or removal of possibly redundant indexes.

## 4. Final security and providers

- **PASS — local security regressions:** owner-only order access, expiring and scoped guest receipts, independent live staff authorization, logout/password/role revocation, one-time recovery with mocked transport, bounded validated upload, CSV formula protection/export authorization, verified-price COD, user-bound replay, atomic stock/coupon limits and cancellation/restock. Two independent Node processes shared the same PostgreSQL rate bucket: **5** approvals total on a **5**-request cap across 10 attempts. No process-local replacement needed.
- **PASS — hardened configuration and logs:** preserved cookie, receipt, CSP and optimizer restrictions. Production diagnostics no longer serialize arbitrary browser/proxy error payloads. No secrets added to tracked files; CI uses public fixture-only local credentials. Existing CSP is a baseline, not a full script CSP. Actual host allowlisting, HTTPS/HSTS, forwarding rules, upload body caps and private cache separation must be verified at the edge.
- **FAIL — dependency release gate:** `npm audit --omit=dev` went from **9 high / 1 moderate** package entries to **5 high / 1 moderate**, no critical. Updated PostCSS and locked Browserslist/Lodash and removed unused `@uploadthing/react`; live storage SDK remains. Remaining advisories involve Effect/`@effect/platform` paths through Prisma and UploadThing. Full-tree audit also reported a dev `brace-expansion` entry (**6 high / 1 moderate** total). Counts include propagated dependents. No unsupported major downgrades or `--force` audit fixes. Review exact reachability and obtain an upgrade or explicit time-bounded risk approval before launch.
- **NOT TESTED — live providers:** Resend and UploadThing were not called with credentials. Only local mocked recovery, upload authorization/validation and checked-in image optimization can be claimed. No external courier integration is implemented; COD and delivery status are operated by staff. The Contact page now opens a draft in the customer's mail app rather than claiming an unsent message was delivered; confirm the actual mailbox, published details and fallback contact on staging.

## 5. Performance, SEO and accessibility

- **PASS — local release SEO:** production Chromium verified canonical host and category, search noindex, robots and sitemap URL, root XML and product shard, no private URLs in XML, live BDT variant offer schema, and checked-in raster through the Next.js optimizer. Verified no-store, noindex and the framing CSP on the sampled private routes.
- **NOT TESTED:** New Lighthouse benchmark, field LCP/INP/CLS, Google indexing and rich-result approval, deployed CDN/hosted image performance. Phase 5's historical lab performance scores were 83 home and 92 product after optimization; lab LCP remained approximately 4.10 s and 2.65 s respectively. No p75 or release performance guarantee.
- **PASS — targeted accessibility:** Chromium tested the keyboard skip link and visible focus, keyboard variant selection, labeled checkout fields and reduced-motion mode. Home, catalog, PDP, cart, checkout and contact had no horizontal overflow at 320/390/768/1024/1440 CSS px for the fixture. Existing contrast unit tests passed. This is not a full audit of merchant palettes, forms, assistive technology or WCAG conformance.

## 6. Test evidence

| Check | Actual status |
| --- | --- |
| Locked install and Prisma Client | **PASS** with scripts disabled for installation and client generated explicitly. Schema validation passed. Normal native engine download remains blocked as noted above. |
| `npm test` | **PASS — 23/23** (includes SEO, contrast, auth/media, commerce, receipts and two production config tests). |
| `npm run typecheck`, `npm run lint` | **PASS**; 0 errors and 3 pre-existing unused-code warnings (category manager, chart, toast hook). |
| `npm run build` | **PASS** on disposable production-build configuration; no provider secret or external font workaround. An initial TypeScript build caught a stale contact button reference; it was corrected before the final successful build. |
| `npm run test:security:db`, `npm run test:core:db`, `npm run test:auth:db` | **PASS — 10, 11, 9** substantive subtests respectively (TAP output includes an extra suite wrapper). SQL replay for each disposable schema. |
| Native Prisma deployment and restore | **BLOCKED** as noted above. |
| Chromium business and private access | **PASS**: registration, credentials sign-in in a separate browser context, product search and variant selection, cart, valid coupon and Dhaka fee, guest COD and tracking, signed-in COD, owned history and receipt, guest/unauthorized denial, same-phone guest order excluded from account, private receipt cookie attributes and absence of the synthetic address from receipt/tracking. |
| Chromium admin and release mutations | **PASS**: admin sign-in, order cancellation dialog and Escape, committed cancellation with one variant stock restoration, persisted product/variant stock edit, category/settings/product-archive invalidation, review publish and public display, protected CSV, anonymous/customer upload denial and invalid image rejection. Admin dashboard had no horizontal overflow at 320/768/1440 CSS px. Final functional smoke run exited zero with no uncaught Chromium page errors. |
| Firefox, WebKit, hosted/staging integrations | **NOT TESTED**; Firefox/WebKit browsers and authorized hosted/provider environments were unavailable. |

## 7. Ordered remaining release gates

1. **MANUAL ACTION REQUIRED:** approve a reviewed host and lockfile. Remediate or explicitly disposition the remaining advisory entries; run the release workflow and repeat audited build on the chosen Node/OS stack. Do not announce a clean audit.
2. **BLOCKED until evidence exists:** run native migrate/deploy/status twice on disposable PostgreSQL, then stage against the target version with a direct DDL role. Rehearse encrypted backup/PITR and isolated restore, record recovery time, rollback owner, and reconciliation process. Verify real schema/privileges, target-size index impact, runtime DB budget and checkout concurrency through the actual pooler.
3. **MANUAL ACTION REQUIRED:** configure consistent HTTPS origins, ingress allowlist/forwarded headers, roles/secrets, staff/admin setup and cleanup job. Verify readiness/outage/recovery, logs with no sensitive payloads, alert routing, draining and rolling deployment. Confirm private responses cannot be shared by CDN; verify tag behavior across nodes.
4. **MANUAL ACTION REQUIRED:** verify Resend recovery and UploadThing round-trip against authorized staging providers. Check domain/sender, stock and district mappings, active COD terms, accurate published policies and support inbox, and fulfillment/cancellation procedures. Test Firefox/WebKit and the accessible checkout/admin paths on target clients when available.
5. **MANUAL ACTION REQUIRED:** execute the staged smoke checklist, capture result sign-offs and obtain explicit authorization before production. Do not bypass a failing gate or open the store before proving purchase, recovery and rollback. No subsequent phase started.

### Runbooks

- [Deployment guide](PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Environment checklist](PRODUCTION_ENVIRONMENT_CHECKLIST.md)
- [Database backup and restore guide](DATABASE_BACKUP_RESTORE_GUIDE.md)
- [Production security audit](PRODUCTION_SECURITY_AUDIT.md)
- [Production smoke test checklist](PRODUCTION_SMOKE_TEST_CHECKLIST.md)
