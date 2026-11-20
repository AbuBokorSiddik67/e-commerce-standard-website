"use client";

import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { changePasswordAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ admin = false }: { admin?: boolean }) {
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await changePasswordAction(Object.fromEntries(form));
      if (!result.success) { toast.error(result.error ?? "Could not change password"); return; }
      toast.success("Password changed. Sign in again with your new password.");
      const redirectTo = admin ? "/admin/login" : "/login";
      try { await signOut({ redirectTo }); } catch { window.location.assign(window.location.origin + redirectTo); }
    } catch { toast.error("Could not change password"); }
    finally { setPending(false); }
  }
  return <details className="rounded-lg border bg-card p-4">
    <summary className="cursor-pointer font-medium">Change password</summary>
    <form onSubmit={submit} className="mt-4 max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">Changing your password signs you out on all devices.</p>
      <Label htmlFor="currentPassword">Current password</Label>
      <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" maxLength={72} required />
      <Label htmlFor="newPassword">New password ({admin ? 16 : 12} characters minimum)</Label>
      <Input id="newPassword" name="password" type="password" autoComplete="new-password" minLength={admin ? 16 : 12} maxLength={72} required />
      <Label htmlFor="confirmNewPassword">Confirm new password</Label>
      <Input id="confirmNewPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={admin ? 16 : 12} maxLength={72} required />
      <Button disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
    </form>
  </details>;
}
