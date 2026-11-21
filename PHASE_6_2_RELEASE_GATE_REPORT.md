# ShopBD Phase 6.2 — CI release gate, native migration and advisory resolution

**Release status: BLOCKED.** Both dependency audits fail on an unresolved moderate advisory. No authorized security-owner approval or hosted staging results are recorded. ShopBD is not staging-verified or approved for production. No hosted staging or production service was contacted or changed; no merge or next phase was initiated.

## 1. Baseline and exact candidate

| Item | Status | Evidence |
|---|---|---|
| Working branch and baseline | PASS | `arena/b683cdb1-e-commerce-standard-website` started clean at `176292c3dbfa87d0b33ae4ff66ac6cba7223a8e4`, exactly equal to the remote `AI-Agent` tip at baseline check. The branch had no remote ref before this phase's normal CI push. |
| Phase 6.1 integration | PASS | GitHub reports [PR #12](https://github.com/AbuBokorSiddik67/e-commerce-standard-website/pull/12) `MERGED` at `176292c3dbfa87d0b33ae4ff66ac6cba7223a8e4`. The Git commit's second parent is the Phase 6.1 head `e671866623526bbb7d9967c3d52a34d2e5fe6dc0`. Fetch by SHA, `git cat-file -p HEAD`, tree comparison and `git diff --exit-code HEAD FETCH_HEAD` proved parity: both trees are `d5c3d2c9ac4fa10835c39ea73024a25198d5d498`. No Phase 6.1 changes were missing. |
| Phase 6.2 CI candidate | PASS | Local and remote branch: `c2b1f390430819c5ae9ac1e6918814558fb0cc67` (tree `0fa98fbe6d407ed75a338cc9534c821331bd197c`). The release-input commit changes only `.github/workflows/release-checks.yml`. This report documents that commit and is not part of the tested tree. No app source, schema, migrations, dependencies or lockfile changed in Phase 6.2. |

Reviewed the [Phase 6 report](PHASE_6_PRODUCTION_READINESS_REPORT.md) and [Phase 6.1 report](PHASE_6_1_STAGING_VERIFICATION_REPORT.md). Historical [Phase 6.1 run 44871723257](https://github.com/AbuBokorSiddik67/e-commerce-standard-website/actions/runs/44871723257) reported successful install, native deploy/history/no-op/restore, DB suites and build for `e671866…` (GitHub job API, job `136747502650`). Raw log download returned EOF; this historical result does not establish Phase 6.2 status.

## 2. Native Prisma deployment and migration verification

**Sandbox: BLOCKED.** Plain `npm ci` used Node `22.22.3` and npm `10.9.8`. It exited 1 during `postinstall` (`prisma generate`) on the official `debian-openssl-3.0.x/schema-engine.gz.sha256` request, engine revision `d1b3f377ca835d73fd50954a5e22128b9ebdd6b8`: `Client network socket disconnected before secure TLS connection was established`. No TLS, integrity check, or engine overrides; no SQL replay was used or substituted. GitHub-hosted Actions is the authorized route for the native gate.

**GitHub Actions: PASS.** The [verify job, 136750203158](https://github.com/AbuBokorSiddik67/e-commerce-standard-website/actions/runs/44872590297/job/136750203158) checked out `c2b1f390430819c5ae9ac1e6918814558fb0cc67`, asserted project Node `22.22.3`, and completed plain `npm ci` and native `npm run db:deploy` using the locked Prisma `7.10.1` and fresh PostgreSQL `16.16` (`server_version_num=160016`). Its shell asserted the public schema was empty before deploy. No alternate engine or TLS/checksum override was configured. Job metadata and the `Native migration evidence` annotation confirm all six rows passed name, checksum and completion checks; `npx --no-install prisma migrate status` was up to date. The second `npm run db:deploy` exited successfully, matched `No pending migrations to apply.` and produced unchanged verifier output.

- Source verifier: **26 relations, 54 constraints, 75 indexes** (including native migration history). Fingerprint: `2e4eb347a3a01e7bf8ccb146466e9b759411789430057b8af0f44005522e4ce0`.
- Locked `package-lock.json` SHA-256: `a2efe28991873794f30ea356a0636b821f4e2d247af4eb66e04ed96424604e17`.
- Evidence job API: `gh api repos/AbuBokorSiddik67/e-commerce-standard-website/check-runs/136750203158/annotations`. The notices were read directly, not inferred from a prior run.

The read-only verifier requires one row per on-disk migration and compares the recorded checksum to SHA-256 of each migration SQL file. It checks for completed/non-rolled-back migrations and includes history, columns, enums, constraints, indexes, triggers and the synthetic fixture in a stable fingerprint. Expected migration names:

```text
20261117111805_init
20261117132539_add_order_item_variant_id
20261120153000_add_guest_receipt_grant
20261120163000_core_checkout_integrity
20261120173000_auth_security
20261120190000_catalog_query_indexes
```

## 3. Native backup and restored-database validation

**PASS — GitHub Actions, exact candidate.** The source was built by native deploy, then seeded with one synthetic product. `pg_dump -Fc` produced a 62,242-byte archive in **519 ms**. `sha256sum --check` passed for `50efcf3457e84c1a9776e80282df285c676602b6138a3ef374feb633df30c44e`. `pg_restore --list` parsed the TOC and found the `_prisma_migrations` table data. `pg_restore --exit-on-error --single-transaction --no-owner --no-privileges` restored into a separate new database (`shopbd_security_test`) in **109 ms**.

The restored verifier output matched the source byte for byte, including the fingerprint over history/checksums, catalog, constraints, indexes, auth trigger and fixture. Native `prisma migrate status` against the restored URL independently reported up to date. All three database regression suites passed on the restore. The migration and restore notices and job-step statuses are available via the API above. Phase 6.1's local 135 ms measurement concerned a different SQL-replay archive and is not a comparable speed benchmark.

Backup and restore measurements cover the respective commands (including Docker command overhead), not database provisioning, retention, artifact transfer, app recovery, grants, provider storage or production RTO/RPO. No real customer or production data was involved.

## 4. Security advisory and audits

| Scope | Phase 6.1 candidate | Phase 6.2 local | Phase 6.2 hosted CI |
|---|---|---|---|
| `npm audit --omit=dev` | 2 moderate, 0 high/critical | FAIL — exit 1, 2 moderate, 0 high/critical | FAIL — same counts and exit 1, [production audit job](https://github.com/AbuBokorSiddik67/e-commerce-standard-website/actions/runs/44872590297/job/136750202953) |
| `npm audit` | 2 moderate, 0 high/critical | FAIL — exit 1, 2 moderate, 0 high/critical | FAIL — same counts and exit 1, [full audit job](https://github.com/AbuBokorSiddik67/e-commerce-standard-website/actions/runs/44872590297/job/136750203102) |

The two entries are `@effect/platform` and its affected dependent `uploadthing`: **one** distinct advisory, [GHSA-chp3-j5qr-2vfr](https://github.com/advisories/GHSA-chp3-j5qr-2vfr). It concerns insufficient validation of cookie name, path and domain attributes. GitHub lists affected `@effect/platform >=0.1.0 <0.97.1` (first patched `0.97.1`). The advisory also lists `effect >=4.0.0-beta.0 <4.0.0-beta.103`, not this application's installed Effect `3.22.5`.

- `npm view uploadthing dist-tags`, version history and dependency metadata showed latest stable `7.7.4` pins `@effect/platform@0.90.3`; the canary (`7.7.3-canary.112f5c8`) pins `0.85.2`. `npm ls uploadthing @effect/platform effect --omit=dev --all` and the lockfile confirm the installed `7.7.4 → 0.90.3` path. The installed packages were available for inspection after the local root postinstall failed. No compatible upstream fix was found. An unvalidated jump to a different `0.x` minor or the forced UploadThing `6.13.3` downgrade suggested by the current npm audit was not made. No audit output was ignored or suppressed.
- `src/app/api/upload/route.ts` checks a live admin session, same origin, request caps and normalized raster before `UTApi.uploadFiles`. The compensated failure path calls `UTApi.deleteFiles`; the app uses `ufsUrl`. Both SDK paths exercise outbound HTTP, separate from Auth.js cookie generation. Source review found no effect-platform server cookie writer receiving caller attributes on these paths. That is not a proof of non-exploitability, nor proof of provider behavior.

**MANUAL ACTION REQUIRED — request a security-owner disposition.** Owner: **not assigned** (repository owner to name the accountable security approver). Decision: **pending**; no acceptance was granted. Rationale for review: reachable authenticated SDK client path but no identified application use of the affected cookie writer; no supported patched SDK; residual and future code-path risks remain. Requested initial review deadline: **2026-11-27 UTC or before a release review, whichever is earlier**; proposed deadline, not an approved exception. Record the actual named owner, decision, scope, rationale, expiration, upstream monitoring owner and next review date in the release record. Prefer a supported SDK fix and rerun audits, locked build and staging media checks. If an exception is proposed, this report and workflow do not implement one: both audit jobs remain strict; any change to the release policy requires separately reviewed authorization. Keep production blocked.

## 5. Workflow and regression evidence

[Release checks, run 44872590297](https://github.com/AbuBokorSiddik67/e-commerce-standard-website/actions/runs/44872590297) was triggered by pushing the current branch, not by touching `main` or `AI-Agent`. The workflow explicitly checks out the candidate commit (`pull_request.head.sha` for PR events; `github.sha` for pushes/dispatch) and asserts SHA and `.nvmrc` version. It uses PostgreSQL 16 and official Prisma download behavior; permissions are read-only and checkout does not persist credentials. `set -euo pipefail` preserves pipeline errors. The audit jobs run independently so failures cannot hide migration/restore/regression results or cancel the other audit. Audit failures propagate, and workflow artifacts contain only selected counts/advisories, toolchain and database verification summaries—not the DB dump, raw npm JSON/error bodies or environment values. YAML parsed and all inline shell blocks passed `bash -n` locally.

| Gate / command | Current candidate status | Comparison with Phase 6.1 |
|---|---|---|
| Plain `npm ci` | PASS in CI; BLOCKED in sandbox | The sandbox still cannot reach Prisma's CDN; the authorized runner used the unmodified install path. |
| `npm test` | PASS in CI | Same test files as Phase 6.1 (24 local tests), including mocked UploadThing upload/cleanup and raster/media validation. Job API confirms success; raw TAP totals were not retrieved. |
| `npm run typecheck` and `npm run lint` | PASS in CI | Same three unused-symbol lint warnings (`saveCategoryAction`, `_`, `actionTypes`); no new lint failure. |
| `npm run build` | PASS in CI | Same production-build command as Phase 6.1; no deployment. |
| Native migration, history, repeat and restore | PASS in CI | Phase 6.1 local coverage did not contain native history; current run proves all these gates on the exact Phase 6.2 commit. |
| Security, core commerce and auth DB suites | PASS in CI on native restore | Same suites as Phase 6.1 (10, 11 and 9 substantive subtests respectively); prior local results ran on an SQL-replay restore. |
| Production and full audits | FAIL locally and in CI | Same 2 moderate package entries each; now independently enforced. |
| Release Checks run outcome | FAIL | `verify` passed; both audit jobs failed and the overall workflow failed, as required. |

GitHub artifact metadata confirmed all three uploads for this SHA: native evidence `14694482319`, production audit `14694895806`, full audit `14695015515` (14-day retention). Artifact and raw-log download redirects returned EOF in the sandbox; the exact verification assertions, durations and audit totals above are supported by the job step statuses and accessible sanitized GitHub annotations. On an authorized machine, fetch retained artifacts with `gh run download 44872590297`; do not retain any DB archive as a CI artifact.

For repository-level enforcement, the repository owner should require `verify`, `Audit (production)` and `Audit (full)` for changes to `AI-Agent`. Existing branch-control policy was not modified or asserted by this phase. GitHub annotations reported the v4 Actions' Node 20 runtime deprecation/automatic runner fallback to Node 24; that is distinct from the pinned project Node checked by the workflow. Track supported Actions upgrades within the CI maintenance process.

## 6. Staging access and status

No authorized staging hostname, credentials, provider projects, DB role grant or control-plane access were supplied. Local configuration has only `.env.example`; no relevant runtime env variable names were present when checked. Firefox/WebKit executables and a Playwright browser cache were not found. GitHub Actions authorization applied only to the disposable DB/test jobs. **Hosted staging checks completed: none.** The following actions require authorization and synthetic data; no production credentials or endpoints should be used.

| Staging gate | Status | Exact action and expected result |
|---|---|---|
| Resend recovery | NOT TESTED | Set `RESEND_API_KEY` and `PASSWORD_RESET_FROM` in the staging secret manager for a verified staging sender. Use an owned inbox and two synthetic identifiers (existing and unknown); check generic outward responses. Verify one delivered HTTPS fragment link, complete the reset within 20 minutes, then reject replay, superseded and expired links; old password and sessions fail, new password succeeds. Verify redaction on an authorized provider failure. Do not save reset URLs. |
| UploadThing upload/retrieval/cleanup | NOT TESTED | Use an isolated project and `UPLOADTHING_TOKEN`; sign in as a staging admin, upload a small JPEG/PNG that becomes WebP, attach it to a fixture product, verify raw and optimized HTTPS URLs after restart. Verify unauthorized, cross-origin and invalid/oversize requests are rejected. Simulate a fixture-only failure and confirm compensated cleanup in the isolated project; remove the test reference and object per policy. |
| Remote PostgreSQL TLS and roles | NOT TESTED | Use approved `sslmode=verify-full`, CA trust and DNS for separate DDL (`DIRECT_URL`, release job only) and runtime (`DATABASE_URL`, least privilege) identities. Verify live TLS using `SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()` on each role, and require a rejected wrong CA/hostname in a dedicated test connection. Inspect grants, validate runtime reads/writes and absence of DDL rights; check connection budget with replica overlap. |
| HTTPS/Auth.js and ingress | NOT TESTED | Set matching canonical HTTPS `AUTH_URL` and `NEXT_PUBLIC_APP_URL`. Verify TLS, HTTP redirects, host allowlist, overwritten forwarded headers, origin isolation and HSTS policy at the real ingress. Test customer/admin Credentials callbacks, secure cookies, logout and wrong-role access. Alternate inbound host/proto/client headers must not alter cookie scope, callback origin or IP-based controls. |
| CDN and cache isolation | NOT TESTED | Compare two independent browser contexts at the real edge for account, admin, auth, cart/checkout, tracking, reset and receipt requests. Check `Cache-Control`, `Age`/cache status, cookies and bodies: no shared hit or cross-user content. Recheck asset/image variants and public tag invalidation across replicas after a synthetic catalog/settings change. |
| Replica admission and recovery | NOT TESTED | Require HTTP 200 readiness, not TCP/log readiness. Start one invalid staging replica and verify no admission and a failed rollout. Pause only the isolated staging DB: live stays 200, ready becomes 503, traffic is removed, then readiness recovers. Roll one replica with an active synthetic request; verify drain/timeout, replacement and no duplicate writes. Local Phase 6.1 observed Next still listening after config refusal; do not infer hosted behavior. |
| Monitoring and alerts | NOT TESTED | Route staging probe/5xx/throttle/mail/upload/pool signals to a reviewed staging alert destination. Trigger controlled events, confirm receipt and resolution, and verify no auth headers, cookie values, receipt/reset tokens, DB URIs, raw addresses or phone numbers in logs. Record responders and retention. |
| Firefox and WebKit | NOT TESTED | On an approved runner run `npx playwright install --with-deps firefox webkit` within QA tooling. On the authorized staging URL replay register/sign-in/out, catalog, keyboard variant/cart/COD, anonymous versus owner receipts, tracking, admin order/cancel, labels, validation, focus order/return and reduced-motion/responsive layouts. Capture browser versions and redacted outcomes; this is not a full accessibility audit. |

See the [Phase 6.1 staging plan](PHASE_6_1_STAGING_VERIFICATION_REPORT.md#6-ordered-hosted-staging-acceptance) and [deployment guide](PRODUCTION_DEPLOYMENT_GUIDE.md). Stage with dedicated secrets, test-size synthetic data, protected access and no client/production interchange.

## 7. Required next actions

1. Assign a security owner, record their disposition and deadline or upgrade to a supported patched SDK. Rerun `npm audit --omit=dev` and `npm audit`; do not bypass failed checks.
2. For any new code/workflow revision, push only that candidate branch or open a reviewed PR to `AI-Agent`, then verify the run's `head_sha` and toolchain evidence. In a standalone reproduction, use an approved runner with HTTPS/CA trust, Node from `.nvmrc`, PG16 and two disposable DBs. Use the exact commands in the release workflow: plain `npm ci`, native deploy/status/repeat, `verify-release-db.ts` on the source, `pg_dump -Fc` + checksum/TOC, single-transaction restore into the other empty DB, verifier/status on restore, then all three DB suites using only the restored loopback DB. Never bypass checksums or accept SQL replay as native proof.
3. Obtain authorization for the staging endpoints and execute §6; use the [backup/restore runbook](DATABASE_BACKUP_RESTORE_GUIDE.md) if a target-sized rehearsal is authorized. Record results against the reviewed SHA. Do not merge automatically or deploy. Separate explicit production approval is required after all mandatory gates pass.
