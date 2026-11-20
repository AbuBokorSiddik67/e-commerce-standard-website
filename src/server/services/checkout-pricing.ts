import { PublicError } from "@/lib/errors";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { cartQuoteSchema, checkoutQuoteSchema } from "@/lib/validations/customer";
import type { CheckoutBuyer } from "./order-access";

const ZERO = new Prisma.Decimal(0);
const MAX_TOTAL = new Prisma.Decimal("99999999.99");
type CartQuoteInput = z.infer<typeof cartQuoteSchema>;
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export function couponBuyerKey(buyer: CheckoutBuyer) {
  return buyer.kind === "customer" ? `user:${buyer.userId}` : buyer.checkoutScope ? `guest:${buyer.checkoutScope}` : null;
}

export function normalizeLines(items: CartQuoteInput["items"]) {
  const bySku = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const { productId, variantId, quantity } of items) {
    const key = JSON.stringify([productId, variantId || null]);
    const combined = (bySku.get(key)?.quantity ?? 0) + quantity;
    if (combined > 100) throw new PublicError("Maximum quantity per item is 100");
    bySku.set(key, { productId, variantId: variantId || null, quantity: combined });
  }
  // Consistent ordering for request fingerprints and stock row updates.
  return [...bySku.entries()].sort(([a], [b]) => a < b ? -1 : a === b ? 0 : 1).map(([, item]) => item);
}

export function hashCheckoutPayload(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function calculateCouponDiscount(eligible: Prisma.Decimal, type: "PERCENTAGE" | "FIXED", value: Prisma.Decimal) {
  if (value.lte(0) || (type === "PERCENTAGE" && value.gt(100))) throw new PublicError("Invalid coupon value");
  const amount = type === "PERCENTAGE" ? eligible.mul(value).div(100) : value;
  return Prisma.Decimal.min(eligible, amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
}

export async function priceCart(tx: Prisma.TransactionClient, input: CartQuoteInput, buyerKey: string | null) {
  const lines = normalizeLines(input.items);
  const requestedVariants = lines.flatMap((line) => line.variantId ? [line.variantId] : []);
  const products = await tx.product.findMany({
    where: { id: { in: [...new Set(lines.map((line) => line.productId))] }, isActive: true },
    select: {
      id: true, name: true, sku: true, stock: true, price: true, costPrice: true,
      _count: { select: { variants: true } },
      variants: { where: { isActive: true, id: { in: requestedVariants } }, select: { id: true, stock: true, price: true, name: true, value: true, sku: true } },
      categories: { where: { isActive: true }, select: { id: true } },
    },
  });
  const byProduct = new Map(products.map((p) => [p.id, p]));
  const items = lines.map((line) => {
    const product = byProduct.get(line.productId);
    if (!product) throw new PublicError("A product in your cart is no longer available");
    const variant = product.variants.find((v) => v.id === line.variantId);
    if (line.variantId && !variant) throw new PublicError("A selected variant is no longer available");
    if (product._count.variants > 0 && !variant) throw new PublicError("Select a variant for each item that requires one");
    if ((variant?.stock ?? product.stock) < line.quantity) throw new PublicError("Insufficient stock for an item in your cart");
    const price = variant?.price ?? product.price;
    if (price.lt(0)) throw new PublicError("An item has an invalid price");
    return {
      ...line, price, lineTotal: price.mul(line.quantity), name: product.name,
      sku: variant?.sku ?? product.sku, costPrice: product.costPrice,
      variant: variant ? `${variant.name}: ${variant.value}` : null,
      categories: product.categories,
    };
  });
  const subtotal = items.reduce((sum, line) => sum.add(line.lineTotal), ZERO);
  if (subtotal.gt(MAX_TOTAL)) throw new PublicError("This cart exceeds the maximum order amount");

  let coupon: { id: string; code: string; usageLimit: number | null } | null = null;
  let discount = ZERO;
  if (input.couponCode) {
    const data = await tx.coupon.findUnique({ where: { code: input.couponCode } });
    if (!data?.isActive) throw new PublicError("Invalid or inactive coupon");
    if (data.expiresAt && data.expiresAt <= new Date()) throw new PublicError("This coupon has expired");
    if (data.usageLimit !== null && data.usedCount >= data.usageLimit) throw new PublicError("This coupon has reached its usage limit");
    if (data.minOrderAmount && subtotal.lt(data.minOrderAmount)) throw new PublicError("The cart does not meet this coupon's minimum order amount");
    if (!buyerKey) throw new PublicError("A checkout session is required to use a coupon");
    const redeemed = await tx.couponRedemption.findUnique({ where: { couponId_buyerKey: { couponId: data.id, buyerKey } } });
    if (redeemed) throw new PublicError("You already used this coupon");
    const scoped = data.productIds.length > 0 || data.categoryIds.length > 0;
    const eligible = items.reduce((sum, item) => {
      const matches = !scoped || data.productIds.includes(item.productId) || item.categories.some((c) => data.categoryIds.includes(c.id));
      return matches ? sum.add(item.lineTotal) : sum;
    }, ZERO);
    if (eligible.lte(0)) throw new PublicError("This coupon does not apply to your cart");
    discount = calculateCouponDiscount(eligible, data.type, data.value);
    coupon = { id: data.id, code: data.code, usageLimit: data.usageLimit };
  }
  return { items, subtotal, discount, coupon };
}

export async function priceCheckout(tx: Prisma.TransactionClient, input: CheckoutQuoteInput, buyerKey: string | null) {
  const [settings, zone] = await Promise.all([
    tx.storeSetting.findUnique({ where: { id: 1 }, select: { codEnabled: true, minOrderValue: true } }),
    tx.deliveryZone.findFirst({ where: { id: input.zoneId, isActive: true, districts: { has: input.district } }, select: { id: true, charge: true } }),
  ]);
  if (!settings?.codEnabled) throw new PublicError("Cash on delivery is currently unavailable");
  if (!zone || zone.charge.lt(0)) throw new PublicError("Select a delivery zone that serves your district");
  const { items, subtotal, discount, coupon } = await priceCart(tx, input, buyerKey);
  if (settings.minOrderValue && subtotal.lt(settings.minOrderValue)) throw new PublicError("The cart does not meet the minimum order amount");
  const total = subtotal.sub(discount).add(zone.charge);
  if (total.lt(0) || total.gt(MAX_TOTAL)) throw new PublicError("The payable amount is out of range");
  const summary = {
    subtotal: subtotal.toFixed(2), discount: discount.toFixed(2), shipping: zone.charge.toFixed(2), total: total.toFixed(2),
    lines: items.map(({ productId, variantId, quantity, price, lineTotal }) => ({ productId, variantId, quantity, price: price.toFixed(2), lineTotal: lineTotal.toFixed(2) })),
  };
  const fingerprint = hashCheckoutPayload({ ...summary, district: input.district, zoneId: zone.id, couponId: coupon?.id ?? null });
  return { items, zone, subtotal, discount, total, coupon, summary: { ...summary, fingerprint } };
}
