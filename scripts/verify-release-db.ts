/** Inspect native migration history and catalog on a disposable loopback DB. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

async function inspect() {
  const input = process.env.SHOPBD_RELEASE_DB_URL;
  if (!input) throw new Error('Missing SHOPBD_RELEASE_DB_URL');
  const url = new URL(input);
  const name = url.pathname.slice(1);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) ||
      !['shopbd_release_source', 'shopbd_security_test'].includes(name) || url.search || url.hash) {
    throw new Error('A disposable loopback shopbd_release_source or shopbd_security_test database is required');
  }
  const db = new pg.Client({ connectionString: input, connectionTimeoutMillis: 5_000, statement_timeout: 10_000 });
  await db.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const identity = await db.query<{ name: string }>('SELECT current_database() AS name');
    assert.equal(identity.rows[0]?.name, name);
    const history = (await db.query(`SELECT id, checksum, migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
      FROM public._prisma_migrations ORDER BY migration_name, id`)).rows;
    const dir = new URL('../prisma/migrations/', import.meta.url);
    const expected = (await readdir(dir, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    assert.deepEqual(history.map(row => row.migration_name), expected, 'Unexpected migration rows');
    for (const row of history) {
      assert(row.started_at && row.finished_at && !row.rolled_back_at && row.applied_steps_count > 0, 'Incomplete or rolled-back migration');
      assert.equal(row.checksum, sha256(await readFile(new URL(`${row.migration_name}/migration.sql`, dir))), 'Migration checksum mismatch');
    }
    const tables = (await db.query(`SELECT table_name, column_name, ordinal_position, udt_name, column_default, is_nullable,
      character_maximum_length, numeric_precision, numeric_scale, datetime_precision, is_identity, is_generated
      FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`)).rows;
    const constraints = (await db.query(`SELECT t.relname AS relation, c.conname AS name, c.contype AS kind, c.convalidated AS validated,
      pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY relation, name`)).rows;
    const indexes = (await db.query(`SELECT i.relname AS name, x.indisvalid AS valid, pg_get_indexdef(i.oid) AS definition
      FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=i.relnamespace
      WHERE n.nspname='public' ORDER BY name`)).rows;
    const triggers = (await db.query(`SELECT c.relname AS relation, t.tgname AS name, pg_get_triggerdef(t.oid) AS definition,
      pg_get_functiondef(t.tgfoid) AS function FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY relation, name`)).rows;
    const enums = (await db.query(`SELECT t.typname AS name, e.enumlabel AS label FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY name, e.enumsortorder`)).rows;
    assert(constraints.some(c => c.kind === 'f'), 'No public foreign keys');
    for (const name of ['Product_nonnegative_stock', 'ProductVariant_nonnegative_stock']) {
      assert(constraints.some(c => c.name === name && c.kind === 'c'), 'Missing inventory check');
    }
    for (const name of ['Product_active_created_id_idx', 'Product_active_price_id_idx', 'ProductImage_product_sort_id_idx', 'Review_product_approved_created_id_idx', 'Order_status_placed_idx']) {
      assert(indexes.some(i => i.name === name && i.valid), 'Missing or invalid Phase 5 index');
    }
    assert(triggers.some(t => t.name === 'shopbd_user_auth_version'), 'Missing auth version trigger');
    const fixture = (await db.query(`SELECT id, slug, price::text, stock FROM public."Product" WHERE id = 'release-verification-fixture'`)).rows;
    assert.deepEqual(fixture, [{ id: 'release-verification-fixture', slug: 'release-verification-fixture', price: '91.25', stock: 7 }], 'Backup fixture not found or changed');
    await db.query('COMMIT');
    // Stable across databases, compares the full history (including timestamps and IDs).
    console.log(JSON.stringify({ migrations: expected, relations: new Set(tables.map(r => r.table_name)).size, constraints: constraints.length,
      indexes: indexes.length, fingerprint: sha256(JSON.stringify({ history, tables, constraints, indexes, triggers, enums, fixture })) }));
  } finally { await db.end(); }
}

inspect().catch(error => {
  // Neither DB URLs, DB driver errors nor receipt/order/credential values are logged.
  console.error('Release database verification failed.', error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Check disposable database setup and native migration history.');
  process.exitCode = 1;
});
