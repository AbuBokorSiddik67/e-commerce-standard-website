"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { attempt } from "@/lib/errors";

const input = z.object({ id: z.string().cuid(), approved: z.boolean() });

export async function moderateReviewAction(id: string, approved: boolean) {
  const session = await requireAdmin();
  const parsed = input.safeParse({ id, approved });
  if (!parsed.success) return { success: false, error: "Invalid review request" };
  const result = await attempt("reviews.moderate", () => prisma.$transaction(async tx => {
    const review = await tx.review.update({ where: { id: parsed.data.id }, data: { isApproved: parsed.data.approved }, select: { product: { select: { slug: true } } } });
    await audit(tx, { userId: session.user.id, action: "REVIEW_MODERATE", entity: "Review", entityId: parsed.data.id, detail: { approved: parsed.data.approved } });
    return review.product.slug;
  }));
  if (!result.ok) return { success: false, error: "Could not update review" };
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/product/${result.value}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/homepage");
  return { success: true };
}
