import { prisma } from "@/lib/prisma";
import type { BannerInput, CouponInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";

export async function listBanners() {
  return prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
}

export async function getActiveBanners(position?: string) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
      ...(position ? { position } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createBanner(input: BannerInput, adminId: string) {
  const banner = await prisma.banner.create({
    data: {
      title: input.title || null,
      subtitle: input.subtitle || null,
      ctaText: input.ctaText || null,
      ctaLink: input.ctaLink || null,
      image: input.image,
      position: input.position,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  await writeAuditLog({ userId: adminId, action: "BANNER_CREATE", entity: "Banner", entityId: banner.id });
  return banner;
}

export async function updateBanner(id: string, input: BannerInput, adminId: string) {
  const banner = await prisma.banner.update({
    where: { id },
    data: {
      title: input.title || null,
      subtitle: input.subtitle || null,
      ctaText: input.ctaText || null,
      ctaLink: input.ctaLink || null,
      image: input.image,
      position: input.position,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  await writeAuditLog({ userId: adminId, action: "BANNER_UPDATE", entity: "Banner", entityId: id });
  return banner;
}

export async function deleteBanner(id: string, adminId: string) {
  const banner = await prisma.banner.delete({ where: { id } });
  await writeAuditLog({ userId: adminId, action: "BANNER_DELETE", entity: "Banner", entityId: id });
  return banner;
}

// ---------- Coupons ----------
export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createCoupon(input: CouponInput, adminId: string) {
  const coupon = await prisma.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value as any,
      minOrderAmount: input.minOrderAmount ? (input.minOrderAmount as any) : null,
      usageLimit: input.usageLimit ? Number(input.usageLimit) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ userId: adminId, action: "COUPON_CREATE", entity: "Coupon", entityId: coupon.id, detail: { code: coupon.code } });
  return coupon;
}

export async function updateCoupon(id: string, input: CouponInput, adminId: string) {
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value as any,
      minOrderAmount: input.minOrderAmount ? (input.minOrderAmount as any) : null,
      usageLimit: input.usageLimit ? Number(input.usageLimit) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ userId: adminId, action: "COUPON_UPDATE", entity: "Coupon", entityId: id, detail: { code: coupon.code } });
  return coupon;
}

export async function deleteCoupon(id: string, adminId: string) {
  const coupon = await prisma.coupon.delete({ where: { id } });
  await writeAuditLog({ userId: adminId, action: "COUPON_DELETE", entity: "Coupon", entityId: id, detail: { code: coupon.code } });
  return coupon;
}

export async function validateCoupon(code: string, subtotal: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) return { valid: false as const, error: "Invalid coupon code" };
  if (!coupon.isActive) return { valid: false as const, error: "This coupon is no longer active" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false as const, error: "This coupon has expired" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return { valid: false as const, error: "This coupon has reached its usage limit" };
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount))
    return { valid: false as const, error: `Minimum order amount is ৳${Number(coupon.minOrderAmount)}` };
  return { valid: true as const, coupon };
}
