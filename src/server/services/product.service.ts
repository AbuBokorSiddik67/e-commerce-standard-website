import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ProductInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type DecimalInput = number | string;

function toDecimal(v: DecimalInput | null | undefined): Prisma.Decimal | null | undefined {
  if (v === null || v === undefined || v === "") return v === "" ? null : undefined;
  return new Prisma.Decimal(v);
}

export async function createProduct(input: ProductInput, adminId: string) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name) + "-" + Date.now().toString(36);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      shortDesc: input.shortDesc || null,
      description: input.description || null,
      price: input.price as any,
      compareAtPrice: toDecimal(input.compareAtPrice) as any,
      costPrice: toDecimal(input.costPrice) as any,
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
          price: toDecimal(v.price) as any,
          stock: v.stock,
        })),
      },
    },
  });
  await writeAuditLog({
    userId: adminId,
    action: "PRODUCT_CREATE",
    entity: "Product",
    entityId: product.id,
    detail: { name: product.name },
  });
  return product;
}

export async function updateProduct(id: string, input: ProductInput, adminId: string) {
  const slug = input.slug ? slugify(input.slug) : undefined;
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      ...(slug ? { slug } : {}),
      shortDesc: input.shortDesc || null,
      description: input.description || null,
      price: input.price as any,
      compareAtPrice: toDecimal(input.compareAtPrice) as any,
      costPrice: toDecimal(input.costPrice) as any,
      sku: input.sku || null,
      stock: input.stock,
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
      variants: {
        deleteMany: {},
        create: input.variants.map((v) => ({
          name: v.name,
          value: v.value,
          sku: v.sku || null,
          price: toDecimal(v.price) as any,
          stock: v.stock,
        })),
      },
    },
  });
  await writeAuditLog({
    userId: adminId,
    action: "PRODUCT_UPDATE",
    entity: "Product",
    entityId: product.id,
    detail: { name: product.name },
  });
  return product;
}

export async function deleteProduct(id: string, adminId: string) {
  const product = await prisma.product.delete({ where: { id } });
  await writeAuditLog({
    userId: adminId,
    action: "PRODUCT_DELETE",
    entity: "Product",
    entityId: id,
    detail: { name: product.name },
  });
  return product;
}

export async function bulkUpdateProducts(ids: string[], data: { isActive?: boolean; isFeatured?: boolean }, adminId: string) {
  const res = await prisma.product.updateMany({ where: { id: { in: ids } }, data });
  await writeAuditLog({
    userId: adminId,
    action: "PRODUCT_BULK_UPDATE",
    entity: "Product",
    detail: { ids, data },
  });
  return res;
}

export async function bulkDeleteProducts(ids: string[], adminId: string) {
  const res = await prisma.product.deleteMany({ where: { id: { in: ids } } });
  await writeAuditLog({
    userId: adminId,
    action: "PRODUCT_BULK_DELETE",
    entity: "Product",
    detail: { ids, count: res.count },
  });
  return res;
}
