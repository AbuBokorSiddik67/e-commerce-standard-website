"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

type SearchParams = Record<string, string | undefined>;

function withParam(current: SearchParams, key: string, value: string) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== "page") p.set(k, String(v));
  }
  if (value) p.set(key, value);
  else p.delete(key);
  return `/products?${p.toString()}`;
}

export function ProductFilters({
  categories,
  current,
}: {
  categories: { id: string; name: string; slug: string }[];
  current: SearchParams;
}) {
  const router = useRouter();

  function navigate(key: string, value: string) {
    router.push(withParam(current, key, value));
  }

  return (
    <aside className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Categories</h3>
        <ul className="space-y-1.5 text-sm">
          <li>
            <Link
              href={withParam(current, "category", "")}
              className={`hover:text-primary ${!current.category ? "font-medium text-primary" : "text-muted-foreground"}`}
            >
              All Categories
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={withParam(current, "category", c.slug)}
                className={`hover:text-primary ${current.category === c.slug ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price Range</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={current.minPrice ?? ""}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            onBlur={(e) => navigate("minPrice", e.target.value)}
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={current.maxPrice ?? ""}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            onBlur={(e) => navigate("maxPrice", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={current.inStock === "true"}
            onCheckedChange={(checked) => navigate("inStock", checked ? "true" : "")}
          />
          In stock only
        </label>
      </div>
    </aside>
  );
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
];

export function ProductSort({ current }: { current: SearchParams }) {
  const router = useRouter();
  return (
    <select
      defaultValue={current.sort ?? "newest"}
      className="h-9 rounded-md border bg-background px-3 text-sm"
      onChange={(e) => router.push(withParam(current, "sort", e.target.value))}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
