import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STORE_SETTINGS } from "@/config/site";
import type { StoreSetting } from "@prisma/client";
import { hexToHsl } from "@/lib/utils";
import { logError } from "@/lib/errors";

export type PublicStoreSettings = {
  storeName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  currencySymbol: string;
  contactPhone: string | null;
  contactEmail: string | null;
  storeAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  footerText: string | null;
  returnPolicy: string | null;
  privacyPolicy: string | null;
  termsConditions: string | null;
  shippingPolicy: string | null;
  codEnabled: boolean;
  minOrderValue: string | null;
  socialShareImage: string | null;
  // HSL versions for CSS variables
  primaryHsl: string;
  accentHsl: string;
  buttonHsl: string;
  backgroundHsl: string;
  textHsl: string;
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function text(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHex(value: string): string {
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value;
}

function color(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed)
    ? normalizeHex(trimmed).toUpperCase()
    : fallback;
}

// Prevent a bad value from breaking the inline CSS variable block in the root layout.
function fontFamily(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_STORE_SETTINGS.fontFamily;
  const cleaned = value.replace(/[^a-zA-Z0-9 \-]/g, "").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : DEFAULT_STORE_SETTINGS.fontFamily;
}

function decimalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && typeof (value as { toString?: unknown }).toString === "function") {
    const asText = String(value);
    return asText === "NaN" || asText.length === 0 ? null : asText;
  }
  const asText = String(value).trim();
  return asText.length === 0 || asText === "NaN" ? null : asText;
}

function toPublic(s: Partial<StoreSetting>): PublicStoreSettings {
  const primaryColor = color(s.primaryColor, DEFAULT_STORE_SETTINGS.primaryColor);
  const accentColor = color(s.accentColor, DEFAULT_STORE_SETTINGS.accentColor);
  const buttonColor = color(s.buttonColor, DEFAULT_STORE_SETTINGS.buttonColor);
  const backgroundColor = color(s.backgroundColor, DEFAULT_STORE_SETTINGS.backgroundColor);
  const textColor = color(s.textColor, DEFAULT_STORE_SETTINGS.textColor);
  const secondaryColor = color(s.secondaryColor, DEFAULT_STORE_SETTINGS.secondaryColor);

  return {
    storeName: text(s.storeName, DEFAULT_STORE_SETTINGS.storeName),
    logoUrl: optionalText(s.logoUrl),
    faviconUrl: optionalText(s.faviconUrl),
    primaryColor,
    secondaryColor,
    accentColor,
    buttonColor,
    textColor,
    backgroundColor,
    fontFamily: fontFamily(s.fontFamily),
    currencySymbol: text(s.currencySymbol, DEFAULT_STORE_SETTINGS.currencySymbol),
    contactPhone: optionalText(s.contactPhone),
    contactEmail: optionalText(s.contactEmail),
    storeAddress: optionalText(s.storeAddress),
    facebookUrl: optionalText(s.facebookUrl),
    instagramUrl: optionalText(s.instagramUrl),
    youtubeUrl: optionalText(s.youtubeUrl),
    tiktokUrl: optionalText(s.tiktokUrl),
    whatsappUrl: optionalText(s.whatsappUrl),
    footerText: optionalText(s.footerText),
    returnPolicy: optionalText(s.returnPolicy),
    privacyPolicy: optionalText(s.privacyPolicy),
    termsConditions: optionalText(s.termsConditions),
    shippingPolicy: optionalText(s.shippingPolicy),
    codEnabled:
      typeof s.codEnabled === "boolean"
        ? s.codEnabled
        : DEFAULT_STORE_SETTINGS.codEnabled,
    minOrderValue: decimalText(s.minOrderValue),
    socialShareImage: optionalText(s.socialShareImage),
    primaryHsl: hexToHsl(primaryColor),
    accentHsl: hexToHsl(accentColor),
    buttonHsl: hexToHsl(buttonColor),
    backgroundHsl: hexToHsl(backgroundColor),
    textHsl: hexToHsl(textColor),
  };
}

let defaultSettingsCache: PublicStoreSettings | null = null;

function defaultPublicSettings(): PublicStoreSettings {
  if (!defaultSettingsCache) {
    defaultSettingsCache = toPublic({ ...DEFAULT_STORE_SETTINGS });
  }
  return defaultSettingsCache;
}

export async function getStoreSettings(): Promise<PublicStoreSettings> {
  try {
    const row = await prisma.storeSetting.findUnique({ where: { id: 1 } });
    if (row) return toPublic(row);

    // First run: create the singleton settings row with safe defaults. If a
    // concurrent request beats us to it, fall back to reading the row again.
    try {
      const created = await prisma.storeSetting.create({
        data: { id: 1, ...DEFAULT_STORE_SETTINGS },
      });
      return toPublic(created);
    } catch (createError) {
      const retry = await prisma.storeSetting
        .findUnique({ where: { id: 1 } })
        .catch(() => null);
      if (retry) return toPublic(retry);
      logError("settings.createDefault", createError);
      return defaultPublicSettings();
    }
  } catch (error) {
    // The storefront layout depends on settings. Never let a database outage
    // take down every page — render with the bundled defaults instead.
    logError("settings.getStoreSettings", error);
    return defaultPublicSettings();
  }
}

export async function updateStoreSettings(data: Partial<StoreSetting>, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.storeSetting.upsert({
      where: { id: 1 }, update: { ...data, id: 1 }, create: { id: 1, ...DEFAULT_STORE_SETTINGS, ...data },
    });
    await audit(tx, { userId: adminId, action: "STORE_SETTINGS_UPDATE", entity: "StoreSetting", entityId: "1",
      detail: { fields: Object.keys(data), codEnabled: settings.codEnabled, minOrderValue: settings.minOrderValue?.toFixed(2) ?? null } });
    return settings;
  });
}

export async function getDeliveryZones() {
  return prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { charge: "asc" },
  });
}

export async function getAllDeliveryZones() {
  return prisma.deliveryZone.findMany({ orderBy: { name: "asc" } });
}

type ZoneData = { name: string; charge: number; estimatedDays?: string; districts: string[]; isActive: boolean };

export async function saveDeliveryZone(id: string | null, data: ZoneData, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const zone = await (id ? tx.deliveryZone.update({ where: { id }, data }) : tx.deliveryZone.create({ data }));
    await audit(tx, { userId: adminId, action: id ? "DELIVERY_ZONE_UPDATE" : "DELIVERY_ZONE_CREATE", entity: "DeliveryZone", entityId: zone.id,
      detail: { active: zone.isActive, districtCount: zone.districts.length, charge: zone.charge.toFixed(2) } });
    return zone;
  });
}

export async function deleteDeliveryZone(id: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const zone = await tx.deliveryZone.update({ where: { id }, data: { isActive: false } });
    await audit(tx, { userId: adminId, action: "DELIVERY_ZONE_ARCHIVE", entity: "DeliveryZone", entityId: id });
    return zone;
  });
}
