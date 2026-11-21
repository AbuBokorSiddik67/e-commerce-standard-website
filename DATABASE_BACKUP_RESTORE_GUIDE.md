# ShopBD PostgreSQL backup, migration and recovery

Never test a restore over the active production DB. Steps below are for authorized operators and an isolated restore target. Protect customer data, password hashes, CSVs, receipt grants and session records as confidential. A backup contains all of them.

## Before a release

1. Record the deployed commit, schema migration status, PostgreSQL major version, DB region, RPO/RTO, owners and storage provider snapshot IDs. Verify managed PITR coverage and retention; select a restore point before the migration. Plan a quiet window for ordinary Phase 5 `CREATE INDEX` operations; they may block writers on large tables. Budget available disk, time and connections.
2. For a logical backup, use a compatible `pg_dump` client (server major or newer). Supply host, database, user, TLS mode and password via controlled `PGSERVICE`/`PGPASSFILE` or secret manager. Service labels below are placeholders, not credentials. Do not use connection secrets in shell arguments or logs. Set owner-only file permissions and an encrypted destination with restricted access.
   ```sh
   umask 077
   pg_dump --dbname=service=shopbd_backup -Fc --file=shopbd-before-release.dump
   pg_restore --list shopbd-before-release.dump > shopbd-before-release.toc
   sha256sum shopbd-before-release.dump > shopbd-before-release.sha256
   ```
   Confirm exit status, size and artifact checksum; store encrypted with retention/expiry. Verify roles, grants and media objects separately (database backup does not include role management or UploadThing objects). Restore drills may use synthetic fixture backups, or approved encrypted data in a restricted recovery environment only.
3. Create a **new, empty, isolated** recovery database at a compatible major version. Independently confirm host, database, project and that no public app uses it. Restore without cleanup/drop options:
   ```sh
   sha256sum --check shopbd-before-release.sha256
   pg_restore --dbname=service=shopbd_isolated_restore --exit-on-error --single-transaction --no-owner --no-privileges shopbd-before-release.dump
   ```
   Reapply controlled least-privilege grants separately. For a managed snapshot or PITR, create a new branch/instance instead of rewinding an active database. Preserve an audit record of steps and measured restore time.
4. Validate expected migration history (`_prisma_migrations` and `npx --no-install prisma migrate status`), schemas, indexes, FK/constraint states, aggregate row counts/amounts, and a few authorized synthetic workflows; never print customer rows to logs. Keep external mail/uploads disabled or pointed at staging accounts. Check that order/stock/coupon IDs and historical totals match, private access remains enforced, and media references resolve. Establish the procedure for revoking revived sessions/reset tokens safely before a restored DB is ever reopened to users.

## Apply migrations

1. Run `npm run db:deploy` against the **direct** connection in exactly one controlled release job; check `prisma migrate status` and archive its sanitized result. Do not edit applied migration files, run `db push`, or use development/reset procedures on a deployed database. Test deployment and repeat no-op on a disposable database first, then stage on a target-sized clone.
2. Sequence: migration on compatible schema → app rollout → smoke and health checks. Do not re-introduce any pre-receipt, pre-transaction, or pre-session-revocation builds. The six existing migrations include additive changes; Phase 6 introduces no new migration. Migration application is separate from app startup.

## Incident / failed migration decision tree

1. Stop deployment and disable new commerce writes if state is uncertain. Retain current data and release logs; take a fresh incident snapshot. Record failed step/migration and whether any statements completed. Do not assume an entire migration file was atomic. Never automatically run migration resolution commands or retry against a partly applied schema.
2. If the previous application is secure and compatible with the resulting schema, revert the **app** first and smoke-test. Keep additive indexes and migration history. If a failed migration left objects or data changes, a DBA must compare the actual catalog and migration history on an isolated copy before deciding to forward-fix or reconcile using Prisma's reviewed resolution procedure. Record why a migration is marked applied/rolled back, and rerun status; never use resolution to hide drift.
3. If restore is required, restore to a **separate** target, run the validation above, and explicitly reconcile orders, inventory, coupon redemptions, COD collections and audit events between the restore point and write freeze. Do not blindly re-run checkout or lose accepted orders. Invalidate revived auth sessions and recovery credentials and review guest receipt/cookie expiry. Obtain operator sign-off before moving traffic, and preserve the old database read-only under access control until reconciliation completes.

**Verification boundary:** Disposable SQL replay and the commerce/security suites are not a backup/restore drill. A native Prisma deploy rehearsal, actual managed backup/PITR restore, target-scale index timing, recovery objectives and write reconciliation require operator evidence before release.
