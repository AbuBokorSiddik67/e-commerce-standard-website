"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveBannerAction, deleteBannerAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUploader } from "./image-uploader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  image: string;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};

function BannerFormFields({
  banner, onDone,
}: {
  banner?: Banner | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(banner?.ctaText ?? "");
  const [ctaLink, setCtaLink] = useState(banner?.ctaLink ?? "");
  const [image, setImage] = useState<string[]>(banner?.image ? [banner.image] : []);
  const [position, setPosition] = useState(banner?.position ?? "home_mid");
  const [sortOrder, setSortOrder] = useState((banner?.sortOrder ?? 0).toString());
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!image[0]) { toast.error("Please upload a banner image"); return; }
    const fd = new FormData();
    fd.set("title", title);
    fd.set("subtitle", subtitle);
    fd.set("ctaText", ctaText);
    fd.set("ctaLink", ctaLink);
    fd.set("image", image[0]);
    fd.set("position", position);
    fd.set("sortOrder", sortOrder);
    fd.set("isActive", isActive ? "true" : "false");
    start(async () => {
      const res = await saveBannerAction(banner?.id ?? null, fd);
      if (res.success) { toast.success("Banner saved"); router.refresh(); onDone(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </div>
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={300} />
      </div>
      <div className="space-y-2">
        <Label>Image *</Label>
        <ImageUploader value={image} onChange={setImage} label="Upload banner image" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>CTA Text</Label>
          <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={50} />
        </div>
        <div className="space-y-2">
          <Label>CTA Link</Label>
          <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/products" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Position</Label>
          <select value={position} onChange={(e) => setPosition(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="home_hero">Hero slider</option>
            <option value="home_side">Hero side card</option>
            <option value="home_mid">Offer banner (middle)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Sort Order</Label>
          <Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {banner?.id ? "Update" : "Create"} Banner
      </Button>
    </form>
  );
}

export function BannerManager({ banners }: { banners: Banner[] }) {
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add Banner</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Banner" : "New Banner"}</DialogTitle></DialogHeader>
            <BannerFormFields banner={editing} onDone={() => { setOpen(false); setEditing(null); }} />
          </DialogContent>
        </Dialog>
      </div>

      {banners.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No banners yet. Create one to show promotions on the homepage.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="relative h-36 bg-muted">
                {b.image && <Image src={b.image} alt={b.title ?? "Banner"} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 30vw" className="object-cover" />}
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{b.title || "Untitled"}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{b.subtitle}</p>
                  </div>
                  <Badge variant={b.isActive ? "secondary" : "outline"}>{b.isActive ? "Active" : "Off"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {b.position === "home_hero" ? "Hero" : b.position === "home_side" ? "Hero side" : "Offer"} · #{b.sortOrder}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(b); setOpen(true); }} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this banner?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deleting}
                            onClick={(e) => {
                              e.preventDefault();
                              startDelete(async () => {
                                const res = await deleteBannerAction(b.id);
                                if (res.success) { toast.success("Deleted"); router.refresh(); }
                                else toast.error(res.error ?? "Failed");
                              });
                            }}
                          >
                            {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
