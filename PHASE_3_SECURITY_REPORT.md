# ShopBD — Phase 3 Authentication & Application Security

- **Branch:** `arena/6c8cbcf9-e-commerce-standard-website`
- **Starting commit:** `e6cd1832f1a93870a2c839b6eeb940e6b22c752c` (`AI-Agent`, merge of PR #7)
- **Scope:** Authentication, authorization, sessions, abuse controls, recovery, uploads, and administrative auditing. Phase 4 was not started. No real customer data, order data or provider credentials were used.

## Step 0 — Previous phases verified

The worktree was clean. Fetched the merged Phase 2 branch for comparison without switching or resetting branches; its tree matched the current commit exactly. Reviewed `PROJECT_AUDIT_REPORT.md`, `PHASE_1_SECURITY_FIX_REPORT.md`, `PHASE_2_CORE_LOGIC_REPORT.md`, the receipt and checkout services, and both prior migrations. On the unmodified base, all nine existing unit tests and all 21 PostgreSQL subtests passed against the four existing migrations. The three historical reports and the Phase 1 private receipt page are unchanged. Phase 2 pricing, ownership and inventory behavior remain in place.

## Findings and changes

| Issue | What changed |
| --- | --- |
| **I-03: default privileged credentials** | Removed the reusable admin credential and public documentation for it. Demo seeding no longer provisions any user and requires explicit opt-in on a named, disposable loopback database outside production. The operator CLI creates a new admin with a password supplied on stdin or explicitly rotates an existing admin; it cannot promote a customer. |
| **I-04: authority based on stale JWTs** | Auth.js Credentials remains the login mechanism. The encrypted JWT carries a random session handle; PostgreSQL stores only its digest. Full server auth checks the active session, current role, auth version and block flag, plus absolute expiry. Admin sessions last at most four hours and customer sessions at most 12 hours. The proxy is an early navigation check, not authorization. |
| **I-05: no shared login abuse controls** | A parameterized PostgreSQL upsert atomically limits attempts across instances. Login allows eight attempts per normalized identity per 15-minute window, 35 per trusted IP per five minutes when configured, and 1,200 per minute globally. Customer and admin portals share the identity bucket. The first over-limit attempt per bucket records a pseudonymous audit event; normal invalid credentials return a generic error. |
| **I-06: recovery leakage, token races and missing email** | Customer recovery returns the same result for eligible, unknown and blocked addresses. No reset link is returned by the action, even in development. Delivery runs after the response and requires Resend configuration; the link uses a URL fragment. Tokens are random, stored as hashes, expire after 20 minutes, and have one use. A guarded transaction changes the password, consumes the exact token and revokes all account sessions. Privileged recovery is handled by the operator CLI, not public mail. |
| **G-09 / I-07 / I-10 / I-11: unsafe inputs, sensitive exports and logs** | Bounded IDs, form payloads, lists, enums, notes and authentication bodies. Added spreadsheet-safe CSV quoting, selected only needed export columns, bounded exports to 10,000 orders and required an audited, no-store response. Removed the account tracking link’s phone query parameter. Unexpected exceptions no longer reach callers or logs verbatim; explicitly public business messages still work, including changed checkout quotes. |
| **I-08 / I-09: media and URL security** | Upload independently checks live admin authorization and same origin. The server limits multipart size, file count and individual bytes, verifies MIME/signature, decodes under pixel/dimension limits, rejects unsupported/animated input detected by the decoder, and re-encodes to WebP using generated filenames. No client path is used for storage. Added a bounded HTTPS image host allowlist and safe link policies, disabled optimizer redirects/local-IP access, and set a baseline CSP for forms, framing, base URLs and objects. |
| **I-11: sensitive mutations not reliably audited** | Product changes, manual inventory changes, coupon changes, store and delivery settings, account blocking and order notes now write actor/action/target events with their mutations. Retained Phase 2 status, COD and refund events; cancellation records restored units. Admin sign-in, recovery, password changes, CLI provisioning/rotation, upload and export are recorded. Audit details omit credentials, tokens, note bodies and raw forwarded IPs. |

### Authentication and authorization details

- Registration creates a customer regardless of extra input fields. New customer passwords require 12 characters; new admin passwords require 16. A 72-byte UTF-8 ceiling prevents bcrypt truncation; new hashes use cost 12. The login provider checks the requested portal server-side without distinguishing bad passwords, unknown or blocked accounts, or role mismatch in its error. The customer UI checks whether automatic sign-in after signup actually succeeded.
- Sessions use Auth.js HttpOnly, SameSite=Lax cookies with Secure enabled in production. A valid signed/encrypted token alone is insufficient: credential changes, deactivation and role changes invalidate old versions, including edits made outside the app that change the protected `User` fields. Logout removes that session’s row, even if a copy of the old cookie is retained. Password change verifies the current credential, invalidates all sessions and outstanding recovery tokens, and directs the user to sign in again. Old pre-Phase-3 JWTs cannot gain a server session; users must sign in again after deploy.
- Protected admin pages/layouts have fresh server role checks; each admin Server Action, upload method and export handler checks independently. Customer profile, addresses, wishlist, order reading and cancellation resolve identity server-side and retain owner scope. Upload origin checks complement Auth.js CSRF protection and Next.js Server Action origin checks; do not configure a broad origin exception. Guest checkout still uses the distinct Phase 2 guest scope and the Phase 1 path-scoped receipt credential.
- Public registration, recovery, checkout, tracking, coupon quotes, reviews and newsletter actions use shared scoped limits. Set the optional IP-header environment variable only if trusted ingress overwrites it with **one** verified IP and the origin cannot be bypassed. Arbitrary forwarded headers and IP chains are not trusted by default. Monitoring records throttle events; forwarding those events into alerting is an operations task.
- Admins can detach image references in existing editors. There is **no application endpoint that physically deletes arbitrary stored or shared files**: anonymous and customer deletion calls are denied, and authenticated admin calls receive method-not-supported. Storage operators retain responsibility for deleting unreferenced assets. Failed upload batches attempt cleanup of only the assets created by that batch.

## Database changes

`prisma/migrations/20261120173000_auth_security/migration.sql` adds `User.authVersion`, a nullable recovery-token version (making older links unusable without rewriting them), indexed `AuthSession` and `SecurityRateBucket` tables, and a trigger to advance the auth version on changes to role, deactivation, password hash or email. Session handles and recovery tokens are hashed; rate-limit identifiers are keyed HMACs. No customer or order data is modified, deleted, reassigned or backfilled by the migration. Existing account/ordering operations only write when invoked by their authorized user. Staging rollout should rehearse `npm run db:deploy` and regenerate the Prisma client.

## Configuration and deployment

| Setting | Required for |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Shared PostgreSQL runtime connection; direct migration connection when using a pooler. Apply the migration before starting new instances. |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true` | A strong, shared Auth.js secret and the canonical HTTPS origin behind trusted ingress. Use the same secret across instances; do not expose it to clients. Configure ingress to accept only the intended hosts. `NEXTAUTH_URL` remains accepted for compatibility. |
| `AUTH_CLIENT_IP_HEADER` | Optional per-IP limits; configure only for an overwritten, single-IP header at trusted ingress. Identity and global limits still work without it. |
| `RESEND_API_KEY`, `PASSWORD_RESET_FROM` | **Required for live customer recovery delivery.** Use a verified sender, disable link rewriting/tracking for recovery messages, and configure HTTPS `AUTH_URL`. Without valid configuration the public request stays generic, and the app issues no undeliverable token. |
| `UPLOADTHING_TOKEN` | **Required for uploads in production.** The local filesystem fallback is development-only. Configure platform/proxy body limits compatible with the app's four-file/4 MiB-per-file cap; the hosting platform may impose a smaller request limit. |
| `MEDIA_IMAGE_HOSTS` | Optional comma-separated exact HTTPS hostnames for external images. Review existing image origins before deploying. Local `/uploads/` files and standard UploadThing CDN hosts are supported; the optimizer does not follow redirects. |
| `SHOPBD_ADMIN_EMAIL` | Set for `npm run auth:provision-admin`; pipe a strong password from a secret manager or hidden prompt, not a command argument, file committed to Git, or log. `npm run auth:provision-admin -- --rotate` explicitly rotates an existing admin. `SHOPBD_ALLOW_DEMO_SEED=1` is local demo only. |

1. Inventory current administrators with read-only access. Rotate any legacy demo admin password before opening the deployment to traffic; the migration does not silently change existing credentials. Limit database/provisioning privileges and use individual admin accounts.
2. Apply the migration, deploy all updated authentication instances together, and require a fresh sign-in. Do not send auth traffic to legacy instances that ignore revocation. Keep HTTPS, private cache and proxy/origin settings intact. Schedule `npm run auth:cleanup` regularly to remove expired sessions, rate buckets and recovery tokens.
3. Validate role boundaries, secure cookies, reset email delivery and hosted upload with isolated staging data and actual provider configuration. Review production proxy/CDN caching, image allowlists and login alerts. Continue to follow the Phase 2 district mapping and inventory rollout instructions. Do not run demo seed on staging or live datasets.

## Verification executed

| Check | Result |
| --- | --- |
| `npm test` | **15 passed**: nine previous tests plus six for authentication DTOs/byte limits, error redaction, raster validation, body limits, CSV/link policy and mail configuration. |
| `npm run test:security:db` | **10 Phase 1 subtests passed**, including separate customer ownership and guest receipt authority. |
| `npm run test:core:db` | **11 Phase 2 subtests passed**, including checkout authorization, concurrency, coupons, inventory and COD. |
| `npm run test:auth:db` | **9 Phase 3 subtests passed**: no-session action denial, role separation/foreign address denial, admin provisioning and rotation, absolute expiry/logout revocation, deactivation/role changes, atomic login throttling and audit, concurrent reset and expired/superseded-token denial, mock-provider email with hashed storage, and password change. Counts exclude suite wrappers. |
| Database migration | **All five migration SQL files applied in order** on disposable PostgreSQL. The hosted Prisma deployment command was not exercised. |
| TypeScript, ESLint and whitespace | **Passed.** ESLint: zero errors, nine existing warnings. |
| Production build | Standard `npm run build` was blocked by network access to the existing Inter font import. **Offline Webpack production build passed** using a temporary mock response; production font source was not changed. |
| Chromium on the local production build | **Passed** anonymous/customer admin denial, signup/login and logout, copied-cookie revocation, expired admin session, cross-customer order denial and private receipt checks, guest and signed-in COD checkout, invalid upload, origin checks, unauthorized deletion and admin mutation denial, admin export, generic recovery response, fragment-based reset and signed-in password change. |

The three database suites require a migrated, **disposable loopback** PostgreSQL database named `shopbd_security_test`, supplied through `SHOPBD_SECURITY_TEST_DATABASE_URL`. They write fixtures. Browser orchestration was temporary and used generated fixture data. `sharp` was promoted from Next.js’s already locked optional dependency to an explicit runtime dependency at the same version, because upload validation now directly relies on decoding and re-encoding.

## Remaining risks and limits

- Live Resend and UploadThing delivery, CDN behavior, production ingress, multi-region load, and hosted deployment permissions were not exercised. Rate limits complement, not replace, edge abuse controls; deliberate identity/network rotation and deliberate account throttling still need monitoring and response. Configure external alerting for `LOGIN_THROTTLED` and provider or DB failure signals.
- No WebAuthn/MFA, email verification at signup, or admin device-management UI was added. Short server-side admin sessions and controlled recovery reduce risk but are not MFA. Credential loss or a legacy password longer than bcrypt’s byte limit requires recovery. Registration may still reveal account existence through whether a new account can be created; the **recovery** request does not reveal it.
- Requests already authorized before a revocation may finish. During database outages authorization fails closed; if Auth.js clears the browser cookie but cannot persist logout, an already-stolen copy may remain usable on recovery until expiry or operator revocation. Use password rotation or a controlled session revoke for a suspected compromise.
- Guest tracking still uses order reference plus delivery phone and is not ownership proof. The CSP is a baseline, not a nonce-based strict script policy. Existing media references were not rewritten; audit historical URL/host configuration and retain a storage operator review for unused files.
- Audit rows are not an immutable external ledger. Operational retention, restricted audit/export access and monitoring must be configured separately. Some non-sensitive editorial audit events remain best-effort. No application claim of production readiness is made.

## Files changed

| Area | Files |
| --- | --- |
| Data, security scripts and setup | `prisma/schema.prisma`, `prisma/migrations/20261120173000_auth_security/migration.sql`, `prisma/seed.ts`, `scripts/{provision-admin,cleanup-auth}.ts`, `package.json`, `package-lock.json`, `.env.example`, `README.md` |
| Authentication and request security | `src/lib/{auth,auth.config,shared-rate-limit,request-security,errors,prisma,audit}.ts`, removed unused `src/lib/rate-limit.ts`, `src/types/next-auth.d.ts`, `src/proxy.ts`, `src/lib/validations/{auth,admin,customer}.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/services/{auth-security,reset-mail}.ts` |
| Actions and mutation services | `src/server/actions/{account,admin,customer}.ts`, `src/server/repositories/settings.repo.ts`, `src/server/services/{account,checkout-pricing,content,customer,homepage,order,product,reports}.*` |
| Media/export/link security | `src/app/api/{upload,admin/orders/export}/route.ts`, `src/server/services/upload-image.ts`, `src/lib/{csv,safe-urls}.ts`, `next.config.ts`, `src/components/admin/image-uploader.tsx`, `src/components/customer/{header-footer,hero-banner,newsletter-cta,social-feed}.tsx`, shop homepage and account order detail |
| Authentication UI | `src/app/admin/login/page.tsx`, `src/components/customer/auth-forms.tsx`, `src/components/shared/change-password-form.tsx`, shop reset-password/account pages and admin settings |
| Regression and handoff | `tests/auth-security.test.ts`, `tests/auth-security.integration.ts`, `PHASE_3_SECURITY_REPORT.md` |
