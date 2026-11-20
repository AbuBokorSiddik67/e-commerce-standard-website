export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || req.headers.get("sec-fetch-site") === "cross-site") return false;
  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (!base && process.env.NODE_ENV === "production") return false;
  try { return origin === new URL(base ?? req.url).origin; }
  catch { return false; }
}

export class BodyLimitError extends Error {}

export async function readBoundedBody(req: Request, max: number) {
  const length = req.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new BodyLimitError();
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        void reader.cancel().catch(() => {});
        throw new BodyLimitError();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
