import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { attempt } from "@/lib/errors";
import { isWishlisted } from "@/server/services/account.service";

// Display enrichment only. Inventory and pricing continue to use existing services.
export async function catalogDisplay(ids: string[]) {
  const [ratings, wishlist] = await Promise.all([
    attempt("catalog.approvedRatings", async () => ids.length ? prisma.review.groupBy({
      by: ["productId"], where: { productId: { in: ids }, isApproved: true }, _avg: { rating: true }, _count: { rating: true },
    }) : []),
    attempt("catalog.wishlist", async () => {
      const session = ids.length ? await auth() : null;
      return session?.user.role === "CUSTOMER" ? isWishlisted(session.user.id, ids) : new Set<string>();
    }),
  ]);
  return {
    ratings: new Map(ratings.ok ? ratings.value.map(r => [r.productId, { average: r._avg.rating ?? 0, count: r._count.rating }]) : []),
    wishlist: wishlist.ok ? wishlist.value : new Set<string>(),
  };
}
