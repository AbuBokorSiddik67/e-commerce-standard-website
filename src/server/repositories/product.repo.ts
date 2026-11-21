import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { toFiniteNumber, toPositiveInt } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function listProducts(params: {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  perPage?: number;
}) {
  const where: Prisma.ProductWhereInput = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categories = { some: { id: params.categoryId } };
  if (params.isActive !== undefined) where.isActive = params.isActive;

  const page = toPositiveInt(params.page, 1);
  const perPage = toPositiveInt(params.perPage, 12, 100);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, price: true, stock: true, lowStockThreshold: true, isActive: true, isFeatured: true,
        images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 1, select: { url: true } }, categories: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, pages: Math.ceil(total / perPage) };
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true } }, categories: true },
  });
}

const catalogCard = {
  id: true, slug: true, name: true, isActive: true, price: true, compareAtPrice: true, stock: true,
  images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 1, select: { url: true } },
  variants: { where: { isActive: true }, select: { stock: true, price: true } },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect;

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isFeatured: true, isActive: true },
    select: catalogCard,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
  });
}

export const getNewArrivals = cache(async (limit = 8) => {
  return prisma.product.findMany({
    where: { isActive: true },
    select: catalogCard,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
  });
});

export async function getBestSellers(limit = 8) {
  const best = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { product: { isActive: true } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  if (best.length === 0) return getNewArrivals(limit);
  const ids = best.map((b) => b.productId).filter((id): id is string => !!id);
  const items = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: catalogCard,
  });
  items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return items;
}

export async function getRelatedProducts(productId: string, categoryIds: string[], limit = 4) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: productId },
      categories: categoryIds.length ? { some: { id: { in: categoryIds } } } : undefined,
    },
    select: catalogCard,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
  });
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: catalogCard,
  });
  return products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

export async function storefrontListProducts(params: {
  search?: string;
  categorySlug?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}) {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { shortDesc: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.categorySlug) where.categories = { some: { slug: params.categorySlug, isActive: true } };

  const minPrice = toFiniteNumber(params.minPrice);
  const maxPrice = toFiniteNumber(params.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }
  if (params.inStock) where.AND = [{ OR: [
    { variants: { none: {} }, stock: { gt: 0 } },
    { variants: { some: { isActive: true, stock: { gt: 0 } } } },
  ] }];

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    params.sort === "price_low" ? { price: "asc" }
    : params.sort === "price_high" ? { price: "desc" }
    : params.sort === "best_selling" ? { orderItems: { _count: "desc" } }
    : { createdAt: "desc" };

  const page = toPositiveInt(params.page, 1);
  const perPage = toPositiveInt(params.perPage, 12, 100);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: catalogCard,
      orderBy: [orderBy, { id: params.sort === "price_high" ? "desc" : "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, pages: Math.ceil(total / perPage) };
}
