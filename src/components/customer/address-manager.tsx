"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  saveAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/server/actions/account";

export type AddressRecord = {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  postalCode: string | null;
  isDefault: boolean;
};

export function AddressManager({ addresses }: { addresses: AddressRecord[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AddressRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      district: String(formData.get("district") ?? ""),
      city: String(formData.get("city") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      isDefault: formData.get("isDefault") === "on",
    };
    setLoading(true);
    const result = await saveAddressAction(editing?.id || null, payload);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not save address");
      return;
    }
    toast.success(editing ? "Address updated" : "Address added");
    setEditing(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteAddressAction(id);
    setDeletingId(null);
    if (result.success) {
      toast.success("Address removed");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not remove address");
    }
  }

  async function handleDefault(id: string) {
    const result = await setDefaultAddressAction(id);
    if (result.success) {
      toast.success("Default address updated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not update default address");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {addresses.length === 0 && (
          <p className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
            No saved addresses yet.
          </p>
        )}
        {addresses.map((address) => (
          <div key={address.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {address.fullName}{" "}
                  {address.isDefault && <Badge variant="secondary">Default</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">{address.phone}</p>
                <p className="mt-1 text-sm">
                  {address.address}, {address.city}, {address.district}
                  {address.postalCode ? ` - ${address.postalCode}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(address)}>
                Edit
              </Button>
              {!address.isDefault && (
                <Button size="sm" variant="outline" onClick={() => handleDefault(address.id)}>
                  Set default
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(address.id)}
                disabled={deletingId === address.id}
              >
                {deletingId === address.id ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form
        key={editing?.id ?? "new"}
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border bg-card p-5"
      >
        <h2 className="font-semibold">{editing ? "Edit address" : "Add a new address"}</h2>
        <div>
          <Label htmlFor="addr-fullName">Full name</Label>
          <Input id="addr-fullName" name="fullName" defaultValue={editing?.fullName ?? ""} required />
        </div>
        <div>
          <Label htmlFor="addr-phone">Phone</Label>
          <Input id="addr-phone" name="phone" defaultValue={editing?.phone ?? ""} placeholder="01XXXXXXXXX" required />
        </div>
        <div>
          <Label htmlFor="addr-address">Full address</Label>
          <Input id="addr-address" name="address" defaultValue={editing?.address ?? ""} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="addr-district">District</Label>
            <Input id="addr-district" name="district" defaultValue={editing?.district ?? ""} required />
          </div>
          <div>
            <Label htmlFor="addr-city">City / Area</Label>
            <Input id="addr-city" name="city" defaultValue={editing?.city ?? ""} required />
          </div>
        </div>
        <div>
          <Label htmlFor="addr-postalCode">Postal code (optional)</Label>
          <Input id="addr-postalCode" name="postalCode" defaultValue={editing?.postalCode ?? ""} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={editing?.isDefault ?? addresses.length === 0}
            className="h-4 w-4 rounded border-input"
          />
          Set as default address
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : editing ? "Update address" : "Add address"}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
