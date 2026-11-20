"use client";

import Link from "next/link";
import { AlertTriangle, Home, LifeBuoy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppErrorProps = {
  variant?: "shop" | "admin";
  title?: string;
  description?: string;
  error?: Error & { digest?: string };
  onRetry?: () => void;
};

const copy = {
  shop: {
    eyebrow: "Store update",
    title: "Something went wrong",
    description:
      "We hit a small technical snag while loading this page. Your cart and account are safe — please try again in a moment.",
    secondary: "কিছু একটা সমস্যা হয়েছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।",
    homeHref: "/",
    homeLabel: "Back to home",
    retryLabel: "Try again",
  },
  admin: {
    eyebrow: "Admin console",
    title: "This page could not load",
    description:
      "A backend request failed while loading the admin console. Your data has not been changed. Please retry, or return to the dashboard.",
    secondary: "ড্যাশবোর্ডে ফিরে গিয়ে আবার চেষ্টা করুন।",
    homeHref: "/admin/dashboard",
    homeLabel: "Go to dashboard",
    retryLabel: "Reload page",
  },
} as const;

export function AppError({
  variant = "shop",
  title,
  description,
  error,
  onRetry,
}: AppErrorProps) {
  const t = copy[variant];
  const reference = error?.digest;

  function retry() {
    if (onRetry) {
      onRetry();
      return;
    }
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 ring-1 ring-amber-200/70">
          <AlertTriangle className="h-9 w-9 text-amber-600" aria-hidden="true" />
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title ?? t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          {description ?? t.description}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground/80">
          {t.secondary}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={retry} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t.retryLabel}
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={t.homeHref}>
              <Home className="h-4 w-4" aria-hidden="true" />
              {t.homeLabel}
            </Link>
          </Button>
          {variant === "shop" && (
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/contact">
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                Contact support
              </Link>
            </Button>
          )}
        </div>

        {reference && (
          <p className="mt-6 text-xs text-muted-foreground">
            Reference ID:{" "}
            <span className="font-mono text-foreground/80">{reference}</span>
          </p>
        )}

        {process.env.NODE_ENV !== "production" && error?.message && (
          <details className="mt-6 rounded-lg border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground/80">
              Technical details (development only)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
