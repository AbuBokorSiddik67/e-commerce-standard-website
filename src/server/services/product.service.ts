import { PublicError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ProductInput } from "@/lib/validations/admin";
import { audit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { orderTransaction } from "./order-transaction";

type DecimalInput = number | string;

function toDecimal(v: DecimalInput | null | undefined): Prisma.Decimal | null | undefined {
  if (v === null || v === undefined || v === "") return v === "" ? null : undefined;
  return new Prisma.Decimal(v);
}

export async function createProduct(input: ProductInput, adminId: string) {
  if (input.variants.some((v) => v.id)) throw new PublicError("New variants must not provide existing IDs");
  const slug = input.slug ? slugify(input.slug) : slugify(input.name) + "-" + Date.now().toString(36);
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
    data: {
      name: input.name,
      slug,
      shortDesc: input.shortDesc || null,
      description: input.description || null,
      price: input.price,
      compareAtPrice: toDecimal(input.compareAtPrice) ?? null,
      costPrice: toDecimal(input.costPrice) ?? null,
      sku: input.sku || null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      isFeatured: input.isFeatured,
      isActive: input.isActive,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      weightGrams: input.weightGrams ? Number(input.weightGrams) : null,
      categories: { connect: input.categoryIds.map((id) => ({ id })) },
      images: {
        create: input.images.map((img, i) => ({
          url: img.url,
          altText: img.altText || null,
          sortOrder: i,
        })),
      },
      variants: {
        create: input.variants.map((v) => ({
          name: v.name,
          value: v.value,
          sku: v.sku || null,
          price: toDecimal(v.price),
          stock: v.stock,
        })),
      },
    },
  });
    await audit(tx, { userId: adminId, action: "PRODUCT_CREATE", entity: "Product", entityId: product.id,
      detail: { stock: product.stock, variantStock: input.variants.map((item) => item.stock) } });
    return product;
  });
}

export async function updateProduct(id: string, input: ProductInput, adminId: string) {
  const slug = input.slug ? slugify(input.slug) : undefined;
  return orderTransaction(async (tx) => {
    const current = await tx.product.findUniqueOrThrow({ where: { id }, select: {
      stock: true, variants: { where: { isActive: true }, select: { id: true, stock: true } },
    } });
    const editedIds = input.variants.flatMap((variant) => variant.id ? [variant.id] : []);
    if (new Set(editedIds).size !== editedIds.length) throw new PublicError("Duplicate variant IDs");
    const existing = new Map(current.variants.map((variant) => [variant.id, variant]));
    if (input.originalVariantIds) {
      const prior = new Set(input.originalVariantIds);
      if (prior.size !== existing.size || [...prior].some((variantId) => !existing.has(variantId))) {
        throw new PublicError("Variants changed after opening this form. Reload before editing.");
      }
    }
    const checkStock = (stored: number, prior: number | undefined, requested: number) => {
      if (requested === prior || requested === stored) return undefined;
      if (prior !== stored) throw new PublicError("Stock was changed after opening this form. Reload before making an adjustment.");
      return requested;
    };
    const baseStock = checkStock(current.stock, input.originalStock, input.stock);
    const saved = await tx.product.update({ where: { id },
      data: {
        name: input.name,
        ...(slug ? { slug } : {}),
        shortDesc: input.shortDesc || null,
        description: input.description || null,
        price: input.price,
        compareAtPrice: toDecimal(input.compareAtPrice) ?? null,
        costPrice: toDecimal(input.costPrice) ?? null,
        sku: input.sku || null,
        ...(baseStock === undefined ? {} : { stock: baseStock }),
        lowStockThreshold: input.lowStockThreshold,
        isFeatured: input.isFeatured,
        isActive: input.isActive,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        weightGrams: input.weightGrams ? Number(input.weightGrams) : null,
        categories: { set: input.categoryIds.map((cid) => ({ id: cid })) },
        images: {
          deleteMany: {},
          create: input.images.map((img, i) => ({
            url: img.url,
            altText: img.altText || null,
            sortOrder: i,
          })),
        },
      },
    });
    const removed = current.variants.filter((variant) => !editedIds.includes(variant.id));
    if (removed.length) await tx.productVariant.updateMany({
      where: { productId: id, id: { in: removed.map((variant) => variant.id) } }, data: { isActive: false },
    });
    const movements: { variantId: string; from: number | null; to: number }[] = [];
    for (const variant of input.variants) {
      const values = { name: variant.name, value: variant.value, sku: variant.sku || null, price: toDecimal(variant.price) ?? null };
      if (!variant.id) {
        const created = await tx.productVariant.create({ data: { ...values, productId: id, stock: variant.stock }, select: { id: true } });
        movements.push({ variantId: created.id, from: null, to: variant.stock });
      } else {
        const row = existing.get(variant.id);
        if (!row) throw new PublicError("A variant does not belong to this active product. Reload before editing.");
        const stock = checkStock(row.stock, variant.originalStock, variant.stock);
        await tx.productVariant.update({ where: { id: row.id }, data: { ...values, ...(stock === undefined ? {} : { stock }) } });
        if (stock !== undefined) movements.push({ variantId: row.id, from: row.stock, to: stock });
      }
    }
    await audit(tx, { userId: adminId, action: "PRODUCT_UPDATE", entity: "Product", entityId: id,
      detail: { archivedVariantIds: removed.map((item) => item.id) } });
    if (movements.length || baseStock !== undefined) await audit(tx, { userId: adminId, action: "INVENTORY_UPDATE", entity: "Product", entityId: id,
      detail: { product: baseStock === undefined ? null : { from: current.stock, to: baseStock }, variants: movements } });
    return saved;
  });
}

export async function deleteProduct(id: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({ where: { id }, data: { isActive: false } });
    await audit(tx, { userId: adminId, action: "PRODUCT_ARCHIVE", entity: "Product", entityId: id });
    return product;
  });
}

export async function bulkUpdateProducts(ids: string[], data: { isActive?: boolean; isFeatured?: boolean }, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.product.updateMany({ where: { id: { in: ids } }, data });
    await audit(tx, { userId: adminId, action: "PRODUCT_BULK_UPDATE", entity: "Product", detail: { ids, count: result.count, data } });
    return result;
  });
}

export async function bulkDeleteProducts(ids: string[], adminId: string) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.product.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    await audit(tx, { userId: adminId, action: "PRODUCT_BULK_ARCHIVE", entity: "Product", detail: { ids, count: result.count } });
    return result;
  });
}
