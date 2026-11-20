"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCategoryAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ImageUploader } from "./image-uploader";

export type CategoryFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parentId: string | null;
  showOnHome: boolean;
  sortOrder: number;
  isActive: boolean;
};

export function CategoryForm({
  category, categories, onDone,
}: {
  category?: CategoryFormValues | null;
  categories: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState<string[]>(category?.image ? [category.image] : []);
  const [parentId, setParentId] = useState(category?.parentId ?? "");
  const [showOnHome, setShowOnHome] = useState(category?.showOnHome ?? false);
  const [sortOrder, setSortOrder] = useState((category?.sortOrder ?? 0).toString());
  const [isActive, setIsActive] = useState(category?.isActive ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", slug);
    fd.set("description", description);
    fd.set("image", image[0] ?? "");
    fd.set("parentId", parentId);
    fd.set("showOnHome", showOnHome ? "true" : "false");
    fd.set("sortOrder", sortOrder);
    fd.set("isActive", isActive ? "true" : "false");
    start(async () => {
      const res = await saveCategoryAction(category?.id ?? null, fd);
      if (res.success) {
        toast.success("Category saved");
        router.refresh();
        onDone?.();
      } else {
        toast.error(res.error ?? "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>Slug (auto if blank)</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Image</Label>
        <ImageUploader value={image} onChange={setImage} label="Upload category image" />
      </div>
      <div className="space-y-2">
        <Label>Parent Category</Label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">None (top level)</option>
          {categories.filter((c) => c.id !== category?.id).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Sort Order</Label>
        <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Show on Homepage</Label>
        <Switch checked={showOnHome} onCheckedChange={setShowOnHome} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {category?.id ? "Update" : "Create"} Category
      </Button>
    </form>
  );
}
