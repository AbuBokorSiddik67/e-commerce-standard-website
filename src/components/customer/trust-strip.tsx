import { Truck, Banknote, RotateCcw, ShieldCheck, Headset, PackageCheck } from "lucide-react";
import type { SafeHomepageSection } from "@/types/domain";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck, Banknote, RotateCcw, ShieldCheck, Headset, PackageCheck,
};

export function TrustStrip({ section }: { section: SafeHomepageSection }) {
  const s = (section.settings ?? {}) as { items?: { icon: string; title: string; desc: string }[] };
  const items = s.items ?? [];

  if (items.length === 0) return null;

  return <section className="container-page pt-4 sm:pt-5" aria-label="Shopping benefits">
    <ul className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-2xl border bg-card p-3 sm:p-5 lg:grid-cols-4 lg:gap-x-6">
      {items.map((item, i) => {
        const Icon = ICONS[item.icon] ?? ShieldCheck;
        return <li key={i} className="flex items-start gap-2.5 sm:items-center sm:gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ebf1ff] text-[#244eab] sm:size-10"><Icon className="size-[1rem] sm:size-[1.15rem]" /></span>
          <div className="min-w-0"><p className="text-xs font-bold sm:text-sm">{item.title}</p><p className="mt-0.5 text-[0.69rem] leading-snug text-muted-foreground sm:text-xs">{item.desc}</p></div>
        </li>;
      })}
    </ul>
  </section>;
}
