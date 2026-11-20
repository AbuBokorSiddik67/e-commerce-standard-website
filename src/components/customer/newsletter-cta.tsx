"use client";

import { safeLink } from "@/lib/safe-urls";
import { Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { subscribeNewsletterAction } from "@/server/actions/customer";
import type { SafeHomepageSection } from "@/types/domain";

type NewsletterSettings = {
  storeName: string;
  whatsappUrl: string | null;
};

export function NewsletterCta({
  section,
  settings,
}: {
  section: SafeHomepageSection;
  settings: NewsletterSettings;
}) {
  const s = (section.settings ?? {}) as { whatsappUrl?: string; message?: string };
  const whatsappUrl = safeLink(s.whatsappUrl || settings.whatsappUrl, false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) {
      toast.error("Please agree to receive updates first.");
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    const result = await subscribeNewsletterAction({
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      consent,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Subscribed! Thanks for joining us.");
      form.reset();
      setConsent(false);
    } else {
      toast.error(result.error ?? "Could not subscribe");
    }
  }

  return (
    <section className="container-page py-7 sm:py-10">
      <div className="grid items-center gap-6 rounded-[1.5rem] bg-[#182744] p-5 text-white sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
        <div>
          <div className="mb-4 flex items-center gap-2 text-[#c7d8ff]"><Mail className="size-4" aria-hidden="true" /><p className="eyebrow">In your inbox</p></div>
          {section.title && (
            <h2 className="section-title">{section.title}</h2>
          )}
          {section.subtitle && (
            <p className="mt-2 text-sm text-[#d7e1f4] sm:text-base">{section.subtitle}</p>
          )}
          {whatsappUrl && (
            <Button asChild variant="secondary" className="mt-5">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                Join WhatsApp
              </a>
            </Button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-card p-5 text-foreground">
          <div>
            <Label htmlFor={`newsletter-email-${section.id}`}>Email</Label>
            <Input
              id={`newsletter-email-${section.id}`}
              name="email"
              type="email" autoComplete="email" maxLength={254}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor={`newsletter-phone-${section.id}`}>Phone (optional)</Label>
            <Input
              id={`newsletter-phone-${section.id}`}
              name="phone" type="tel" autoComplete="tel-national"
              placeholder="01XXXXXXXXX"
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>I agree to receive new arrivals and offers. I can unsubscribe anytime.</span>
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </section>
  );
}
