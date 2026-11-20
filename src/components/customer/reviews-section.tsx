import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import type { SafeHomepageSection } from "@/types/domain";
import type { Review } from "@prisma/client";

export function ReviewsSection({
  section, reviews,
}: {
  section: SafeHomepageSection;
  reviews: (Review & { product?: { images: { url: string }[] } | null })[] | undefined;
}) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="container-page py-12">
      {(section.title || section.subtitle) && (
        <div className="mb-8 text-center">
          {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
          {section.subtitle && <p className="mt-1 text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.customerName}</span>
                {r.city && <span className="text-xs text-muted-foreground">{r.city}</span>}
              </div>
              <BadgeCheck className="h-4 w-4 text-green-600" />
            </div>
            <div className="mb-2 flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
              ))}
            </div>
            {r.title && <p className="font-medium text-sm">{r.title}</p>}
            <p className="text-sm text-muted-foreground">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
