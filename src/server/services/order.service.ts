import { prisma } from "@/lib/prisma";
import { generateOrderNumber, toPositiveInt } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";
import { validateCoupon } from "./content.service";
import type { CheckoutInput } from "@/lib/validations/customer";
import type { Prisma } from "@prisma/client";

export async function createOrder(input: CheckoutInput, userId?: string) {
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });
  if (products.length !== new Set(productIds).size) throw new Error("Some products are no longer available");

  const variantIds = input.items.map((i) => i.variantId).filter((v): v is string => !!v);
  const variants = variantIds.length
    ? await prisma.productVariant.findMany({ where: { id: { in: variantIds } } })
    : [];

  let subtotal = 0;
  const orderItems: {
    productId: string;
    variantId: string | null;
    name: string;
    sku: string | null;
    variant: string | null;
    price: number;
    costPrice: number | null;
    quantity: number;
    lineTotal: number;
  }[] = [];

  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error("Product not found");

    let unitPrice = Number(product.price);

    if (item.variantId) {
      const variant = variants.find((v) => v.id === item.variantId && v.productId === product.id);
      if (!variant) throw new Error(`Variant not found for ${product.name}`);
      if (variant.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name} (${variant.value})`);
      unitPrice = variant.price !== null ? Number(variant.price) : unitPrice;
    } else {
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    orderItems.push({
      productId: product.id,
      variantId: item.variantId || null,
      name: product.name,
      sku: product.sku,
      variant: item.variantId
        ? (() => {
            const v = variants.find((vv) => vv.id === item.variantId);
            return v ? `${v.name}: ${v.value}` : null;
          })()
        : null,
      price: unitPrice,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      quantity: item.quantity,
      lineTotal,
    });
  }

  let discount = 0;
  let couponId: string | null = null;
  if (input.couponCode) {
    const result = await validateCoupon(input.couponCode, subtotal);
    if (!result.valid) throw new Error(result.error);
    discount = result.coupon.type === "PERCENTAGE"
      ? Math.round((subtotal * Number(result.coupon.value)) / 100)
      : Math.min(Number(result.coupon.value), subtotal);
    couponId = result.coupon.id;
  }

  const zone = await prisma.deliveryZone.findFirst({ where: { id: input.zoneId, isActive: true } });
  if (!zone) throw new Error("Invalid delivery zone");
  const deliveryCharge = Number(zone.charge);

  const total = subtotal - discount + deliveryCharge;

  const order = await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) throw new Error(`Insufficient stock for ${item.name}`);

      if (item.variantId) {
        const variantUpdated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (variantUpdated.count === 0) throw new Error(`Insufficient stock for ${item.name}`);
      }
    }

    let customerId: string | null = null;
    const existingCustomer = await tx.customer.findFirst({
      where: { OR: [{ phone: input.phone }, ...(userId ? [{ userId }] : [])] },
    });
    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (userId && !existingCustomer.userId) {
        await tx.customer.update({ where: { id: customerId }, data: { userId } });
      }
    } else {
      const customer = await tx.customer.create({
        data: { fullName: input.fullName, phone: input.phone, email: input.email || null, userId: userId ?? null },
      });
      customerId = customer.id;
    }

    return tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        userId: userId ?? null,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email || null,
        shippingAddress: input.address,
        district: input.district,
        city: input.city,
        postalCode: input.postalCode || null,
        zoneId: zone.id,
        subtotal: subtotal as any,
        discount: discount as any,
        deliveryCharge: deliveryCharge as any,
        total: total as any,
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        status: "PENDING",
        customerNotes: input.notes || null,
        couponId,
        idempotencyKey: input.idempotencyKey,
        items: {
          create: orderItems.map((oi) => ({
            productId: oi.productId,
            variantId: oi.variantId,
            name: oi.name,
            sku: oi.sku,
            variant: oi.variant,
            price: oi.price as any,
            costPrice: (oi.costPrice as any) ?? null,
            quantity: oi.quantity,
            lineTotal: oi.lineTotal as any,
          })),
        },
      },
      include: { items: true },
    });
  });

  if (couponId) {
    await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
  }

  return order;
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
  return prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, zone: true, customer: true, coupon: true },
  });
}

export async function getOrderByNumberAndPhone(orderNumber: string, phone: string) {
  return prisma.order.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" }, phone },
    include: { items: true, zone: true },
  });
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export async function updateOrderStatus(id: string, newStatus: string, adminId: string, adminNotes?: string, cancelReason?: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Order not found");
  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot change status from ${order.status} to ${newStatus}`);
  }

  const now = new Date();
  const data: Prisma.OrderUpdateInput = { status: newStatus as any };
  if (newStatus === "CONFIRMED") data.confirmedAt = now;
  if (newStatus === "SHIPPED") data.shippedAt = now;
  if (newStatus === "DELIVERED") data.deliveredAt = now;
  if (newStatus === "CANCELLED") {
    data.cancelledAt = now;
    if (cancelReason) data.cancelReason = cancelReason;
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }
  if (adminNotes !== undefined) data.adminNotes = adminNotes;

  const updated = await prisma.order.update({ where: { id }, data });
  await writeAuditLog({
    userId: adminId,
    action: "ORDER_STATUS_CHANGE",
    entity: "Order",
    entityId: id,
    detail: { from: order.status, to: newStatus },
  });
  return updated;
}

export async function updatePaymentStatus(id: string, paymentStatus: string, adminId: string) {
  const updated = await prisma.order.update({
    where: { id },
    data: { paymentStatus: paymentStatus as any },
  });
  await writeAuditLog({
    userId: adminId,
    action: "ORDER_PAYMENT_STATUS_CHANGE",
    entity: "Order",
    entityId: id,
    detail: { paymentStatus },
  });
  return updated;
}
