"use client";

import Image from "next/image";
import { safeImageUrl } from "@/lib/safe-urls";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } from "@/lib/constants";

export function ImageUploader({
  value, onChange, multiple = false, label = "Upload image",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const arr = Array.from(files);
    if (arr.length > 4) { toast.error("Select up to four images per upload"); return; }
    for (const file of arr) {
      if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, or WebP images are allowed`);
        return;
      }
      if (file.size > IMAGE_MAX_SIZE) {
        toast.error(`${file.name} is too large (max 4MB)`);
        return;
      }
    }
    setUploading(true);
    try {
      const formData = new FormData();
      arr.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const data = await res.json();
      const urls: string[] = data.urls;
      onChange(multiple ? [...value, ...urls] : urls.slice(0, 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ALLOWED_TYPES.join(",")}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-accent"
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
        {uploading ? "Uploading..." : label}
      </button>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url + i} className="group relative h-20 w-20 overflow-hidden rounded-md border">
              {safeImageUrl(url) ? <Image src={url} alt="" fill sizes="80px" className="object-cover" /> :
                // Display-only fallback for old previews; these cannot be newly saved by the media validator.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover" />}

              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove image ${i + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length === 0 && (
        <Input
          placeholder="...or paste an image URL"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) onChange(multiple ? [...value, v] : [v]);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}
