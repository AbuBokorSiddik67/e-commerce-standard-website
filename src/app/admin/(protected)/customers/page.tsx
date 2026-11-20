import { Pagination } from "@/components/shared/pagination";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { listCustomers } from "@/server/services/customer.service";
import { formatDateTime, toPositiveInt } from "@/lib/utils";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerRowActions } from "@/components/admin/customer-row-actions";
import { Search } from "lucide-react";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = toPositiveInt(params.page, 1);
  const customersResult = await attempt("admin.customers", () =>
    listCustomers({ search: params.search, page, perPage: 20 }),
  );

  if (!customersResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Customers could not be loaded"
        description="We couldn't reach the customer database. Please retry in a moment."
      />
    );
  }

  const { items, total, pages } = customersResult.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Customers</h1>
        <p className="text-sm text-muted-foreground">{total} customers</p>
      </div>

      <form role="search" className="flex flex-wrap gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search customers" name="search" placeholder="Search name, phone, or email" defaultValue={params.search} className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" role="region" aria-label="Customers table" tabIndex={0}>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Orders</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No customers yet</td></tr>
                )}
                {items.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-4">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.fullName}
                      </Link>
                      {c.isBlocked && <Badge variant="destructive" className="ml-2">Blocked</Badge>}
                    </td>
                    <td className="p-4">{c.phone}</td>
                    <td className="p-4 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="p-4">{c._count.orders}</td>
                    <td className="p-4">
                      <Badge variant="outline">{c.userId ? "Registered" : "Guest"}</Badge>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</td>
                    <td className="p-4">
                      <CustomerRowActions id={c.id} isBlocked={c.isBlocked} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} pages={pages} base="/admin/customers" query={params} label="Customers pages" />
    </div>
  );
}
