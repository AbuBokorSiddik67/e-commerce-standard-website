"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { productSchema, resourceId, deliveryZoneSchema, categorySchema, bannerSchema, couponSchema, settingsSchema, homepageSectionSchema } from "@/lib/validations/admin";
import { createProduct, updateProduct, deleteProduct, bulkUpdateProducts, bulkDeleteProducts } from "@/server/services/product.service";
import { createCategory, updateCategory, deleteCategory } from "@/server/services/category.service";
import { createBanner, updateBanner, deleteBanner, createCoupon, updateCoupon, deleteCoupon } from "@/server/services/content.service";
import { updateStoreSettings, saveDeliveryZone, deleteDeliveryZone } from "@/server/repositories/settings.repo";
import { upsertHomepageSection, reorderHomepageSections, createHomepageSection, deleteHomepageSection } from "@/server/services/homepage.service";
import { HOMEPAGE_SECTIONS } from "@/lib/constants";
import type { HomepageSectionKey } from "@prisma/client";
import { updateOrderStatus, updatePaymentStatus } from "@/server/services/order.service";
import { setCustomerBlocked } from "@/server/services/customer.service";
import { z } from "zod";
import { actionErrorMessage, friendlyError, logError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ActionResult = { success: boolean; error?: string; id?: string };

async function guard() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return { ok: false as const, error: "Unauthorized" };
    }
    return { ok: true as const, userId: session.user.id };
  } catch (error) {
    logError("admin.guard", error);
    return {
      ok: false as const,
      error: "We couldn't verify your session. Please sign in again.",
    };
  }
}

function zodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation failed";
}

// ---------- Products ----------
export async function saveProductAction(id: string | null, formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData) || (id !== null && !resourceId.safeParse(id).success)) return { success: false, error: "Invalid form or resource" };

  try {
    const raw = Object.fromEntries(formData);
    const parsed = productSchema.safeParse({
      ...raw,
      isFeatured: formData.get("isFeatured") === "true",
      isActive: formData.get("isActive") === "true",
      categoryIds: JSON.parse((formData.get("categoryIds") as string) || "[]"),
      images: JSON.parse((formData.get("images") as string) || "[]"),
      variants: JSON.parse((formData.get("variants") as string) || "[]"),
      originalVariantIds: id ? formData.getAll("originalVariantIds") : undefined,
    });
    if (!parsed.success) return { success: false, error: zodError(parsed.error) };

    if (id) {
      await updateProduct(id, parsed.data, g.userId);
      revalidatePath("/admin/products");
      revalidatePath("/products");
      return { success: true, id };
    }
    const p = await createProduct(parsed.data, g.userId);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, id: p.id };
  } catch (e) {
    logError("admin.saveProduct", e);
    return { success: false, error: friendlyError(e, "Failed to save product") };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid resource" };
  try {
    await deleteProduct(id, g.userId);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to delete") };
  }
}

export async function bulkProductAction(ids: string[], action: "activate" | "deactivate" | "feature" | "unfeature" | "delete"): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  const parsed = z.object({ ids: z.array(resourceId).min(1).max(100), action: z.enum(["activate", "deactivate", "feature", "unfeature", "delete"]) }).safeParse({ ids, action });
  if (!parsed.success) return { success: false, error: "Invalid bulk action" };
  try {
    if (action === "delete") await bulkDeleteProducts(ids, g.userId);
    else if (action === "activate") await bulkUpdateProducts(ids, { isActive: true }, g.userId);
    else if (action === "deactivate") await bulkUpdateProducts(ids, { isActive: false }, g.userId);
    else if (action === "feature") await bulkUpdateProducts(ids, { isFeatured: true }, g.userId);
    else if (action === "unfeature") await bulkUpdateProducts(ids, { isFeatured: false }, g.userId);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Bulk action failed") };
  }
}

// ---------- Categories ----------
export async function saveCategoryAction(id: string | null, formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData) || (id !== null && !resourceId.safeParse(id).success)) return { success: false, error: "Invalid form or resource" };
  const parsed = categorySchema.safeParse({
    ...Object.fromEntries(formData),
    showOnHome: formData.get("showOnHome") === "true",
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { success: false, error: zodError(parsed.error) };
  try {
    if (id) await updateCategory(id, parsed.data, g.userId);
    else await createCategory(parsed.data, g.userId);
    revalidatePath("/admin/categories");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, id: id ?? undefined };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to save category") };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid resource" };
  try {
    await deleteCategory(id, g.userId);
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete category" };
  }
}

// ---------- Banners ----------
export async function saveBannerAction(id: string | null, formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData) || (id !== null && !resourceId.safeParse(id).success)) return { success: false, error: "Invalid form or resource" };
  const parsed = bannerSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { success: false, error: zodError(parsed.error) };
  try {
    if (id) await updateBanner(id, parsed.data, g.userId);
    else await createBanner(parsed.data, g.userId);
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { success: true, id: id ?? undefined };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to save banner") };
  }
}

export async function deleteBannerAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid resource" };
  try {
    await deleteBanner(id, g.userId);
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete banner" };
  }
}

// ---------- Coupons ----------
export async function saveCouponAction(id: string | null, formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData) || (id !== null && !resourceId.safeParse(id).success)) return { success: false, error: "Invalid form or resource" };
  const parsed = couponSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "true",
    productIds: formData.getAll("productIds"),
    categoryIds: formData.getAll("categoryIds"),
  });
  if (!parsed.success) return { success: false, error: zodError(parsed.error) };
  try {
    if (id) await updateCoupon(id, parsed.data, g.userId);
    else await createCoupon(parsed.data, g.userId);
    revalidatePath("/admin/coupons");
    return { success: true, id: id ?? undefined };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to save coupon") };
  }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid resource" };
  try {
    await deleteCoupon(id, g.userId);
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete coupon" };
  }
}

// ---------- Settings ----------
export async function saveSettingsAction(formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData)) return { success: false, error: "Invalid form" };

  const raw = Object.fromEntries(formData);
  const parsed = settingsSchema.safeParse({
    ...raw,
    codEnabled: formData.get("codEnabled") === "true",
  });
  if (!parsed.success) return { success: false, error: zodError(parsed.error) };

  try {
    const d = parsed.data;
    await updateStoreSettings({
      storeName: d.storeName,
      logoUrl: d.logoUrl || null,
      faviconUrl: d.faviconUrl || null,
      primaryColor: d.primaryColor,
      secondaryColor: d.secondaryColor,
      accentColor: d.accentColor,
      buttonColor: d.buttonColor,
      textColor: d.textColor,
      backgroundColor: d.backgroundColor,
      fontFamily: d.fontFamily,
      currencySymbol: d.currencySymbol,
      contactPhone: d.contactPhone || null,
      contactEmail: d.contactEmail || null,
      storeAddress: d.storeAddress || null,
      facebookUrl: d.facebookUrl || null,
      instagramUrl: d.instagramUrl || null,
      youtubeUrl: d.youtubeUrl || null,
      tiktokUrl: d.tiktokUrl || null,
      whatsappUrl: d.whatsappUrl || null,
      footerText: d.footerText || null,
      returnPolicy: d.returnPolicy || null,
      privacyPolicy: d.privacyPolicy || null,
      termsConditions: d.termsConditions || null,
      shippingPolicy: d.shippingPolicy || null,
      codEnabled: d.codEnabled,
      minOrderValue: typeof d.minOrderValue === "number" ? new Prisma.Decimal(d.minOrderValue) : null,
      socialShareImage: d.socialShareImage || null,
    }, g.userId);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to save settings") };
  }
}

export async function saveDeliveryZoneAction(id: string | null, formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData) || (id !== null && !resourceId.safeParse(id).success)) return { success: false, error: "Invalid form or resource" };
  const parsed = deliveryZoneSchema.safeParse({
    name: formData.get("name"), charge: formData.get("charge"), estimatedDays: formData.get("estimatedDays") ?? "",
    isActive: formData.get("isActive") === "true", districts: [...new Set(formData.getAll("districts"))],
  });
  if (!parsed.success) return { success: false, error: zodError(parsed.error) };
  try {
    await saveDeliveryZone(id, parsed.data, g.userId);
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save zone" };
  }
}

export async function deleteDeliveryZoneAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid resource" };
  try {
    await deleteDeliveryZone(id, g.userId);
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete zone" };
  }
}

// ---------- Homepage ----------
export async function saveHomepageSectionAction(formData: FormData): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!(formData instanceof FormData)) return { success: false, error: "Invalid form" };
  try {
    const parsed = homepageSectionSchema.safeParse({
      ...Object.fromEntries(formData),
      isActive: formData.get("isActive") === "true",
      productIds: JSON.parse((formData.get("productIds") as string) || "[]"),
      categoryIds: JSON.parse((formData.get("categoryIds") as string) || "[]"),
      settings: JSON.parse((formData.get("settings") as string) || "null"),
    });
    if (!parsed.success) return { success: false, error: zodError(parsed.error) };

    await upsertHomepageSection(parsed.data, g.userId);
    revalidatePath("/admin/homepage");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to save section") };
  }
}

export async function createHomepageSectionAction(sectionKey: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!HOMEPAGE_SECTIONS.some((s) => s.key === sectionKey)) {
    return { success: false, error: "Invalid section type" };
  }
  try {
    const section = await createHomepageSection(sectionKey as HomepageSectionKey, g.userId);
    revalidatePath("/admin/homepage");
    revalidatePath("/");
    return { success: true, id: section.id };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to create section") };
  }
}

export async function deleteHomepageSectionAction(id: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success) return { success: false, error: "Invalid resource" };
  try {
    await deleteHomepageSection(id, g.userId);
    revalidatePath("/admin/homepage");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete section" };
  }
}

export async function reorderHomepageAction(sections: { id: string; sortOrder: number }[]): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  const parsed = z.array(z.object({ id: resourceId, sortOrder: z.number().int().min(0).max(10_000) })).max(100).safeParse(sections);
  if (!parsed.success) return { success: false, error: "Invalid sections" };
  try {
    await reorderHomepageSections(parsed.data, g.userId);
    revalidatePath("/admin/homepage");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to reorder sections" };
  }
}

// ---------- Orders ----------
export async function updateOrderStatusAction(id: string, status: string, cancelReason?: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  try {
    const parsed = z.object({ id: z.string().min(1).max(100), status: z.enum(["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"]), cancelReason: z.string().trim().max(500).optional() }).parse({ id, status, cancelReason });
    await updateOrderStatus(parsed.id, parsed.status, g.userId, parsed.cancelReason);
    revalidatePath("/products");
    revalidatePath("/");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin", e, "Failed to update status") };
  }
}

export async function updatePaymentStatusAction(id: string, paymentStatus: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  try {
    const parsed = z.object({ id: z.string().min(1).max(100), paymentStatus: z.enum(["PAID", "PENDING", "REFUNDED"]) }).parse({ id, paymentStatus });
    await updatePaymentStatus(parsed.id, parsed.paymentStatus, g.userId);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: actionErrorMessage("admin.payment", e, "Failed to update payment status") };
  }
}

export async function addOrderNoteAction(id: string, note: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  const payload = z.object({ id: resourceId, note: z.string().trim().max(2_000) }).safeParse({ id, note });
  if (!payload.success) return { success: false, error: "Invalid order note" };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: payload.data.id }, data: { adminNotes: payload.data.note } });
      await audit(tx, { userId: g.userId, action: "ORDER_NOTE_UPDATE", entity: "Order", entityId: id });
    });
    revalidatePath(`/admin/orders/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save note" };
  }
}

// ---------- Customers ----------
export async function toggleCustomerBlockAction(id: string, isBlocked: boolean): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return { success: false, error: g.error };
  if (!resourceId.safeParse(id).success || typeof isBlocked !== "boolean") return { success: false, error: "Invalid customer update" };
  try {
    if (!(await setCustomerBlocked(id, isBlocked, g.userId))) return { success: false, error: "Customer not found" };
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update customer" };
  }
}
