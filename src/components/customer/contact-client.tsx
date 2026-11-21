"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ContactClient({ email }: { email: string }) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const details = new FormData(e.currentTarget);
    const body = `Name: ${details.get("name")}\nPhone: ${details.get("phone")}\nEmail: ${details.get("email")}\n\n${details.get("message")}`;
    // This hands the draft to the user's mail app. No server receives it until
    // the user sends it; never report a delivery we cannot confirm.
    window.location.href = `mailto:${encodeURIComponent(email).replace('%40', '@')}?subject=ShopBD%20support&body=${encodeURIComponent(body)}`;
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border p-6">
      <h2 className="font-semibold">Write to support</h2>
      <p className="text-sm text-muted-foreground">This opens a draft in your email app. Review it there and send it yourself. Do not include passwords or payment details.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" maxLength={100} required />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={24} placeholder="01XXXXXXXXX" required />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} maxLength={1000} required />
      </div>
      <Button type="submit" disabled={!ready}>Open email draft</Button>
    </form>
  );
}
