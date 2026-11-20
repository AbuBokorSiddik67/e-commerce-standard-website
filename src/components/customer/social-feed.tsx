import Image from "next/image";
import { Instagram } from "lucide-react";
import type { SafeHomepageSection } from "@/types/domain";

type SocialSettings = {
  instagramUrl: string | null;
};

export function SocialFeed({
  section,
  settings,
}: {
  section: SafeHomepageSection;
  settings: SocialSettings;
}) {
  const s = (section.settings ?? {}) as {
    images?: string[];
    profileUrl?: string;
  };
  const images = (s.images ?? []).filter(Boolean);
  const profileUrl = s.profileUrl || settings.instagramUrl;

  if (images.length === 0) return null;

  return (
    <section className="container-page py-12">
      {(section.title || section.subtitle) && (
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
          {section.subtitle && <p className="text-sm text-muted-foreground">{section.subtitle}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {images.slice(0, 6).map((src, i) => (
          <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            <Image
              src={src}
              alt={`Social post ${i + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {profileUrl && (
        <div className="mt-6 text-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Instagram className="h-4 w-4" />
            Follow us
          </a>
        </div>
      )}
    </section>
  );
}
