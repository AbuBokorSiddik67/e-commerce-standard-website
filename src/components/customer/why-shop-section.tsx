import { PackageCheck, Truck, Banknote, Headset, ShieldCheck, RotateCcw } from "lucide-react";
import type { SafeHomepageSection } from "@/types/domain";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PackageCheck, Truck, Banknote, Headset, ShieldCheck, RotateCcw,
};

export function WhyShopSection({ section }: { section: SafeHomepageSection }) {
  const s = (section.settings ?? {}) as { items?: { icon: string; title: string; desc: string }[] };
  const items = s.items ?? [];

  if (items.length === 0 && !section.title) return null;

  return (
    <section className="bg-muted/30 py-12">
      <div className="container-page">
        {section.title && (
          <h2 className="mb-8 text-center text-2xl font-bold">{section.title}</h2>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[item.icon] ?? ShieldCheck;
            return (
              <div key={i} className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
