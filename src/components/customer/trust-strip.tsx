import { Truck, Banknote, RotateCcw, ShieldCheck, Headset, PackageCheck } from "lucide-react";
import type { SafeHomepageSection } from "@/types/domain";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck, Banknote, RotateCcw, ShieldCheck, Headset, PackageCheck,
};

export function TrustStrip({ section }: { section: SafeHomepageSection }) {
  const s = (section.settings ?? {}) as { items?: { icon: string; title: string; desc: string }[] };
  const items = s.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="relative hidden overflow-hidden border-y bg-gradient-to-r from-primary/[0.04] via-background to-primary/[0.04] py-8 lg:block">
      <div className="pointer-events-none absolute -left-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse [animation-delay:1.5s]" />

      <div className="container-page relative">
        <div className="grid grid-cols-4 gap-4">
          {items.map((item, i) => {
            const Icon = ICONS[item.icon] ?? ShieldCheck;
            return (
              <div
                key={i}
                className="group relative animate-fade-in-up overflow-hidden rounded-2xl border bg-background/70 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
                style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
                    <span className="absolute inset-0 rounded-2xl bg-primary/20 opacity-0 group-hover:animate-ping group-hover:opacity-100" />
                    <Icon className="relative h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
