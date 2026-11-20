import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeading({ label, title, description, action }: { label?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
    <div className="min-w-0"><p className="eyebrow mb-2 text-primary">{label ?? "ShopBD"}</p><h1 className="page-title break-words">{title}</h1>
    {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}</div>{action}
  </div>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="mb-5 text-xs font-medium text-muted-foreground"><ol className="flex flex-wrap items-center gap-2">
    {items.map(({ label, href }, i) => <li key={`${i}-${label}`} className="flex min-w-0 items-center gap-2">
      {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
      {href ? <Link href={href} className="hover:text-primary hover:underline">{label}</Link> : <span aria-current="page" className="text-foreground">{label}</span>}
    </li>)}
  </ol></nav>;
}

export function EmptyState({ icon: Icon, title, description, href, action }: { icon: LucideIcon; title: string; description: string; href?: string; action?: string }) {
  return <div className="surface flex flex-col items-center gap-3 px-5 py-14 text-center sm:py-20">
    <div className="mb-1 grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-6" aria-hidden="true" /></div>
    <h2 className="text-xl font-bold tracking-tight">{title}</h2><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
    {href && action && <Button asChild className="mt-2"><Link href={href}>{action}</Link></Button>}
  </div>;
}
