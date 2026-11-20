import Image from "next/image";
import Link from "next/link";
import type { SafeHomepageSection } from "@/types/domain";
import type { Category } from "@prisma/client";

export function CategoryShowcase({
  section, categories,
}: {
  section: SafeHomepageSection;
  categories: (Category & { _count?: { products: number } })[] | undefined;
}) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="container-page py-10">
      {(section.title || section.subtitle) && (
        <div className="mb-6 text-center">
          {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
          {section.subtitle && <p className="mt-1 text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[4/3]">
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted text-2xl font-bold text-muted-foreground">
                  {cat.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="font-semibold">{cat.name}</p>
                {cat._count && (
                  <p className="text-xs text-white/70">{cat._count.products} products</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
