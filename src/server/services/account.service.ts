import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RegisterInput, PasswordResetInput } from "@/lib/validations/auth";
import type { ProfileInput, AddressInput } from "@/lib/validations/account";

export async function registerCustomer(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: {
      email,
      name: input.name,
      passwordHash,
      role: "CUSTOMER",
      customer: {
        create: {
          fullName: input.name,
          phone: input.phone,
          email,
        },
      },
    },
  });
}

export async function getAccountContext(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true },
  });
}

export async function updateCustomerProfile(userId: string, input: ProfileInput) {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name: input.name } }),
    customer
      ? prisma.customer.update({
          where: { id: customer.id },
          data: { fullName: input.name, phone: input.phone },
        })
      : prisma.customer.create({
          data: {
            userId,
            fullName: input.name,
            phone: input.phone,
            email: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? null,
          },
        }),
  ]);
}

export async function listCustomerAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createCustomerAddress(userId: string, input: AddressInput) {
  if (input.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.create({
    data: {
      userId,
      fullName: input.fullName,
      phone: input.phone,
      address: input.address,
      district: input.district,
      city: input.city,
      postalCode: input.postalCode || null,
      isDefault: input.isDefault ?? false,
    },
  });
}

export async function updateCustomerAddress(userId: string, id: string, input: AddressInput) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Address not found");
  if (input.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.update({
    where: { id },
    data: {
      fullName: input.fullName,
      phone: input.phone,
      address: input.address,
      district: input.district,
      city: input.city,
      postalCode: input.postalCode || null,
      isDefault: input.isDefault ?? false,
    },
  });
}

export async function deleteCustomerAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Address not found");
  await prisma.address.delete({ where: { id } });
}

export async function setDefaultCustomerAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Address not found");
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

async function customerOrderWhere(userId: string) {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  return {
    OR: [
      { userId },
      ...(customer ? [{ customerId: customer.id }] : []),
    ],
  };
}

export async function listCustomerOrders(userId: string) {
  const where = await customerOrderWhere(userId);
  return prisma.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    include: { items: true },
  });
}

export async function getCustomerOrder(userId: string, orderNumber: string) {
  const where = await customerOrderWhere(userId);
  return prisma.order.findFirst({
    where: { orderNumber, ...where },
    include: { items: true, zone: true },
  });
}

export async function listWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });
}

export async function toggleWishlist(userId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true },
  });
  if (!product) throw new Error("Product not found");

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { wishlisted: false };
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  return { wishlisted: true };
}

export async function isWishlisted(userId: string, productIds: string[]) {
  if (productIds.length === 0) return new Set<string>();
  const items = await prisma.wishlistItem.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });
  return new Set(items.map((i) => i.productId));
}

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.isBlocked) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { tokenHash, expiresAt, usedAt: null },
    create: { userId: user.id, tokenHash, expiresAt },
  });

  return { token, email: user.email };
}

export async function resetPassword(input: PasswordResetInput) {
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new Error("This reset link is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { userId: row.userId },
      data: { usedAt: new Date() },
    }),
  ]);
}
