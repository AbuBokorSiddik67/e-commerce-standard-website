"use server";

import { cartQuoteSchema, checkoutQuoteSchema, checkoutSchema, trackOrderSchema, reviewSchema, newsletterSchema } from "@/lib/validations/customer";
import { createOrder, getOrderByNumberAndPhone } from "@/server/services/order.service";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionErrorMessage } from "@/lib/errors";
import {
  createGuestCheckoutSecret, GUEST_CHECKOUT_COOKIE, guestCheckoutScope, guestReceiptForCheckout,
  GUEST_RECEIPT_COOKIE, guestReceiptPath, isGuestCheckoutSecret,
} from "@/server/services/order-access";
import { couponBuyerKey, priceCart, priceCheckout } from "@/server/services/checkout-pricing";
import { orderTransaction } from "@/server/services/order-transaction";

type ActionResult = { success: boolean; error?: string; orderNumber?: string; receiptExpired?: boolean };

async function clientKey(prefix: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  return `${prefix}:${ip}`;
}

async function checkoutViewer(provision: boolean) {
  const session = await auth();
  if (session) {
    if (!session.user?.id || session.user.role !== "CUSTOMER") throw new Error("Only customers and guests can check out");
    return { kind: "customer", userId: session.user.id } as const;
  }
  const jar = await cookies();
  const existing = jar.get(GUEST_CHECKOUT_COOKIE)?.value;
  if (isGuestCheckoutSecret(existing)) return { kind: "guest", secret: existing, jar } as const;
  if (!provision) throw new Error("Your checkout session expired. Refresh your quote and try again.");
  const secret = createGuestCheckoutSecret();
  jar.set(GUEST_CHECKOUT_COOKIE, secret, {
    path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60,
  });
  return { kind: "guest", secret, jar } as const;
}

function viewerKey(viewer: Awaited<ReturnType<typeof checkoutViewer>>) {
  return viewer.kind === "customer" ? couponBuyerKey(viewer) : `guest:${guestCheckoutScope(viewer.secret)}`;
}

export async function quoteCheckoutAction(input: unknown) {
  const parsed = checkoutQuoteSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!rateLimit(await clientKey("checkout-quote"), 25, 60_000).success) return { success: false as const, error: "Too many quote requests. Try again shortly." };
  try {
    const viewer = await checkoutViewer(true);
    const quote = await orderTransaction((tx) => priceCheckout(tx, parsed.data, viewerKey(viewer)));
    return { success: true as const, quote: quote.summary };
  } catch (e) {
    return { success: false as const, error: actionErrorMessage("customer.quote", e, "Could not prepare your checkout quote") };
  }
}

export async function placeOrderAction(input: unknown): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!parsed.data.expectedQuote) return { success: false, error: "Review the order total before submitting" };
  if (!rateLimit(await clientKey("checkout"), 8, 60_000).success) return { success: false, error: "Too many attempts. Please try again in a minute." };

  try {
    const viewer = await checkoutViewer(false);
    let orderNumber: string;
    if (viewer.kind === "customer") {
      ({ orderNumber } = await createOrder(parsed.data, viewer));
    } else {
      const grant = guestReceiptForCheckout(viewer.secret, parsed.data.idempotencyKey);
      const order = await createOrder(parsed.data, {
        kind: "guest", checkoutScope: guestCheckoutScope(viewer.secret), receipt: grant.proof,
      });
      orderNumber = order.orderNumber;
      if (order.guestReceiptExpiresAt && order.guestReceiptExpiresAt > new Date()) {
        viewer.jar.set(GUEST_RECEIPT_COOKIE, grant.token, {
          path: guestReceiptPath(orderNumber), httpOnly: true,
          secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: order.guestReceiptExpiresAt,
        });
      } else {
        // The order already exists but its original receipt expired. Do not renew it.
        return { success: true, orderNumber, receiptExpired: true };
      }
    }
    revalidatePath("/admin/orders");
    return { success: true, orderNumber };
  } catch (e) {
    return { success: false, error: actionErrorMessage("customer.placeOrder", e, "Failed to place order") };
  }
}

export async function trackOrderAction(input: unknown) {
  const parsed = trackOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const limiter = rateLimit(await clientKey("track"), 20, 60_000);
  if (!limiter.success) {
    return { success: false as const, error: "Too many attempts. Please try again later." };
  }
  try {
    const order = await getOrderByNumberAndPhone(parsed.data.orderNumber, parsed.data.phone);
    if (!order) return { success: false as const, error: "No order found with this order number and phone" };
    return {
      success: true as const,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        placedAt: order.placedAt.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString() ?? null,
        total: Number(order.total),
        zone: order.zone?.name ?? null,
        items: order.items.map((i) => ({
          name: i.name,
          variant: i.variant,
          quantity: i.quantity,
          price: Number(i.price),
          lineTotal: Number(i.lineTotal),
        })),
      },
    };
  } catch (e) {
    return {
      success: false as const,
      error: actionErrorMessage("customer.trackOrder", e, "Could not look up this order right now. Please try again."),
    };
  }
}

export async function applyCouponAction(input: unknown) {
  const parsed = cartQuoteSchema.safeParse(input);
  if (!parsed.success || !parsed.data.couponCode) return { success: false as const, error: "Invalid cart or coupon" };
  if (!rateLimit(await clientKey("coupon"), 20, 60_000).success) return { success: false as const, error: "Too many attempts" };
  try {
    const viewer = await checkoutViewer(true);
    const result = await orderTransaction((tx) => priceCart(tx, parsed.data, viewerKey(viewer)));
    return {
      success: true as const, code: result.coupon?.code ?? null,
      subtotal: result.subtotal.toFixed(2), discount: result.discount.toFixed(2), total: result.subtotal.sub(result.discount).toFixed(2),
    };
  } catch (e) {
    return { success: false as const, error: actionErrorMessage("customer.applyCoupon", e, "Could not check this coupon right now") };
  }
}

export async function submitReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const limiter = rateLimit(await clientKey("review"), 3, 60_000);
  if (!limiter.success) return { success: false, error: "Too many reviews submitted. Try later." };

  try {
    const session = await auth();
    await prisma.review.create({
      data: {
        productId: parsed.data.productId,
        userId: session?.user?.id ?? null,
        customerName: parsed.data.customerName,
        city: parsed.data.city || null,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body,
        isApproved: false,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to submit review" };
  }
}

export async function subscribeNewsletterAction(input: unknown): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!parsed.data.consent) return { success: false, error: "Please consent to receive updates" };
  const limiter = rateLimit(await clientKey("newsletter"), 3, 60_000);
  if (!limiter.success) return { success: false, error: "Too many attempts" };
  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: { phone: parsed.data.phone || null, consent: true },
      create: { email: parsed.data.email, phone: parsed.data.phone || null, consent: true },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to subscribe" };
  }
}
