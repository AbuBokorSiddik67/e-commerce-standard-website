import { cache } from 'react';
import { prisma } from '@/lib/prisma';

// Render-request memo only; live catalog state is never cached across requests.
export const findPublicProduct = cache((slug: string) => prisma.product.findUnique({
  where: { slug, isActive: true },
  select: {
    id: true, slug: true, name: true, shortDesc: true, description: true, price: true, compareAtPrice: true,
    sku: true, stock: true, weightGrams: true, seoTitle: true, seoDescription: true,
    images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, url: true, altText: true } },
    variants: { where: { isActive: true }, select: { id: true, name: true, value: true, sku: true, price: true, stock: true } },
    categories: { where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
    _count: { select: { variants: true } },
  },
}));

export const REVIEWS_PER_PAGE = 12;
export function listProductReviews(productId: string, page: number) {
  return prisma.review.findMany({
    where: { productId, isApproved: true, rating: { gte: 1, lte: 5 } },
    select: { id: true, rating: true, title: true, customerName: true, city: true, body: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: REVIEWS_PER_PAGE, skip: (page - 1) * REVIEWS_PER_PAGE,
  });
}
