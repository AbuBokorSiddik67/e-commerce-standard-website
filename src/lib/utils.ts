import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a positive integer from untrusted input (URL params, form values).
 * Returns the fallback for NaN, Infinity, zero, or negative values so these
 * values can never be passed into Prisma as an invalid `skip`/`take`.
 */
export function toPositiveInt(value: unknown, fallback: number, max = 10_000): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

/**
 * Parses an optional finite number. Returns `undefined` for blank/invalid input.
 */
export function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Returns a valid Date or the fallback when the input cannot be parsed.
 */
export function toValidDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function formatCurrency(amount: number | string, symbol = "৳") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${symbol}0`;
  return `${symbol}${num.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${y}${m}${d}-${rand}`;
}

export function calculateDiscount(
  subtotal: number,
  coupon: { type: "PERCENTAGE" | "FIXED"; value: number; minOrderAmount?: number | null } | null,
): number {
  if (!coupon) return 0;
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) return 0;
  if (coupon.type === "PERCENTAGE") {
    return Math.round((subtotal * Number(coupon.value)) / 100);
  }
  return Math.min(Number(coupon.value), subtotal);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
