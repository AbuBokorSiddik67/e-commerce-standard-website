"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCouponAction, deleteCouponAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Ticket } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type ScopeOptions = { products: { id: string; name: string }[]; categories: { id: string; name: string }[] };

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: string;
  minOrderAmount: string | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
};

function CouponFormFields({ coupon, onDone, products, categories }: ScopeOptions & { coupon?: Coupon | null; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState(coupon?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(coupon?.value ?? "");
  const [minOrderAmount, setMinOrderAmount] = useState(coupon?.minOrderAmount ?? "");
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(coupon?.expiresAt?.slice(0, 10) ?? "");
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("code", code.toUpperCase());
    fd.set("type", type);
    fd.set("value", value);
    fd.set("minOrderAmount", minOrderAmount);
    fd.set("usageLimit", usageLimit);
    fd.set("expiresAt", expiresAt);
    fd.set("isActive", isActive ? "true" : "false");
    start(async () => {
      const res = await saveCouponAction(coupon?.id ?? null, fd);
      if (res.success) { toast.success("Coupon saved"); router.refresh(); onDone(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Code *</Label>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={50} placeholder="WELCOME10" className="uppercase" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed Amount (৳)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Value *</Label>
          <Input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Min Order (৳)</Label>
          <Input type="number" min="0" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Usage Limit</Label>
          <Input type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Expiry Date</Label>
        <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>
      <p className="text-sm text-muted-foreground">Leave both lists empty for a storewide coupon. Otherwise a line is eligible if it matches a selected product or category.</p>
      {([ ["productIds", "Eligible products", products], ["categoryIds", "Eligible categories", categories] ] as const).map(([key, label, options]) => (
        <div className="space-y-1" key={key}>
          <Label htmlFor={key}>{label}</Label>
          <select id={key} name={key} multiple className="w-full rounded-md border bg-background p-2 text-sm" size={4} defaultValue={coupon?.[key] ?? []}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            {coupon?.[key].filter((id) => !options.some((option) => option.id === id)).map((id) => <option key={id} value={id}>Removed selection (deselect to save)</option>)}
          </select>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {coupon?.id ? "Update" : "Create"} Coupon
      </Button>
    </form>
  );
}

export function CouponManager({ coupons, products, categories }: ScopeOptions & { coupons: Coupon[] }) {
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add Coupon</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
            <CouponFormFields products={products} categories={categories} coupon={editing} onDone={() => { setOpen(false); setEditing(null); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Discount</th>
                  <th className="p-4 font-medium">Min Order</th>
                  <th className="p-4 font-medium">Usage</th>
                  <th className="p-4 font-medium">Expires</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Ticket className="mx-auto mb-2 h-6 w-6" /> No coupons yet
                  </td></tr>
                )}
                {coupons.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-4 font-mono font-medium">{c.code}</td>
                      <td className="p-4">{c.type === "PERCENTAGE" ? `${Number(c.value)}%` : formatCurrency(Number(c.value))}</td>
                      <td className="p-4">{c.minOrderAmount ? formatCurrency(Number(c.minOrderAmount)) : "—"}</td>
                      <td className="p-4">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                      <td className="p-4">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                      <td className="p-4">
                        <Badge variant={expired ? "destructive" : c.isActive ? "secondary" : "outline"}>
                          {expired ? "Expired" : c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }} aria-label="Edit">
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
                                <AlertDialogTitle>Delete coupon &quot;{c.code}&quot;?</AlertDialogTitle>
                                <AlertDialogDescription>The code can be reactivated later. Usage history is retained.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deleting}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    startDelete(async () => {
                                      const res = await deleteCouponAction(c.id);
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
