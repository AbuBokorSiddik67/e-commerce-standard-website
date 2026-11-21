import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PUBLIC_CATEGORIES_TAG } from '@/lib/public-cache-tags';

export const listPublicCategories = cache(unstable_cache(() => prisma.category.findMany({
  where: { isActive: true }, select: { id: true, name: true, slug: true, description: true },
  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
}), [PUBLIC_CATEGORIES_TAG], { tags: [PUBLIC_CATEGORIES_TAG], revalidate: 120 }));
