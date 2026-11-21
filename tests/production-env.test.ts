import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertProductionConfig, databasePoolMax, productionConfigIssues } from '../src/lib/production-env';

const valid = {
  DATABASE_URL: 'postgresql://runtime:fixture@db.example.invalid/shopbd?sslmode=verify-full',
  AUTH_SECRET: 'synthetic-fixture-not-a-production-secret-12345',
  AUTH_URL: 'https://shop.example.invalid/',
  NEXT_PUBLIC_APP_URL: 'https://shop.example.invalid',
  AUTH_TRUST_HOST: 'true',
};

test('production requires valid database, HTTPS and authentication configuration', () => {
  assert.doesNotThrow(() => assertProductionConfig(valid));
  assert.throws(() => assertProductionConfig({}), /DATABASE_URL[\s\S]*AUTH_URL[\s\S]*AUTH_SECRET/);
  assert.throws(() => assertProductionConfig({ ...valid, AUTH_URL: 'http://shop.example.invalid' }), /AUTH_URL/);
  assert.throws(() => assertProductionConfig({ ...valid, NEXT_PUBLIC_APP_URL: 'https://other.example.invalid' }), /same origin/);
  assert.throws(() => assertProductionConfig({ ...valid, NEXTAUTH_URL: 'https://other.example.invalid' }), /NEXTAUTH_URL/);
  assert.throws(() => assertProductionConfig({ ...valid, AUTH_SECRET: 'generate-with: openssl rand -base64 32' }), /AUTH_SECRET/);
});

test('production rejects unsafe DB options and requires complete optional pairs', () => {
  assert.throws(() => assertProductionConfig({ ...valid, DATABASE_URL: valid.DATABASE_URL.replace('verify-full', 'require') }), /DATABASE_URL/);
  assert.throws(() => assertProductionConfig({ ...valid, DATABASE_URL: valid.DATABASE_URL + '&host=elsewhere.invalid' }), /DATABASE_URL/);
  assert.doesNotThrow(() => assertProductionConfig({ ...valid, DATABASE_URL: 'postgres://runtime:fixture@127.0.0.1:1234/shopbd' }));
  const issues = productionConfigIssues({ ...valid, RESEND_API_KEY: 'sensitive-input-example', SHOPBD_ALLOW_DEMO_SEED: '1', NODE_TLS_REJECT_UNAUTHORIZED: '0', DB_POOL_MAX: '999' });
  assert.equal(issues.length, 4);
  assert(!issues.join(' ').includes('sensitive-input-example'));
  assert.equal(databasePoolMax('7'), 7);
  assert.equal(databasePoolMax(undefined), 5);
});
