"use server";

import { checkoutSchema, trackOrderSchema, reviewSchema, newsletterSchema } from "@/lib/validations/customer";
import { createOrder, getOrderByNumberAndPhone } from "@/server/services/order.service";
import { validateCoupon } from "@/server/services/content.service";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionErrorMessage } from "@/lib/errors";
import { calculateDiscount } from "@/lib/utils";

type ActionResult = { success: boolean; error?: string; orderNumber?: string; orderId?: string };

async function clientKey(prefix: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";
  return `${prefix}:${ip}`;
}

export async function placeOrderAction(input: unknown): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limiter = rateLimit(await clientKey("checkout"), 5, 60_000);
  if (!limiter.success) {
    return { success: false, error: "Too many attempts. Please try again in a minute." };
  }

  try {
    const session = await auth();
    if (session?.user?.role === "ADMIN") {
      return { success: false, error: "Admins cannot place orders" };
    }

    const order = await createOrder(parsed.data, session?.user?.id);
    revalidatePath("/admin/orders");
    return { success: true, orderNumber: order.orderNumber, orderId: order.id };
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

export async function applyCouponAction(code: string, subtotal: number) {
  const limiter = rateLimit(await clientKey("coupon"), 10, 60_000);
  if (!limiter.success) return { success: false as const, error: "Too many attempts" };
  if (!code) return { success: false as const, error: "Enter a coupon code" };
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { success: false as const, error: "Cart is empty" };
  }
  try {
    const result = await validateCoupon(code, subtotal);
    if (!result.valid) return { success: false as const, error: result.error };
    return {
      success: true as const,
      code: result.coupon.code,
      type: result.coupon.type,
      value: Number(result.coupon.value),
      discount: calculateDiscount(subtotal, {
        type: result.coupon.type,
        value: Number(result.coupon.value),
        minOrderAmount: result.coupon.minOrderAmount ? Number(result.coupon.minOrderAmount) : null,
      }),
    };
  } catch (e) {
    return {
      success: false as const,
      error: actionErrorMessage("customer.applyCoupon", e, "Could not check this coupon right now. Please try again."),
    };
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
