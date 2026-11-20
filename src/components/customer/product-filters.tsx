"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

type SearchParams = Record<string, string | undefined>;
const sortOptions = [["newest", "Newest"], ["price_low", "Price: low to high"], ["price_high", "Price: high to low"], ["best_selling", "Best selling"]];

export function ProductFilters({ categories, current, currency, count }: { categories: { id: string; name: string; slug: string }[]; current: SearchParams; currency: string; count: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  function form(label: string) {
    return <form action="/products" className="space-y-5" aria-label={label} onSubmit={event => {
      event.preventDefault();
      const params = new URLSearchParams();
      new FormData(event.currentTarget).forEach((v, k) => { if (v) params.set(k, String(v)); });
      setOpen(false);
      router.push(`/products?${params}`);
    }}>
      {current.search && <input type="hidden" name="search" value={current.search} />}
      {current.sort && <input type="hidden" name="sort" value={current.sort} />}
      <label className="grid gap-2 text-sm font-semibold">Category
        <select name="category" defaultValue={current.category ?? ""} className="h-10 min-w-0 rounded-lg border border-input bg-card px-2 text-sm font-normal"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
      </label>
      <fieldset className="border-t pt-4"><legend className="pr-2 text-sm font-semibold">Price ({currency})</legend>
        <div className="grid grid-cols-2 gap-2">{([ ["minPrice", "Minimum"], ["maxPrice", "Maximum"] ] as const).map(([key, title]) => <label key={key} className="min-w-0 space-y-1 text-xs text-muted-foreground">{title}<Input type="number" name={key} min={0} step="0.01" defaultValue={current[key] ?? ""} /></label>)}</div>
      </fieldset>
      <label className="flex min-h-10 items-center gap-2 text-sm font-medium"><input name="inStock" type="checkbox" value="true" defaultChecked={current.inStock === "true"} className="size-4 accent-primary" /> In stock only</label>
      <Button type="submit" className="w-full">Apply filters</Button>
    </form>;
  }
  const reset = <Link href={current.search ? `/products?search=${encodeURIComponent(current.search)}` : "/products"} onClick={() => setOpen(false)} className="text-xs font-semibold text-primary underline underline-offset-4">Clear</Link>;
  return <>
    <aside className="surface hidden self-start p-4 lg:block xl:p-5" aria-label="Catalog filters"><div className="mb-5 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="size-4" /> Filters</h2>{reset}</div>{form("Filter products")}</aside>
    <div className="lg:hidden"><Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline"><SlidersHorizontal className="size-4" /> Filters{count > 0 ? ` (${count})` : ""}</Button></SheetTrigger>
      <SheetContent className="w-[min(22rem,90vw)] overflow-auto"><SheetTitle>Catalog filters</SheetTitle><SheetDescription>Narrow down by category, price or stock.</SheetDescription><div className="mb-5 mt-2">{reset}</div>{form("Filter products")}</SheetContent>
    </Sheet></div>
  </>;
}

export function ProductSort({ current }: { current: SearchParams }) {
  const router = useRouter();
  return <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="hidden sm:inline">Sort by</span><select aria-label="Sort products" value={current.sort ?? "newest"} className="h-10 max-w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground" onChange={event => {
    const p = new URLSearchParams();
    Object.entries(current).forEach(([k,v]) => { if (v && k !== 'page') p.set(k,v); });
    p.set("sort", event.target.value);
    router.push(`/products?${p}`);
  }}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
}
