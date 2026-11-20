import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Shapes } from "lucide-react";
import type { SafeHomepageSection } from "@/types/domain";
import type { Category } from "@prisma/client";

export function CategoryShowcase({ section, categories }: {
  section: SafeHomepageSection;
  categories: (Category & { _count?: { products: number } })[] | undefined;
}) {
  if (!categories?.length) return null;
  return <section className="container-page py-8 lg:py-11">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div><p className="eyebrow mb-2 text-primary">The collections</p>
        {section.title && <h2 className="section-title">{section.title}</h2>}
        {section.subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{section.subtitle}</p>}
      </div>
      <Link href="/products" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold hover:text-primary hover:underline">Browse all <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {categories.map(cat => <Link key={cat.id} href={`/products?category=${encodeURIComponent(cat.slug)}`} className="surface group flex items-center gap-2.5 p-3 transition-colors hover:border-primary/50 sm:gap-3.5 sm:p-4">
        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#e8effd] text-[#244eab] sm:size-12">
          {cat.image ? <Image src={cat.image} alt="" fill sizes="48px" className="object-cover" /> : <Shapes className="size-[1.15rem]" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1 text-xs font-bold text-foreground sm:text-sm">{cat.name}</span>
        <ArrowUpRight className="hidden size-4 shrink-0 text-muted-foreground group-hover:text-primary sm:block" aria-hidden="true" />
      </Link>)}
    </div>
  </section>;
}
