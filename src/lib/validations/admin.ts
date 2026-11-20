import { z } from "zod";
import { BANGLADESH_DISTRICTS } from "@/lib/constants";

const money = z.coerce.number<string | number>().min(0).max(99999999.99).multipleOf(0.01);
const stockCount = z.coerce.number().int().min(0).max(2_147_483_647);

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  slug: z.string().min(2).max(200).optional().or(z.literal("")),
  shortDesc: z.string().max(300).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  price: money,
  compareAtPrice: z.coerce.number().min(0).optional().or(z.literal("")).nullable(),
  costPrice: z.coerce.number().min(0).optional().or(z.literal("")).nullable(),
  sku: z.string().max(100).optional().or(z.literal("")),
  stock: stockCount,
  originalStock: stockCount.optional(),
  originalVariantIds: z.array(z.string().min(1).max(100)).max(100).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(500).optional().or(z.literal("")),
  weightGrams: z.coerce.number().int().min(0).optional().or(z.literal("")).nullable(),
  categoryIds: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string().url(), altText: z.string().optional().or(z.literal("")) })).default([]),
  variants: z.array(z.object({
    id: z.string().min(1).max(100).optional(),
    originalStock: stockCount.optional(),
    name: z.string().trim().min(1).max(100),
    value: z.string().trim().min(1).max(100),
    sku: z.string().optional().or(z.literal("")),
    price: z.literal("").or(money).optional().nullable(),
    stock: stockCount.default(0),
  })).max(100).default([]),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z.string().min(2).max(100).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  image: z.string().url().optional().or(z.literal("")).nullable(),
  parentId: z.string().optional().or(z.literal("")).nullable(),
  showOnHome: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const bannerSchema = z.object({
  title: z.string().max(200).optional().or(z.literal("")),
  subtitle: z.string().max(300).optional().or(z.literal("")),
  ctaText: z.string().max(50).optional().or(z.literal("")),
  ctaLink: z.string().max(500).optional().or(z.literal("")),
  image: z.string().min(1, "Banner image is required"),
  position: z.string().max(50).default("home_mid"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().optional().or(z.literal("")).nullable(),
  endDate: z.string().optional().or(z.literal("")).nullable(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(2).max(50).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: money.refine((value) => value > 0, "Value must be positive"),
  minOrderAmount: z.literal("").or(money).optional().nullable(),
  usageLimit: z.literal("").or(z.coerce.number().int().min(1).max(2_147_483_647)).optional().nullable(),
  expiresAt: z.iso.date().or(z.literal("")).optional().nullable(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().min(1).max(100)).max(100).default([]),
  categoryIds: z.array(z.string().min(1).max(100)).max(100).default([]),
}).refine((input) => input.type !== "PERCENTAGE" || input.value <= 100, "Percentage discounts cannot exceed 100%");

export const settingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(100),
  logoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  faviconUrl: z.string().url().optional().or(z.literal("")).nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  fontFamily: z.string().max(100).default("Inter"),
  currencySymbol: z.string().max(5).default("৳"),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  storeAddress: z.string().max(500).optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")).nullable(),
  instagramUrl: z.string().url().optional().or(z.literal("")).nullable(),
  youtubeUrl: z.string().url().optional().or(z.literal("")).nullable(),
  tiktokUrl: z.string().url().optional().or(z.literal("")).nullable(),
  whatsappUrl: z.string().url().optional().or(z.literal("")).nullable(),
  footerText: z.string().max(500).optional().or(z.literal("")),
  returnPolicy: z.string().optional().or(z.literal("")),
  privacyPolicy: z.string().optional().or(z.literal("")),
  termsConditions: z.string().optional().or(z.literal("")),
  shippingPolicy: z.string().optional().or(z.literal("")),
  codEnabled: z.boolean().default(true),
  minOrderValue: z.literal("").or(money).optional().nullable(),
  socialShareImage: z.string().url().optional().or(z.literal("")).nullable(),
});

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(1, "Zone name is required").max(100),
  charge: z.union([z.number(), z.string().trim().min(1)]).pipe(money),
  estimatedDays: z.string().trim().max(50).optional(),
  isActive: z.boolean(),
  districts: z.array(z.enum(BANGLADESH_DISTRICTS)).min(1, "Select or enter at least one district").max(64),
});

export const homepageSectionSchema = z.object({
  sectionKey: z.enum([
    "HERO", "TRUST_STRIP", "SHOP_BY_CATEGORY", "NEW_ARRIVALS", "BEST_SELLERS",
    "OFFER_BANNER", "FEATURED_COLLECTION", "WHY_SHOP", "REVIEWS",
    "SOCIAL_FEED", "NEWSLETTER_CTA",
  ]),
  title: z.string().max(200).optional().or(z.literal("")).nullable(),
  subtitle: z.string().max(300).optional().or(z.literal("")).nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).optional(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  startDate: z.string().optional().or(z.literal("")).nullable(),
  endDate: z.string().optional().or(z.literal("")).nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
export type HomepageSectionInput = z.infer<typeof homepageSectionSchema>;
