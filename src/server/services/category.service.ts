import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { CategoryInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";

export async function listCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getHomeCategories(limit = 6) {
  return prisma.category.findMany({
    where: { showOnHome: true, isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
    take: limit,
  });
}

export async function createCategory(input: CategoryInput, adminId: string) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description || null,
      image: input.image || null,
      parentId: input.parentId || null,
      showOnHome: input.showOnHome,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ userId: adminId, action: "CATEGORY_CREATE", entity: "Category", entityId: category.id, detail: { name: category.name } });
  return category;
}

export async function updateCategory(id: string, input: CategoryInput, adminId: string) {
  const slug = input.slug ? slugify(input.slug) : undefined;
  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      ...(slug ? { slug } : {}),
      description: input.description || null,
      image: input.image || null,
      parentId: input.parentId || null,
      showOnHome: input.showOnHome,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ userId: adminId, action: "CATEGORY_UPDATE", entity: "Category", entityId: id, detail: { name: category.name } });
  return category;
}

export async function deleteCategory(id: string, adminId: string) {
  const category = await prisma.category.delete({ where: { id } });
  await writeAuditLog({ userId: adminId, action: "CATEGORY_DELETE", entity: "Category", entityId: id, detail: { name: category.name } });
  return category;
}
