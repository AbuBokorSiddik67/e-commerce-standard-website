import { PublicError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, toPositiveInt } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/customer";
import { Prisma, type OrderStatus, type PaymentStatus } from "@prisma/client";
import { customerOrderOwnership, receiptWhere, type CheckoutBuyer, type ReceiptViewer } from "./order-access";
import { couponBuyerKey, hashCheckoutPayload, normalizeLines, priceCheckout } from "./checkout-pricing";
import { orderTransaction } from "./order-transaction";

type CheckoutResult = { orderNumber: string; guestReceiptExpiresAt?: Date };

export async function createOrder(raw: CheckoutInput, buyer: CheckoutBuyer): Promise<CheckoutResult> {
  const input = checkoutSchema.parse(raw);
  const userId = buyer.kind === "customer" ? customerOrderOwnership(buyer.userId).userId : null;
  const buyerKey = couponBuyerKey(buyer);
  const { idempotencyKey, expectedQuote, ...payload } = input;
  // expectedQuote is consent, not pricing and not part of the order intent.
  const fingerprint = hashCheckoutPayload({ ...payload, items: normalizeLines(payload.items) });
  return orderTransaction(async (tx) => {
    if (userId) {
      const active = await tx.user.findFirst({ where: { id: userId, role: "CUSTOMER", isBlocked: false }, select: { id: true } });
      if (!active) throw new PublicError("This customer account cannot place orders");
    }
    const existing = await tx.order.findUnique({ where: { idempotencyKey }, select: {
      orderNumber: true, userId: true, checkoutFingerprint: true, guestCheckoutScope: true,
      guestReceiptTokenHash: true, guestReceiptExpiresAt: true,
    } });
    if (existing) {
      const guestMatches = buyer.kind === "guest" && !!buyer.checkoutScope && existing.userId === null &&
        existing.guestCheckoutScope === buyer.checkoutScope &&
        existing.guestReceiptTokenHash === buyer.receipt.guestReceiptTokenHash;
      const ownerMatches = buyer.kind === "customer" && buyer.userId === existing.userId;
      if ((!guestMatches && !ownerMatches) || existing.checkoutFingerprint !== fingerprint) {
        throw new PublicError("Unable to resume this checkout. Check your order status or contact support.");
      }
      return { orderNumber: existing.orderNumber, ...(guestMatches && existing.guestReceiptExpiresAt
        ? { guestReceiptExpiresAt: existing.guestReceiptExpiresAt } : {}) };
    }
    const quote = await priceCheckout(tx, input, buyerKey);
    if (expectedQuote && expectedQuote !== quote.summary.fingerprint) throw new PublicError("The checkout prices changed. Review your updated total before placing the order.");

    if (quote.coupon && buyerKey) {
      const { id, usageLimit } = quote.coupon;
      const count = await tx.coupon.updateMany({
        where: { id, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          ...(usageLimit === null ? {} : { usedCount: { lt: usageLimit } }) },
        data: { usedCount: { increment: 1 } },
      });
      if (!count.count) throw new PublicError("The coupon is no longer available");
      const redemption = await tx.couponRedemption.createMany({ data: { couponId: id, buyerKey }, skipDuplicates: true });
      if (!redemption.count) throw new PublicError("You already used this coupon");
    }
    for (const item of quote.items) {
      const data = { stock: { decrement: item.quantity } };
      const updated = item.variantId
        ? await tx.productVariant.updateMany({ where: { id: item.variantId, productId: item.productId, isActive: true, stock: { gte: item.quantity } }, data })
        : await tx.product.updateMany({ where: { id: item.productId, isActive: true, stock: { gte: item.quantity } }, data });
      if (!updated.count) throw new PublicError("Insufficient stock for an item in your cart");
    }

    const contact = { fullName: input.fullName, phone: input.phone, email: input.email || null };
    let customerId: string;
    if (userId === null) {
      const customer = await tx.customer.create({ data: contact, select: { id: true } });
      customerId = customer.id;
    } else {
      const customer = await tx.customer.findUnique({ where: { userId }, select: { id: true } });
      if (customer) customerId = customer.id;
      else {
        await tx.customer.createMany({ data: { ...contact, userId }, skipDuplicates: true });
        const linked = await tx.customer.findUniqueOrThrow({ where: { userId }, select: { id: true } });
        customerId = linked.id;
      }
    }

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(), customerId, userId, idempotencyKey, checkoutFingerprint: fingerprint,
        guestCheckoutScope: buyer.kind === "guest" ? buyer.checkoutScope : null,
        inventoryVersion: 2,
        guestReceiptTokenHash: buyer.kind === "guest" ? buyer.receipt.guestReceiptTokenHash : null,
        guestReceiptExpiresAt: buyer.kind === "guest" ? buyer.receipt.guestReceiptExpiresAt : null,
        ...contact, shippingAddress: input.address, district: input.district, city: input.city,
        postalCode: input.postalCode || null, customerNotes: input.notes || null,
        zoneId: quote.zone.id, subtotal: quote.subtotal, discount: quote.discount,
        deliveryCharge: quote.zone.charge, total: quote.total, couponId: quote.coupon?.id,
        paymentMethod: "COD", paymentStatus: "PENDING", status: "PENDING",
        items: { create: quote.items.map(({ categories: _categories, ...item }) => {
          void _categories;
          return item;
        }) },
      },
      select: { orderNumber: true, guestReceiptExpiresAt: true },
    });
    return { orderNumber: order.orderNumber, ...(order.guestReceiptExpiresAt ? { guestReceiptExpiresAt: order.guestReceiptExpiresAt } : {}) };
  }, (error) => {
    const target = error.meta?.target ?? error.meta?.driverAdapterError;
    const detail = JSON.stringify(target ?? "");
    return detail.includes("idempotencyKey") || detail.includes("orderNumber");
  });
}

export async function getOrderReceipt(orderNumber: string, viewer: ReceiptViewer, now = new Date()) {
  const where = receiptWhere(orderNumber, viewer, now);
  if (!where) return null;

  return prisma.order.findFirst({
    where,
    select: {
      orderNumber: true,
      status: true,
      total: true,
      items: { select: { id: true, name: true, variant: true, quantity: true, lineTotal: true } },
    },
  });
}

export async function listOrders(params: {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: Prisma.OrderWhereInput = {};
  if (params.status) where.status = params.status as any;
  if (params.search) {
    where.OR = [
      { orderNumber: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search } },
      { fullName: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.dateFrom || params.dateTo) {
    where.placedAt = {
      ...(params.dateFrom ? { gte: params.dateFrom } : {}),
      ...(params.dateTo ? { lte: params.dateTo } : {}),
    };
  }

  const page = toPositiveInt(params.page, 1);
  const perPage = toPositiveInt(params.perPage, 20, 100);

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, zone: true, customer: true },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, pages: Math.ceil(total / perPage) };
}

export async function getOrderById(id: string) {
  const [order, activity] = await prisma.$transaction([
    prisma.order.findUnique({ where: { id }, include: { items: true, zone: true } }),
    prisma.auditLog.findMany({
      where: { entity: "Order", entityId: id, action: { in: ["ORDER_STATUS_CHANGE", "ORDER_PAYMENT_STATUS_CHANGE"] } },
      select: { id: true, action: true, detail: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30,
    }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return order ? { ...order, activity } : null;
}

export async function getOrderByNumberAndPhone(orderNumber: string, phone: string) {
  return prisma.order.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" }, phone },
    include: { items: true, zone: true },
  });
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PACKED", "CANCELLED"], PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"], DELIVERED: ["RETURNED"], CANCELLED: [], RETURNED: [],
};

type StatusActor = { kind: "admin" | "customer"; userId: string };

async function assertActor(tx: Prisma.TransactionClient, actor: StatusActor) {
  const found = await tx.user.findFirst({ where: {
    id: actor.userId, role: actor.kind === "admin" ? "ADMIN" : "CUSTOMER", isBlocked: false,
  }, select: { id: true } });
  if (!found) throw new PublicError("You cannot change this order");
}

async function restoreInventory(tx: Prisma.TransactionClient, items: {
  productId: string | null; variantId: string | null; variant: string | null; quantity: number;
}[], inventoryVersion: number) {
  const stock = new Map<string, number>();
  for (const { productId, variantId, variant, quantity } of items) {
    // Older canceled orders may reference deleted variants. Do not guess which SKU to credit.
    if (!productId || (variant && !variantId) || quantity <= 0) throw new PublicError("This order needs a manual inventory review before cancellation");
    if (!variantId || inventoryVersion === 1) {
      const key = JSON.stringify([productId, null]);
      stock.set(key, (stock.get(key) ?? 0) + quantity);
    }
    if (variantId) {
      const key = JSON.stringify([productId, variantId]);
      stock.set(key, (stock.get(key) ?? 0) + quantity);
    }
  }
  for (const [key, quantity] of [...stock].sort(([a], [b]) => a < b ? -1 : a === b ? 0 : 1)) {
    const [productId, variantId] = JSON.parse(key) as [string, string | null];
    const data = { stock: { increment: quantity } };
    const updated = variantId
      ? await tx.productVariant.updateMany({ where: { id: variantId, productId }, data })
      : await tx.product.updateMany({ where: { id: productId }, data });
    if (!updated.count) throw new PublicError("This order needs a manual inventory review before cancellation");
  }
}

async function changeOrderStatus(ref: { id: string } | { orderNumber: string }, status: OrderStatus, actor: StatusActor, reason?: string) {
  return orderTransaction(async (tx) => {
    await assertActor(tx, actor);
    const order = await tx.order.findFirst({
      where: { ...ref, ...(actor.kind === "customer" ? customerOrderOwnership(actor.userId) : {}) },
      select: { id: true, status: true, paymentStatus: true, inventoryVersion: true },
    });
    if (!order) throw new PublicError("Order not found");
    if (actor.kind === "customer" && (status !== "CANCELLED" || !["PENDING", "CONFIRMED"].includes(order.status))) {
      throw new PublicError("This order can no longer be cancelled online");
    }
    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) throw new PublicError(`Cannot change status from ${order.status} to ${status}`);
    if (status === "CANCELLED" && (order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED")) {
      throw new PublicError("This order needs payment review before cancellation");
    }
    const now = new Date();
    const result = await tx.order.updateMany({
      where: { id: order.id, status: order.status, paymentStatus: order.paymentStatus },
      data: {
        status,
        ...(status === "CONFIRMED" ? { confirmedAt: now } : {}),
        ...(status === "SHIPPED" ? { shippedAt: now } : {}),
        ...(status === "DELIVERED" ? { deliveredAt: now } : {}),
        ...(status === "CANCELLED" ? { cancelledAt: now, cancelReason: reason ?? null } : {}),
      },
    });
    if (!result.count) throw new PublicError("Order state changed. Refresh and try again.");
    let restoredUnits = 0;
    if (status === "CANCELLED") {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: {
        productId: true, variantId: true, variant: true, quantity: true,
      } });
      if (!items.length) throw new PublicError("This order needs a manual inventory review before cancellation");
      await restoreInventory(tx, items, order.inventoryVersion);
      restoredUnits = items.reduce((total, item) => total + item.quantity, 0);
    }
    await tx.auditLog.create({ data: {
      userId: actor.userId, action: "ORDER_STATUS_CHANGE", entity: "Order", entityId: order.id,
      detail: { from: order.status, to: status, ...(restoredUnits ? { restoredUnits } : {}) },
    } });
    return { id: order.id, status };
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus, adminId: string, reason?: string) {
  return changeOrderStatus({ id }, status, { kind: "admin", userId: adminId }, reason);
}

export async function cancelCustomerOrder(userId: string, orderNumber: string) {
  return changeOrderStatus({ orderNumber }, "CANCELLED", { kind: "customer", userId }, "Cancelled by customer");
}

export async function updatePaymentStatus(id: string, next: PaymentStatus, adminId: string) {
  return orderTransaction(async (tx) => {
    await assertActor(tx, { kind: "admin", userId: adminId });
    const order = await tx.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true, total: true } });
    if (!order) throw new PublicError("Order not found");
    const valid = (order.status === "DELIVERED" && ((["PENDING", "FAILED"].includes(order.paymentStatus) && next === "PAID") ||
      (order.paymentStatus === "PAID" && next === "PENDING"))) ||
      (order.status === "RETURNED" && order.paymentStatus === "PAID" && next === "REFUNDED");
    if (!valid) throw new PublicError("This payment change is not allowed for the current order status");
    const updated = await tx.order.updateMany({ where: { id, status: order.status, paymentStatus: order.paymentStatus }, data: { paymentStatus: next } });
    if (!updated.count) throw new PublicError("Order state changed. Refresh and try again.");
    await tx.auditLog.create({ data: {
      userId: adminId, action: "ORDER_PAYMENT_STATUS_CHANGE", entity: "Order", entityId: id,
      detail: { from: order.paymentStatus, to: next, orderTotal: order.total.toFixed(2), method: "COD" },
    } });
    return { id, paymentStatus: next };
  });
}
