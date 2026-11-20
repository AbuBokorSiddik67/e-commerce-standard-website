import { unstable_rethrow } from "next/navigation";

export class PublicError extends Error {}

const PRISMA_CONNECTION_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function isPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return (
    (typeof name === "string" && name.startsWith("Prisma")) ||
    /^P\d{4}$/.test(errorCode(error) ?? "")
  );
}

/** Log classification only. Never serialize exceptions, request values, URLs or stacks. */
export function logError(scope: string, error: unknown): void {
  const code = errorCode(error);
  const kind = code && /^P\d{4}$/.test(code) ? code : error instanceof PublicError ? "rejected" : "unexpected";
  if (kind !== "rejected") console.error(`[store:${scope}]`, { kind });
}

/**
 * Turns an unknown thrown value into a message that is safe to show to a customer.
 * Database/network failures are translated to friendly copy instead of leaking
 * internals or stack traces.
 */
export function friendlyError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const code = errorCode(error);

  if (isPrismaError(error)) {
    if (code && PRISMA_CONNECTION_CODES.has(code)) {
      return "Our store is temporarily unavailable. Please try again in a moment.";
    }
    if (code === "P2002") {
      return "This value already exists. Please use a different one.";
    }
    if (code === "P2025") {
      return "We couldn't find what you were looking for. Please refresh and try again.";
    }
    if (code === "P2003") {
      return "This item is still in use and can't be removed right now.";
    }
    return fallback;
  }

  if (error instanceof PublicError && error.message) {
    const message = error.message.trim();
    if (message.length > 0 && message.length <= 160 && !message.includes("\n")) {
      return message;
    }
  }

  return fallback;
}

/**
 * Logs the real error and returns a user-safe message. Use this at the end of
 * catch blocks in server actions.
 */
export function actionErrorMessage(
  scope: string,
  error: unknown,
  fallback: string,
): string {
  logError(scope, error);
  return friendlyError(error, fallback);
}

/**
 * Runs a data-loading function and degrades gracefully on failure.
 *
 * Next.js control-flow errors (`redirect()`, `notFound()`, etc.) are re-thrown so
 * navigation keeps working, while real backend errors are logged and replaced
 * with the supplied fallback value instead of crashing the page.
 */
export async function safe<T>(
  scope: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    unstable_rethrow(error);
    logError(scope, error);
    return fallback;
  }
}

/**
 * Same as `safe`, but returns `null` when the operation fails.
 */
export async function safeOrNull<T>(
  scope: string,
  run: () => Promise<T>,
): Promise<T | null> {
  return safe(scope, run, null);
}

/**
 * Like `safe`, but reports whether the operation succeeded. Useful when a
 * page needs to distinguish "no data" from "the backend failed".
 */
export async function attempt<T>(
  scope: string,
  run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; value: undefined }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    unstable_rethrow(error);
    logError(scope, error);
    return { ok: false, value: undefined };
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
