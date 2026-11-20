import Link from "next/link";
import { Compass, Home, LifeBuoy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NotFoundViewProps = {
  title?: string;
  description?: string;
  admin?: boolean;
};

export function NotFoundView({
  title,
  description,
  admin = false,
}: NotFoundViewProps) {
  const homeHref = admin ? "/admin/dashboard" : "/";
  const homeLabel = admin ? "Back to dashboard" : "Back to home";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
          <Compass className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          404 — Page not found
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {title ?? "We couldn't find that page"}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          {description ??
            "The link may be broken, or the page may have been moved or removed. Let's get you back on track."}
        </p>

        {!admin && (
          <form action="/products" className="mx-auto mt-7 flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search for products..."
                className="pl-9"
                aria-label="Search products"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        )}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <Link href={homeHref}>
              <Home className="h-4 w-4" aria-hidden="true" />
              {homeLabel}
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={admin ? "/admin/orders" : "/products"}>
              {admin ? "View orders" : "Browse products"}
            </Link>
          </Button>
          {!admin && (
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/contact">
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                Need help?
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
