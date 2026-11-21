type Environment = Readonly<Record<string, string | undefined>>;

export const DEFAULT_DB_POOL_MAX = 5;

function httpsOrigin(value: string | undefined): string | undefined {
  if (!value || !/^https:\/\//i.test(value) || value !== value.trim() || /[?#\\]/.test(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/') return url.origin;
  } catch { /* Report the variable name, not the supplied value. */ }
}

function databaseUrlValid(value: string | undefined) {
  if (!value || value !== value.trim()) return false;
  try {
    const url = new URL(value);
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.hostname || !url.username || !/^\/[^/]+$/.test(url.pathname) || url.hash) return false;
    // Do not accept query overrides for the validated authority or contradictory TLS modes.
    const disallowed = new Set(['host', 'hostaddr', 'port', 'user', 'password', 'dbname', 'database', 'ssl']);
    if ([...url.searchParams.keys()].some(key => disallowed.has(key.toLowerCase()))) return false;
    const modes = url.searchParams.getAll('sslmode');
    const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname.toLowerCase());
    return modes.length <= 1 && (modes[0] === 'verify-full' || (loopback && (modes.length === 0 || modes[0] === 'disable')));
  } catch { return false; }
}

function configuredPoolMax(value: string | undefined) {
  if (!value || !/^[1-9][0-9]?$/.test(value)) return undefined;
  const size = Number(value);
  return size <= 50 ? size : undefined;
}

export function databasePoolMax(value: string | undefined) {
  return configuredPoolMax(value) ?? DEFAULT_DB_POOL_MAX;
}

export function productionConfigIssues(env: Environment): string[] {
  const issues: string[] = [];
  if (!databaseUrlValid(env.DATABASE_URL)) issues.push('DATABASE_URL: PostgreSQL URL with a database name and sslmode=verify-full for remote hosts');
  const authUrl = httpsOrigin(env.AUTH_URL);
  const appUrl = httpsOrigin(env.NEXT_PUBLIC_APP_URL);
  if (!authUrl) issues.push('AUTH_URL: absolute HTTPS origin');
  if (!appUrl) issues.push('NEXT_PUBLIC_APP_URL: absolute HTTPS origin');
  if (authUrl && appUrl && authUrl !== appUrl) issues.push('AUTH_URL and NEXT_PUBLIC_APP_URL must identify the same origin');
  if (env.NEXTAUTH_URL && httpsOrigin(env.NEXTAUTH_URL) !== authUrl) issues.push('NEXTAUTH_URL: remove the legacy value or match AUTH_URL');
  const secret = env.AUTH_SECRET;
  if (!secret || secret.trim() !== secret || Buffer.byteLength(secret) < 32 || /^generate-with:/i.test(secret)) issues.push('AUTH_SECRET: generate a fresh random secret of at least 32 bytes');
  if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET !== secret) issues.push('NEXTAUTH_SECRET: remove the legacy value or match AUTH_SECRET');
  if (env.AUTH_TRUST_HOST !== 'true') issues.push('AUTH_TRUST_HOST: set true only behind an ingress that validates and overwrites host headers');
  if (env.AUTH_CLIENT_IP_HEADER && !/^[a-zA-Z0-9-]+$/.test(env.AUTH_CLIENT_IP_HEADER)) issues.push('AUTH_CLIENT_IP_HEADER: expected a single approved header name');
  if (Boolean(env.RESEND_API_KEY?.trim()) !== Boolean(env.PASSWORD_RESET_FROM?.trim())) issues.push('RESEND_API_KEY and PASSWORD_RESET_FROM must be configured together');
  if (env.DB_POOL_MAX !== undefined && !configuredPoolMax(env.DB_POOL_MAX)) issues.push('DB_POOL_MAX: integer from 1 to 50');
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') issues.push('NODE_TLS_REJECT_UNAUTHORIZED: TLS verification must stay enabled');
  if (env.SHOPBD_ALLOW_DEMO_SEED === '1') issues.push('SHOPBD_ALLOW_DEMO_SEED: disabled in deployed environments');
  return issues;
}

export function assertProductionConfig(env: Environment = process.env) {
  const issues = productionConfigIssues(env);
  if (issues.length) throw new Error(`[shopbd:config] Production startup refused:\n- ${issues.join('\n- ')}`);
}
