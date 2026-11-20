"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProductAction, deleteProductAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { SafeProduct } from "@/types/domain";

type Category = { id: string; name: string };

type Variant = { name: string; value: string; sku: string; price: string; stock: number };

export function ProductForm({
  product, categories,
}: {
  product?: SafeProduct | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [shortDesc, setShortDesc] = useState(product?.shortDesc ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compareAtPrice ?? "");
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.lowStockThreshold?.toString() ?? "5");
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(product?.categories?.map((c) => c.id) ?? []);
  const [images, setImages] = useState<{ url: string; altText: string }[]>(
    product?.images?.map((i) => ({ url: i.url, altText: i.altText ?? "" })) ?? [],
  );
  const [variants, setVariants] = useState<Variant[]>(product?.variants?.map((v) => ({
    name: v.name, value: v.value, sku: v.sku ?? "", price: v.price ?? "", stock: v.stock,
  })) ?? []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", slug);
    fd.set("shortDesc", shortDesc);
    fd.set("description", description);
    fd.set("price", price);
    fd.set("compareAtPrice", compareAtPrice);
    fd.set("costPrice", costPrice);
    fd.set("sku", sku);
    fd.set("stock", stock || "0");
    fd.set("lowStockThreshold", lowStockThreshold || "5");
    fd.set("isFeatured", isFeatured ? "true" : "false");
    fd.set("isActive", isActive ? "true" : "false");
    fd.set("seoTitle", seoTitle);
    fd.set("seoDescription", seoDescription);
    fd.set("categoryIds", JSON.stringify(selectedCategories));
    fd.set("images", JSON.stringify(images));
    fd.set("variants", JSON.stringify(variants));
    const res = await saveProductAction(product?.id ?? null, fd);
    setSaving(false);
    if (res.success) {
      toast.success("Product saved");
      router.push("/admin/products");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (auto-generated if blank)</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="product-url" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input id="shortDesc" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} maxLength={300} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (৳) *</Label>
                <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare-at Price</Label>
                <Input id="compareAtPrice" type="number" min="0" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input id="costPrice" type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Images</CardTitle></CardHeader>
            <CardContent>
              <ImageUploader
                multiple
                value={images.map((i) => i.url)}
                onChange={(urls) => setImages(urls.map((u) => ({ url: u, altText: name })))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Variants</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { name: "Size", value: "", sku: "", price: "", stock: 0 }])}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {variants.length === 0 && <p className="text-sm text-muted-foreground">No variants (optional)</p>}
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Input placeholder="Name (e.g. Size)" value={v.name} onChange={(e) => setVariants(variants.map((vv, idx) => idx === i ? { ...vv, name: e.target.value } : vv))} />
                  <Input placeholder="Value (e.g. L)" value={v.value} onChange={(e) => setVariants(variants.map((vv, idx) => idx === i ? { ...vv, value: e.target.value } : vv))} />
                  <Input placeholder="Price" type="number" value={v.price} onChange={(e) => setVariants(variants.map((vv, idx) => idx === i ? { ...vv, price: e.target.value } : vv))} />
                  <Input placeholder="Stock" type="number" value={v.stock} onChange={(e) => setVariants(variants.map((vv, idx) => idx === i ? { ...vv, stock: Number(e.target.value) } : vv))} />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch id="isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Inventory</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input id="stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input id="lowStockThreshold" type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedCategories.includes(c.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCategories(checked
                        ? [...selectedCategories, c.id]
                        : selectedCategories.filter((id) => id !== c.id));
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea id="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} maxLength={500} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {product ? "Update Product" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>Cancel</Button>
      </div>
    </form>
  );
}
