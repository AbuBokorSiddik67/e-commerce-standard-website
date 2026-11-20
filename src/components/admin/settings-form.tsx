"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSettingsAction, saveDeliveryZoneAction, deleteDeliveryZoneAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "./image-uploader";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { StoreSettings } from "@/types/domain";

type Zone = { id: string; name: string; charge: string; estimatedDays: string | null; isActive: boolean };

const COLORS = [
  { key: "primaryColor" as const, label: "Primary Color" },
  { key: "secondaryColor" as const, label: "Secondary Color" },
  { key: "accentColor" as const, label: "Accent Color" },
  { key: "buttonColor" as const, label: "Button Color" },
  { key: "textColor" as const, label: "Text Color" },
  { key: "backgroundColor" as const, label: "Background Color" },
];

export function SettingsForm({ settings, zones }: { settings: StoreSettings; zones: Zone[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(settings);

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    (Object.keys(form) as (keyof StoreSettings)[]).forEach((k) => {
      const v = form[k];
      fd.set(k, v === null || v === undefined ? "" : String(v));
    });
    fd.set("codEnabled", form.codEnabled ? "true" : "false");
    start(async () => {
      const res = await saveSettingsAction(fd);
      if (res.success) { toast.success("Settings saved"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <form onSubmit={submit}>
      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Store Identity</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Store Name *</Label>
                <Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUploader
                  value={form.logoUrl ? [form.logoUrl] : []}
                  onChange={(urls) => set("logoUrl", urls[0] ?? null)}
                  label="Upload logo"
                />
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                <ImageUploader
                  value={form.faviconUrl ? [form.faviconUrl] : []}
                  onChange={(urls) => set("faviconUrl", urls[0] ?? null)}
                  label="Upload favicon"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Symbol</Label>
                <Input value={form.currencySymbol} onChange={(e) => set("currencySymbol", e.target.value)} maxLength={5} />
              </div>
              <div className="space-y-2">
                <Label>Font Family</Label>
                <select
                  value={form.fontFamily}
                  onChange={(e) => set("fontFamily", e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="Inter">Inter</option>
                  <option value="Hind Siliguri">Hind Siliguri (Bangla)</option>
                  <option value="Noto Sans Bengali">Noto Sans Bengali</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Brand Colors</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {COLORS.map((c) => (
                <div key={c.key} className="space-y-2">
                  <Label>{c.label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form[c.key]}
                      onChange={(e) => set(c.key, e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-md border"
                      aria-label={c.label}
                    />
                    <Input value={form[c.key]} onChange={(e) => set(c.key, e.target.value)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {([
                ["facebookUrl", "Facebook"], ["instagramUrl", "Instagram"],
                ["youtubeUrl", "YouTube"], ["tiktokUrl", "TikTok"], ["whatsappUrl", "WhatsApp"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} placeholder="https://..." />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Store Address</Label>
                <Textarea value={form.storeAddress ?? ""} onChange={(e) => set("storeAddress", e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Textarea value={form.footerText ?? ""} onChange={(e) => set("footerText", e.target.value)} rows={3} maxLength={500} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label>Cash on Delivery</Label>
                  <p className="text-xs text-muted-foreground">Allow customers to pay cash on delivery</p>
                </div>
                <Switch checked={form.codEnabled} onCheckedChange={(v) => set("codEnabled", v)} />
              </div>
              <div className="space-y-2">
                <Label>Minimum Order Value (blank = none)</Label>
                <Input type="number" min="0" value={form.minOrderValue ?? ""} onChange={(e) => set("minOrderValue", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {([
            ["returnPolicy", "Return Policy"],
            ["privacyPolicy", "Privacy Policy"],
            ["termsConditions", "Terms & Conditions"],
            ["shippingPolicy", "Shipping Policy"],
          ] as const).map(([key, label]) => (
            <Card key={key}>
              <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} rows={4} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => set("minOrderValue", form.minOrderValue)}>
              <Plus className="h-4 w-4" /> Add Zone
            </Button>
          </div>
          <DeliveryZonesEditor zones={zones} />
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
        </Button>
      </div>
    </form>
  );
}

function DeliveryZonesEditor({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [charge, setCharge] = useState("");
  const [days, setDays] = useState("");

  function add() {
    if (!name || !charge) { toast.error("Zone name and charge are required"); return; }
    const fd = new FormData();
    fd.set("name", name);
    fd.set("charge", charge);
    fd.set("estimatedDays", days);
    fd.set("isActive", "true");
    start(async () => {
      const res = await saveDeliveryZoneAction(null, fd);
      if (res.success) { toast.success("Zone added"); setName(""); setCharge(""); setDays(""); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteDeliveryZoneAction(id);
      if (res.success) { toast.success("Zone removed"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {zones.length > 0 && (
          <ul className="divide-y">
            {zones.map((z) => (
              <li key={z.id} className="flex items-center justify-between py-2 text-sm">
                <span>{z.name} — ৳{Number(z.charge)} {z.estimatedDays ? `(${z.estimatedDays})` : ""}</span>
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(z.id)} aria-label="Delete zone">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-4">
          <Input placeholder="Zone name (e.g. Dhaka)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Charge (৳)" type="number" min="0" value={charge} onChange={(e) => setCharge(e.target.value)} />
          <Input placeholder="Est. days (1-2 days)" value={days} onChange={(e) => setDays(e.target.value)} />
          <Button type="button" onClick={add} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
