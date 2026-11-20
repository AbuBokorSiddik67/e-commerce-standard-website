"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/server/actions/account";

export function ProfileForm({
  initialName,
  initialPhone,
  email,
}: {
  initialName: string;
  initialPhone: string;
  email: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    const result = await updateProfileAction({
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });
    setLoading(false);
    if (result.success) toast.success("Profile updated");
    else toast.error(result.error ?? "Could not update profile");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
      <div>
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} disabled />
      </div>
      <div>
        <Label htmlFor="profile-name">Full name</Label>
        <Input id="profile-name" name="name" defaultValue={initialName} required />
      </div>
      <div>
        <Label htmlFor="profile-phone">Phone</Label>
        <Input id="profile-phone" name="phone" defaultValue={initialPhone} placeholder="01XXXXXXXXX" required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
