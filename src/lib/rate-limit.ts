import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, resetAt: now + windowMs };
  }
  if (bucket.count >= max) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count++;
  return { success: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}

export function rateLimitResponse(req: NextRequest, key: string, max: number, windowMs: number) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const result = rateLimit(`${key}:${ip}`, max, windowMs);
  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) },
      },
    );
  }
  return null;
}
