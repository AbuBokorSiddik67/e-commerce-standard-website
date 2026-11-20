import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { getCustomerById } from "@/server/services/customer.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerRowActions } from "@/components/admin/customer-row-actions";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import { ArrowLeft } from "lucide-react";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const customerResult = await attempt("admin.customerDetail", () => getCustomerById(id));

  if (!customerResult.ok) {
    return (
      <AppError
        variant="admin"
        title="This customer could not be loaded"
        description="We couldn't fetch the customer details. Please retry in a moment."
      />
    );
  }

  const customer = customerResult.value;
  if (!customer) notFound();

  const validOrders = customer.orders.filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED");
  const orderValue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="text-muted-foreground hover:text-foreground" aria-label="Back to customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{customer.fullName}</h1>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          </div>
        </div>
        <CustomerRowActions id={customer.id} isBlocked={customer.isBlocked} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-semibold">{customer.orders.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Order Value</p>
          <p className="text-2xl font-semibold">{formatCurrency(orderValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Type</p>
          <p className="text-sm"><Badge variant="outline">{customer.userId ? "Registered" : "Guest"}</Badge></p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Order History</CardTitle></CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <ul className="divide-y">
              {customer.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateTime(o.placedAt)} · {o.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(Number(o.total))}</p>
                    <Badge variant="outline">{ORDER_STATUS_LABELS[o.status]?.en ?? o.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
