# ShopBD — Phase 1 Security Fix Report

- **Date:** 2026-11-20 (UTC)
- **Development branch:** `arena/b76b10e2-e-commerce-standard-website`
- **Starting commit:** `faafabe77bf31c8d6cd86d40ec243674ef3ccf7d`
- **Audited commit:** `d51311a8d092f9342a10d1e640ac7b18c3f4aed7`
- **Scope:** I-01 (receipt privacy), I-02 (order ownership), migration and regression verification. Phase 2 and later were not started.

## Branch and baseline verification

Read `PROJECT_AUDIT_REPORT.md` and verified a clean worktree at the start. The audited commit was initially absent in the shallow checkout; fetched that commit by SHA without switching, resetting, or renaming branches. `git diff --name-status d51311a8d092f9342a10d1e640ac7b18c3f4aed7 HEAD` at baseline showed only `PROJECT_AUDIT_REPORT.md` differed. The source, schema, migrations and configuration matched the audited snapshot. The original audit and its findings are unchanged.

## I-01 — Private order confirmation

- An authenticated customer can read a receipt only when the same database query matches **both** the display order number and their session user ID (`Order.userId`). An authenticated non-customer is denied; an authenticated customer does not fall back to the guest cookie.
- A newly placed guest order gets a **256-bit random token**. Only its SHA-256 digest and absolute expiry are stored with the order in the existing creation transaction. The checkout Server Action sends the token only in an **HttpOnly**, per-receipt-path cookie (`SameSite=Lax`, `Secure` in production). It is not included in the URL or action response payload. Expiry is 30 minutes and enforced on the server as well as in the cookie.
- A guest read matches the display order number, `userId IS NULL`, the digest of the cookie token, and `expiresAt > now` in the same query. Missing/malformed tokens are rejected before querying. Unmatched, unauthorized, and expired reads return a generic not-found view. The order number is a lookup key, never a credential.
- The receipt selects only order number, status, total and item display fields. It does not query or display the shipping address, customer name, phone, locality, email, notes or zone. The existing confirmation layout, links and COD method remain. The heading says **Order received**, separately from the actual fulfillment status.
- The route is explicitly dynamic; it sets `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, and `Referrer-Policy: no-referrer`; page metadata also disallows indexing. Do not configure a CDN to override these protections. Purge any old receipt cache and stop routing traffic to old application versions when rolling out this fix.

## I-02 — Trusted order ownership

- Account order history and details authorize exclusively on `Order.userId` from the authenticated customer session. A matching `Customer` foreign key or delivery phone grants no access. Existing authenticated orders with a trustworthy matching `Order.userId` remain visible, even if their legacy `customerId` was wrong.
- New authenticated orders set `Order.userId` from the session and look up the operational customer row only by its unique `userId`. A missing customer row is created without changing existing rows: duplicate insert protection and a follow-up unique lookup handle a competing creation. No `Customer` row is reassigned or edited by this flow.
- Guest orders retain `Order.userId = NULL`, with a separate unlinked guest customer record per order for the admin workflow. The same delivery phone can appear on multiple orders without establishing a shared identity. No guest-to-account claim or automatic historical reassignment is implemented.
- An existing order cannot turn a client-supplied idempotency key into a new guest receipt or reveal another account's receipt reference. Exact-key replays only return an order reference to the authenticated owner. A guest who loses the response/cookie must use the existing tracking or support flow; general retry reliability is an existing separate issue.

### Historical associations — read-only operator review

No production database was accessed, so there is no claim about the number of affected rows. Use a restricted, read-only connection to review historical candidates. The aggregate below outputs no customer or order identifiers. For any nonzero class, use the same conditions in a restricted internal review, relying on verified evidence rather than phone equality. Do not automatically relink, delete, or backfill customer/order records.

```sql
WITH candidates AS (
  SELECT CASE
    WHEN o."userId" IS NULL AND c."userId" IS NOT NULL
      THEN 'guest_order_linked_to_registered_customer'
    WHEN o."userId" IS NOT NULL AND c."userId" IS NOT NULL
         AND o."userId" <> c."userId"
      THEN 'different_order_and_customer_users'
    WHEN o."userId" IS NOT NULL AND c."userId" IS NULL
      THEN 'owned_order_missing_matching_customer_link'
  END AS category
  FROM "Order" AS o
  LEFT JOIN "Customer" AS c ON c.id = o."customerId"
)
SELECT category, COUNT(*) AS review_count
FROM candidates
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;
```

These categories flag review candidates, not proven incidents or correct new owners. Guest orders with no user and no receipt grant (including legacy guest orders) are not claimed by any account or granted retroactive receipts. They remain available for the existing order-tracking/support workflow, subject to its existing controls.

## Migration and rollout

`prisma/migrations/20261120153000_add_guest_receipt_grant/migration.sql` adds two nullable columns to `Order`: `guestReceiptTokenHash` and `guestReceiptExpiresAt`. It contains no updates, deletes, or backfill. Both values are null for existing orders; only new guest orders get grants. Apply with `npm run db:deploy` before sending traffic to this release, and regenerate Prisma Client for the deployment build. Do not run the demo seed on live data. Do not roll back to an app version that serves public receipts; disable the receipt route temporarily if needed instead.

## Tests executed

No new project dependency was added. The checked-in tests use `node:test` with the existing `tsx` dev dependency. PostgreSQL and any browser smoke-test tooling for local verification were provisioned outside the repository, using only generated fixture data.

| Check | Result |
| --- | --- |
| `npm test` | **Passed:** 5 focused policy tests; identity predicate, random/digested guest token and expiry, scoping, missing/malformed input, and authorized replay behavior. |
| `npm run test:security:db` | **Passed:** 10 PostgreSQL subtests (11 TAP results including the suite wrapper). Real Prisma services ran against a fresh disposable local PostgreSQL database, including all 8 requested cases, legacy mislinks, equal phone numbers and replay restrictions. |
| Migration SQL | **Passed:** all three checked-in migrations applied in order to disposable PostgreSQL via the PostgreSQL client. The hosted/staging Prisma migration deploy workflow was not exercised. |
| `npm run typecheck` | **Passed.** |
| `npm run lint` | **Passed with 17 existing warnings and no errors.** No warnings were in the changed implementation/test files. |
| Production compilation | Standard `npm run build` was attempted; it was blocked by network access to Google Fonts for the existing Inter import. An offline **Webpack production build passed** with a temporary local Google Fonts response and disposable PostgreSQL; the receipt route was emitted as dynamic. No application font configuration was changed. |
| Chromium smoke test on the local production build | **Passed.** Two guest checkout sessions received working, separate receipt cookies; another browser could not open a guest receipt. Verified Secure/HttpOnly/SameSite/path/expiry attributes, private/no-store, noindex and no-referrer response headers, and absence of delivery address on confirmation. A signed-in customer placed an order and opened their detail page; another account and a guest were denied access to the corresponding private receipt, and the other account was denied access to the order detail. This was loopback testing with synthetic records, not a staging/CDN test. |
| Dependency setup | `npm ci` downloaded the locked packages but its postinstall Prisma native schema-engine download was blocked. Client generation was completed separately with the installed Prisma generator; the unavailable native schema engine was bypassed for generation only. Generated client and test/build artifacts are not tracked. |

The integration suite uses synthetic users/orders, tests positive and negative authorization at the real query layer, and never targets the production database.

## Manual verification on staging

1. Provision a disposable local/staging PostgreSQL database, apply `npm run db:deploy`, and configure HTTPS, Auth.js and the DB connection. Use synthetic products, a delivery zone, and two non-admin test users. Run `npm test`; for the DB suite use a **disposable loopback** database named `shopbd_security_test`, set `SHOPBD_SECURITY_TEST_DATABASE_URL` to that database's local connection URL and run `npm run test:security:db`. The DB suite writes fixtures; do not point it at real data or seed demo defaults into production.
2. In two independent signed-in customer sessions, place orders and check each owner's receipt and Account → Orders → Details. Open the other session's references and confirm no order details or address are rendered. Use the same fictitious delivery phone for both customers to ensure it does not associate ownership.
3. From two independent guest sessions, place COD orders successfully. Confirm each can refresh its own private receipt for 30 minutes but not the other guest's receipt. Paste the URL into a fresh browser or delete the scoped cookie; verify it returns not found. Check cookie attributes (without copying its value into logs), then confirm rejection once expired. An old guest receipt has no grant; use tracking/support as applicable.
4. Inspect receipt response headers on allowed and denied paths through the actual staging CDN/proxy: no-store, noindex and no-referrer. Confirm the receipt contains no address/phone/email, and no token appears in navigation URLs or analytics.
5. Review association counts with the read-only query above on an approved connection. Confirm operator policy for flagged historical records and old guest receipts before any separate remediation work.

## Remaining risks and deliberate limitations

- A guest receipt is deliberately browser-bound by cookie delivery, time-limited, and non-transferable by URL alone. Clearing cookies, changing browsers, expiry or signing in as a user other than the order owner can make the receipt unavailable. The token is a bearer credential if the cookie itself is compromised. Support/tracking is the existing fallback, not an account-claim mechanism.
- Legacy phone-derived links can still affect admin grouping/reporting until reviewed. Legacy guest tracking by order number and phone was not changed and does not grant account or receipt access. New guest orders can produce multiple operational customer rows per phone. Some historical rows may not be classifiable without verified context.
- Prior audit issues such as broader session revocation, rate limiting, default admin provisioning, coupon atomicity, general idempotency, cancellation/inventory correctness, and reconciliation remain outside Phase 1. If checkout commits but its response fails, the guest grant may not be delivered. Staging access, production data, CDN behavior and incident history were not inspected.

## Changed files

| File | Purpose |
| --- | --- |
| `src/app/(shop)/order-success/[orderNumber]/page.tsx` | Request-level viewer resolution, reduced receipt view and robots metadata. |
| `src/server/actions/customer.ts` | Issues the scoped cookie only after a newly authorized guest checkout; no raw token in action data. |
| `src/server/services/order-access.ts` | Shared ownership predicate, token generation/digest/expiry helpers and replay policy. |
| `src/server/services/order.service.ts` | Authoritative account association, isolated guest creation and authorized receipt query. |
| `src/server/services/account.service.ts` | Owner-only account order list and detail queries. |
| `next.config.ts` | Receipt-only response header rules. |
| `prisma/schema.prisma`, `prisma/migrations/20261120153000_add_guest_receipt_grant/migration.sql` | Nullable guest grant fields, no backfill. |
| `package.json`, `tests/order-access.test.ts`, `tests/order-security.integration.ts` | Dependency-free addition to the existing test toolchain, with local-only DB safety checks. |
| `PHASE_1_SECURITY_FIX_REPORT.md` | Implementation, verification, rollout and legacy data review instructions. |

**Disposition:** I-01 **fixed in code**. I-02 **fixed in code**; historical association review is separate, and no real customer or order records were modified. The checked-in security regression suites passed, including all eight requested cases. The branch may proceed to Phase 2 **development after approval**. That does not authorize production deployment: apply the migration and verify the deployed access/cache boundaries on staging first.
