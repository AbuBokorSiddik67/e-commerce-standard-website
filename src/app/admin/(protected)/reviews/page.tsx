import Link from "next/link";
import { Star } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/errors";
import { formatDateTime, toPositiveInt } from "@/lib/utils";
import { PageHeading, EmptyState } from "@/components/shared/page-heading";
import { AppError } from "@/components/shared/app-error";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{status?: string; page?: string}> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status === "published" ? "published" : params.status === "all" ? "all" : "pending";
  const page = toPositiveInt(params.page, 1, 10000);
  const size = 15;
  const where = status === "all" ? {} : { isApproved: status === "published" };
  const result = await attempt("admin.reviews", () => prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, skip: (page - 1) * size, take: size, orderBy: [{createdAt:"desc"}, {id:"desc"}], include: { product: { select: { name: true, slug: true } } } }),
  ]));
  if (!result.ok) return <AppError variant="admin" title="Reviews unavailable" description="Try again in a moment." />;
  const [total, reviews] = result.value;
  const pages = Math.max(1, Math.ceil(total / size));
  return <>
    <PageHeading label="Merchandising" title="Reviews" description="Publish suitable customer reviews or hide them without deleting the original submission." />
    <nav aria-label="Review status" className="mb-4 flex flex-wrap gap-2">{["pending", "published", "all"].map(filter => <Button key={filter} asChild variant={filter === status ? "default" : "outline"}><Link href={`?status=${filter}`} aria-current={filter === status ? "page" : undefined} className="capitalize">{filter}</Link></Button>)}</nav>
    {reviews.length ? <ul className="space-y-3">{reviews.map(r => <li key={r.id} className="surface flex flex-wrap justify-between gap-4 p-4 sm:p-5">
      <div className="min-w-0 max-w-3xl space-y-1.5 break-words"><div className="flex flex-wrap items-center gap-2"><Badge variant={r.isApproved ? "secondary" : "outline"}>{r.isApproved ? "Published" : "Pending"}</Badge><span className="text-sm font-bold">{r.rating}/5 stars</span><span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span></div>
        <Link href={`/product/${r.product.slug}`} className="block text-sm font-bold text-primary hover:underline">{r.product.name}</Link><p className="text-xs text-muted-foreground">{r.customerName}{r.city ? ` · ${r.city}` : ""}</p>{r.title && <p className="font-bold">{r.title}</p>}<p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p></div>
      <ReviewModeration id={r.id} approved={r.isApproved} />
    </li>)}</ul> : <EmptyState icon={Star} title="No reviews on this page" description="New submissions appear in the pending queue." />}
    {pages > 1 || page > 1 ? <nav aria-label="Review pages" className="mt-4 flex flex-wrap items-center gap-3">{page > 1 && <Button asChild variant="outline"><Link href={`?status=${status}&page=${Math.min(page - 1, pages)}`}>Previous</Link></Button>}<span className="text-sm">Page {page} of {pages}</span>{page < pages && <Button asChild variant="outline"><Link href={`?status=${status}&page=${page + 1}`}>Next</Link></Button>}</nav> : null}
  </>;
}
