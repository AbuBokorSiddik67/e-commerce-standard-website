import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({ page, pages, base, query = {}, label = "Pagination" }: { page: number; pages: number; base: string; query?: Record<string, string | undefined>; label?: string }) {
  if (page <= 1 && pages <= 1) return null;
  const last = Math.max(1, pages);
  function href(number: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (key !== "page" && typeof value === "string" && value) params.set(key, value);
    params.set("page", String(number));
    return `${base}?${params}`;
  }
  return <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-3 pt-3">
    {page > 1 && <Button asChild variant="outline"><Link href={href(Math.min(page - 1, last))}><ArrowLeft className="size-4" aria-hidden="true" /> Previous</Link></Button>}
    <span className="px-1 text-sm font-semibold text-muted-foreground">{page > last ? "Page unavailable" : `Page ${page} of ${last}`}</span>
    {page < last && <Button asChild variant="outline"><Link href={href(page + 1)}>Next <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>}
  </nav>;
}
