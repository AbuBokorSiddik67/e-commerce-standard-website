import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrdersForExport } from "@/server/services/reports.service";
import { logError } from "@/lib/errors";
import { bangladeshDate, reportDates } from "@/lib/report-dates";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { fromDate, toDate, dateFrom, dateTo } = reportDates(searchParams.get("from"), searchParams.get("to"));
    const orders = await getOrdersForExport({ dateFrom, dateTo });

    const rows = [
      ["Order Number", "Date", "Customer", "Phone", "District", "City", "Items", "Subtotal", "Discount", "Delivery", "Total", "Status", "Payment"],
      ...orders.map((o) => [
        o.orderNumber,
        bangladeshDate(o.placedAt),
        o.fullName,
        o.phone,
        o.district,
        o.city,
        o.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
        Number(o.subtotal).toString(),
        Number(o.discount).toString(),
        Number(o.deliveryCharge).toString(),
        Number(o.total).toString(),
        o.status,
        o.paymentStatus,
      ]),
    ];

    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${fromDate}-to-${toDate}.csv"`,
      },
    });
  } catch (error) {
    logError("api.ordersExport", error);
    return NextResponse.json(
      { error: "Could not export orders right now. Please try again." },
      { status: 500 },
    );
  }
}
