import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { calculateCouponDiscount, normalizeLines } from "../src/server/services/checkout-pricing";
import { bangladeshDate, reportDates } from "../src/lib/report-dates";
import { catalogAvailability } from "../src/lib/product-availability";

test("coupon math rounds half up to the paisa and caps discount at eligibility", () => {
  assert.equal(calculateCouponDiscount(new Prisma.Decimal("1.05"), "PERCENTAGE", new Prisma.Decimal(10)).toFixed(2), "0.11");
  assert.equal(calculateCouponDiscount(new Prisma.Decimal("9.95"), "FIXED", new Prisma.Decimal(20)).toFixed(2), "9.95");
  assert.throws(() => calculateCouponDiscount(new Prisma.Decimal(1), "PERCENTAGE", new Prisma.Decimal("100.01")), /invalid coupon/i);
});

test("normalization combines duplicate SKUs, preserves distinct variants and bounds quantity", () => {
  const a = { productId: "p", variantId: "a", quantity: 2 };
  const b = { productId: "p", variantId: "b", quantity: 1 };
  assert.deepEqual(normalizeLines([b, a, a]), [{ ...a, quantity: 4 }, b]);
  assert.throws(() => normalizeLines(Array(51).fill(a)), /maximum quantity/i);
});

test("catalog requires a valid variant even if all variants are archived", () => {
  assert.deepEqual(catalogAvailability({ price: "50", stock: 30, variants: [], _count: { variants: 1 } }), { requiresVariant: true, price: "50", stock: 0 });
  assert.deepEqual(catalogAvailability({ price: "50", stock: 0, variants: [{ stock: 5, price: "45" }, { stock: 0, price: "25" }], _count: { variants: 2 } }), { requiresVariant: true, price: "45", stock: 5 });
});

test("report date windows follow Dhaka midnight independent of server time", () => {
  const now = new Date("2026-11-20T18:00:00Z");
  assert.equal(bangladeshDate(now), "2026-11-21");
  const range = reportDates("2026-11-20", "2026-11-20", now);
  assert.equal(range.dateFrom.toISOString(), "2026-11-19T18:00:00.000Z");
  assert.equal(range.dateTo.toISOString(), "2026-11-20T17:59:59.999Z");
  assert.equal(reportDates("2026-02-30", "2026-11-21", now).fromDate, "2026-10-23");
});
