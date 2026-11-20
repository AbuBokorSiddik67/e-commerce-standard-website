import { Pagination } from "@/components/shared/pagination";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { listProducts } from "@/server/repositories/product.repo";
import { formatCurrency, toPositiveInt } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import { Plus, Search } from "lucide-react";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = toPositiveInt(params.page, 1);
  const productsResult = await attempt("admin.products", () =>
    listProducts({ search: params.search, page, perPage: 15 }),
  );

  if (!productsResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Products could not be loaded"
        description="We couldn't reach the product database. No changes were made — please retry in a moment."
      />
    );
  }

  const { items, total, pages } = productsResult.value;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-sm text-muted-foreground">{total} products</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new"><Plus className="h-4 w-4" /> Add Product</Link>
        </Button>
      </div>

      <form role="search" className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search products" name="search" placeholder="Search by name or SKU" defaultValue={params.search} className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" role="region" aria-label="Products table" tabIndex={0}>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Stock</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Categories</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No products found</td></tr>
                )}
                {items.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0].url} alt="" className="h-10 w-10 rounded-md object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku ?? "No SKU"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{formatCurrency(Number(p.price))}</td>
                    <td className="p-4">
                      <Badge variant={p.stock === 0 ? "destructive" : p.stock <= p.lowStockThreshold ? "outline" : "secondary"}>
                        {p.stock}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={p.isActive ? "secondary" : "outline"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                        {p.isFeatured && <Badge>Featured</Badge>}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {p.categories.map((c) => c.name).join(", ") || "—"}
                    </td>
                    <td className="p-4">
                      <ProductRowActions id={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} pages={pages} base="/admin/products" query={params} label="Products pages" />
    </div>
  );
}
