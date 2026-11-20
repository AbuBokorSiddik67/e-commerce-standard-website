"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveHomepageSectionAction,
  reorderHomepageAction,
  createHomepageSectionAction,
  deleteHomepageSectionAction,
  saveBannerAction,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ImageUploader } from "./image-uploader";
import { ChevronDown, ChevronUp, Pencil, Loader2, Plus, Trash2 } from "lucide-react";
import { HOMEPAGE_SECTIONS } from "@/lib/constants";

type Section = {
  id: string;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  isActive: boolean;
  sortOrder: number;
  settings: Record<string, unknown> | null;
  productIds: string[];
  categoryIds: string[];
};

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
};

type SectionItem = {
  icon: string;
  title: string;
  desc: string;
};

type ReviewOption = {
  id: string;
  customerName: string;
  body: string;
  rating: number;
};

const BANNER_SECTIONS = ["HERO", "OFFER_BANNER"];
const ITEM_SECTIONS = ["TRUST_STRIP", "WHY_SHOP"];
const PRODUCT_SECTIONS = ["NEW_ARRIVALS", "BEST_SELLERS", "FEATURED_COLLECTION"];
const LIMIT_SECTIONS = ["SHOP_BY_CATEGORY", "NEW_ARRIVALS", "BEST_SELLERS", "FEATURED_COLLECTION", "REVIEWS"];
const ICON_OPTIONS = ["Truck", "Banknote", "RotateCcw", "ShieldCheck", "Headset", "PackageCheck"];

const DEFAULT_VIEW_ALL: Record<string, { text: string; href: string }> = {
  NEW_ARRIVALS: { text: "View All", href: "/products?sort=newest" },
  BEST_SELLERS: { text: "View All", href: "/products?sort=best_selling" },
  FEATURED_COLLECTION: { text: "View All", href: "/products" },
};

function bannerPosition(sectionKey: string) {
  return sectionKey === "HERO" ? "home_hero" : "home_mid";
}

export function HomepageEditor({
  sections,
  products,
  categories,
  banners,
  reviews,
}: {
  sections: Section[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  banners: Banner[];
  reviews: ReviewOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Section | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const availableSections = HOMEPAGE_SECTIONS.filter(
    (h) => !sections.some((s) => s.sectionKey === h.key),
  );

  function move(index: number, dir: -1 | 1) {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    start(async () => {
      const res = await reorderHomepageAction(next.map((s, i) => ({ id: s.id, sortOrder: i + 1 })));
      if (res.success) { router.refresh(); }
      else toast.error(res.error ?? "Failed to reorder");
    });
  }

  function toggleActive(section: Section) {
    start(async () => {
      const fd = new FormData();
      fd.set("sectionKey", section.sectionKey);
      fd.set("title", section.title ?? "");
      fd.set("subtitle", section.subtitle ?? "");
      fd.set("isActive", (!section.isActive) ? "true" : "false");
      fd.set("sortOrder", section.sortOrder.toString());
      fd.set("productIds", JSON.stringify(section.productIds));
      fd.set("categoryIds", JSON.stringify(section.categoryIds));
      fd.set("settings", JSON.stringify(section.settings ?? {}));
      const res = await saveHomepageSectionAction(fd);
      if (res.success) { toast.success("Section updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  function createSection(sectionKey: string) {
    start(async () => {
      const res = await createHomepageSectionAction(sectionKey);
      if (res.success) {
        toast.success("Section added");
        setCreateOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to add section");
      }
    });
  }

  function deleteSection(id: string) {
    start(async () => {
      const res = await deleteHomepageSectionAction(id);
      if (res.success) { toast.success("Section deleted"); router.refresh(); }
      else toast.error(res.error ?? "Failed to delete section");
    });
  }

  const editingBanner = editing && BANNER_SECTIONS.includes(editing.sectionKey)
    ? banners.find((b) => b.position === bannerPosition(editing.sectionKey))
    : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sections.length} section{sections.length === 1 ? "" : "s"} on your homepage
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableSections.length === 0}>
              <Plus className="h-4 w-4" /> Add Section
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add homepage section</DialogTitle></DialogHeader>
            {availableSections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All available sections are already on your homepage.
              </p>
            ) : (
              <div className="space-y-2">
                {availableSections.map((h) => (
                  <Button
                    key={h.key}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() => createSection(h.key)}
                  >
                    <Plus className="h-4 w-4" /> {h.label}
                  </Button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {sections.map((s, i) => {
        const meta = HOMEPAGE_SECTIONS.find((h) => h.key === s.sectionKey);
        return (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label="Move up" className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === sections.length - 1 || pending} aria-label="Move down" className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{meta?.label ?? s.sectionKey}</p>
                <p className="truncate text-xs text-muted-foreground">{s.title ?? s.subtitle ?? "No custom content"}</p>
              </div>
              <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s)} aria-label="Show/hide section" />
              <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label="Edit section">
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete section">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this section?</AlertDialogTitle>
                    <AlertDialogDescription>
                      &quot;{meta?.label ?? s.sectionKey}&quot; will be removed from the homepage. You can add it back later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={pending}
                      onClick={(e) => { e.preventDefault(); deleteSection(s.id); }}
                    >
                      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {HOMEPAGE_SECTIONS.find((h) => h.key === editing?.sectionKey)?.label}</DialogTitle></DialogHeader>
          {editing && (
            <SectionEditForm
              key={editing.id}
              section={editing}
              banner={editingBanner}
              heroBanners={banners.filter((b) => b.position === "home_hero")}
              products={products}
              categories={categories}
              reviews={reviews}
              onDone={() => { setEditing(null); router.refresh(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionEditForm({
  section, banner, heroBanners, products, categories, reviews, onDone,
}: {
  section: Section;
  banner?: Banner;
  heroBanners: Banner[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  reviews: ReviewOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const settings = (section.settings ?? {}) as Record<string, unknown>;
  const showBannerFields = BANNER_SECTIONS.includes(section.sectionKey);
  const showItemEditor = ITEM_SECTIONS.includes(section.sectionKey);
  const showProductPicker = PRODUCT_SECTIONS.includes(section.sectionKey);
  const showCategoryPicker = section.sectionKey === "SHOP_BY_CATEGORY";
  const showLimit = LIMIT_SECTIONS.includes(section.sectionKey);
  const showReviewPicker = section.sectionKey === "REVIEWS";
  const viewAllDefault = DEFAULT_VIEW_ALL[section.sectionKey];

  const [title, setTitle] = useState(section.title ?? "");
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [isActive, setIsActive] = useState(section.isActive);
  const [productIds, setProductIds] = useState<string[]>(section.productIds);
  const [categoryIds, setCategoryIds] = useState<string[]>(section.categoryIds);
  const [limit, setLimit] = useState((settings.limit as number ?? 8).toString());
  const [items, setItems] = useState<SectionItem[]>(
    Array.isArray(settings.items) ? (settings.items as SectionItem[]) : [],
  );
  const [socialImages, setSocialImages] = useState<string[]>(
    Array.isArray(settings.images) ? (settings.images as string[]) : [],
  );
  const [profileUrl, setProfileUrl] = useState((settings.profileUrl as string) ?? "");
  const [whatsappUrl, setWhatsappUrl] = useState((settings.whatsappUrl as string) ?? "");
  const [reviewIds, setReviewIds] = useState<string[]>(
    Array.isArray(settings.reviewIds) ? (settings.reviewIds as string[]) : [],
  );
  const [viewAllText, setViewAllText] = useState(
    (settings.viewAllText as string) ?? viewAllDefault?.text ?? "",
  );
  const [viewAllHref, setViewAllHref] = useState(
    (settings.viewAllHref as string) ?? viewAllDefault?.href ?? "",
  );
  const [image, setImage] = useState<string[]>(banner?.image ? [banner.image] : []);
  const [ctaText, setCtaText] = useState(banner?.ctaText ?? (settings.primaryCtaText as string) ?? "");
  const [ctaLink, setCtaLink] = useState(banner?.ctaLink ?? (settings.primaryCtaLink as string) ?? "");
  const [mobileImages, setMobileImages] = useState<Record<string, string>>(() => {
    const raw = settings.mobileImages;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  });

  function updateItem(index: number, patch: Partial<SectionItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("sectionKey", section.sectionKey);
    fd.set("title", title);
    fd.set("subtitle", subtitle);
    fd.set("isActive", isActive ? "true" : "false");
    fd.set("sortOrder", section.sortOrder.toString());
    fd.set("productIds", JSON.stringify(productIds));
    fd.set("categoryIds", JSON.stringify(categoryIds));
    fd.set(
      "settings",
      JSON.stringify({
        ...settings,
        ...(showLimit ? { limit: Number(limit) } : {}),
        ...(showBannerFields
          ? {
              primaryCtaText: ctaText.trim(),
              primaryCtaLink: ctaLink.trim(),
            }
          : {}),
        ...(section.sectionKey === "HERO" ? { mobileImages } : {}),
        ...(showItemEditor ? { items } : {}),
        ...(showProductPicker
          ? {
              viewAllText: viewAllText.trim(),
              viewAllHref: viewAllHref.trim(),
            }
          : {}),
        ...(showReviewPicker ? { reviewIds } : {}),
        ...(section.sectionKey === "SOCIAL_FEED"
          ? {
              images: socialImages.filter(Boolean),
              profileUrl: profileUrl.trim(),
            }
          : {}),
        ...(section.sectionKey === "NEWSLETTER_CTA"
          ? { whatsappUrl: whatsappUrl.trim() }
          : {}),
      }),
    );
    start(async () => {
      if (showBannerFields && image[0]) {
        const bfd = new FormData();
        bfd.set("title", title);
        bfd.set("subtitle", subtitle);
        bfd.set("ctaText", ctaText.trim());
        bfd.set("ctaLink", ctaLink.trim());
        bfd.set("image", image[0]);
        bfd.set("position", bannerPosition(section.sectionKey));
        bfd.set("sortOrder", String(banner?.sortOrder ?? 0));
        bfd.set("isActive", "true");
        const bres = await saveBannerAction(banner?.id ?? null, bfd);
        if (!bres.success) {
          toast.error(bres.error ?? "Failed to save banner image");
          return;
        }
      }
      const res = await saveHomepageSectionAction(fd);
      if (res.success) { toast.success("Saved"); router.refresh(); onDone(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {section.sectionKey !== "HERO" && (
        <>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={300} />
          </div>
        </>
      )}

      {showBannerFields && (
        <>
          <div className="space-y-2">
            <Label>{section.sectionKey === "HERO" ? "Hero banner image" : "Offer banner image"}</Label>
            <ImageUploader value={image} onChange={setImage} label="Upload banner image" />
            {!image[0] && (
              <p className="text-xs text-muted-foreground">
                Upload an image to display this banner on the homepage.
              </p>
            )}
            {section.sectionKey === "HERO" && (
              <p className="text-xs text-muted-foreground">
                The hero is a slider with no text overlay; clicking the image opens the link.
                Add more slides from Banners with position &quot;Hero slider&quot;.
              </p>
            )}
          </div>
          <div className={section.sectionKey === "HERO" ? "space-y-2" : "grid grid-cols-2 gap-3"}>
            {section.sectionKey !== "HERO" && (
              <div className="space-y-2">
                <Label>Button text</Label>
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={50} placeholder="Shop now" />
              </div>
            )}
            <div className="space-y-2">
              <Label>{section.sectionKey === "HERO" ? "Banner link" : "Button link"}</Label>
              <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/products" />
            </div>
          </div>

          {section.sectionKey === "HERO" && heroBanners.length > 0 && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div>
                <Label>Mobile banner images</Label>
                <p className="text-xs text-muted-foreground">
                  Optional images for screens below 768px. Slides without one use the wide image,
                  shown uncropped over a blurred backdrop.
                </p>
              </div>
              {heroBanners.map((heroBanner, index) => (
                <div key={heroBanner.id} className="space-y-1.5">
                  <p className="text-xs font-medium">
                    Slide {index + 1}
                    {heroBanner.title ? ` · ${heroBanner.title}` : ""}
                  </p>
                  <ImageUploader
                    value={mobileImages[heroBanner.id] ? [mobileImages[heroBanner.id]] : []}
                    onChange={(urls) => {
                      setMobileImages((prev) => {
                        const next = { ...prev };
                        if (urls[0]) next[heroBanner.id] = urls[0];
                        else delete next[heroBanner.id];
                        return next;
                      });
                    }}
                    label="Upload mobile image"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showItemEditor && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { icon: "ShieldCheck", title: "", desc: "" }])}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No items yet. Add items to show this section on the homepage.
            </p>
          )}
          {items.map((item, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <select
                  value={item.icon}
                  onChange={(e) => updateItem(index, { icon: e.target.value })}
                  className="h-10 rounded-md border bg-background px-2 text-sm"
                  aria-label="Icon"
                >
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  placeholder="Title"
                  maxLength={100}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={item.desc}
                onChange={(e) => updateItem(index, { desc: e.target.value })}
                placeholder="Description"
                maxLength={200}
              />
            </div>
          ))}
        </div>
      )}

      {showLimit && (
        <div className="space-y-2">
          <Label>Items to show</Label>
          <Input type="number" min="1" max="12" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
      )}

      {showCategoryPicker && (
        <div className="space-y-2">
          <Label>Categories to display (blank = use &quot;show on home&quot; flag)</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-3">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) => setCategoryIds(e.target.checked ? [...categoryIds, c.id] : categoryIds.filter((id) => id !== c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {showProductPicker && (
        <div className="space-y-2">
          <Label>Products to display (blank = automatic selection)</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-3">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={productIds.includes(p.id)}
                  onChange={(e) => setProductIds(e.target.checked ? [...productIds, p.id] : productIds.filter((id) => id !== p.id))}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {showProductPicker && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>View all text</Label>
            <Input value={viewAllText} onChange={(e) => setViewAllText(e.target.value)} maxLength={50} placeholder="View All" />
          </div>
          <div className="space-y-2">
            <Label>View all link</Label>
            <Input value={viewAllHref} onChange={(e) => setViewAllHref(e.target.value)} placeholder="/products" />
          </div>
        </div>
      )}

      {showReviewPicker && (
        <div className="space-y-2">
          <Label>Reviews to display (blank = featured reviews)</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved reviews available.</p>
            ) : (
              reviews.map((r) => (
                <label key={r.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={reviewIds.includes(r.id)}
                    onChange={(e) => setReviewIds(e.target.checked ? [...reviewIds, r.id] : reviewIds.filter((id) => id !== r.id))}
                  />
                  <span>
                    <span className="font-medium">{r.customerName}</span>{" "}
                    <span className="text-muted-foreground">({r.rating}★) {r.body.slice(0, 80)}</span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {section.sectionKey === "SOCIAL_FEED" && (
        <>
          <div className="space-y-2">
            <Label>Images (up to 6 shown)</Label>
            <ImageUploader
              value={socialImages}
              onChange={setSocialImages}
              multiple
              label="Upload social images"
            />
          </div>
          <div className="space-y-2">
            <Label>Profile URL</Label>
            <Input
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://instagram.com/yourstore"
            />
          </div>
        </>
      )}

      {section.sectionKey === "NEWSLETTER_CTA" && (
        <div className="space-y-2">
          <Label>WhatsApp link</Label>
          <Input
            value={whatsappUrl}
            onChange={(e) => setWhatsappUrl(e.target.value)}
            placeholder="https://wa.me/8801XXXXXXXXX"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label>Section visible</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save Section
      </Button>
    </form>
  );
}
