import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { CheckoutInput } from "../src/lib/validations/customer";
import { createGuestCheckoutSecret, guestCheckoutScope, guestReceiptForCheckout } from "../src/server/services/order-access";

const rawUrl = process.env.SHOPBD_SECURITY_TEST_DATABASE_URL;
if (!rawUrl) throw new Error("Set SHOPBD_SECURITY_TEST_DATABASE_URL to a disposable local shopbd_security_test database");
const url = new URL(rawUrl);
if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/shopbd_security_test" || url.search || url.hash) {
  throw new Error("Core integration tests require a disposable local shopbd_security_test database without URL options");
}
process.env.DATABASE_URL = rawUrl;

test("PostgreSQL checkout, inventory, coupons and COD", async (t) => {
  const { prisma } = await import("../src/lib/prisma");
  const { createOrder, cancelCustomerOrder, getOrderReceipt, updateOrderStatus, updatePaymentStatus } = await import("../src/server/services/order.service");
  const { orderTransaction } = await import("../src/server/services/order-transaction");
  const { priceCheckout, couponBuyerKey } = await import("../src/server/services/checkout-pricing");
  const { getOrderMetrics, listLowStock } = await import("../src/server/services/order-metrics");
  const { updateProduct } = await import("../src/server/services/product.service");
  const { productSchema } = await import("../src/lib/validations/admin");
  t.after(() => prisma.$disconnect());
  const settings = await prisma.storeSetting.upsert({ where: { id: 1 }, create: { id: 1, storeName: "Test Store", codEnabled: true }, update: {} });
  const [a, b, admin, zone] = await Promise.all([
    prisma.user.create({ data: { email: `${randomUUID()}@example.test`, role: "CUSTOMER" } }),
    prisma.user.create({ data: { email: `${randomUUID()}@example.test`, role: "CUSTOMER" } }),
    prisma.user.create({ data: { email: `${randomUUID()}@example.test`, role: "ADMIN" } }),
    prisma.deliveryZone.create({ data: { name: "Fixture zone", charge: "24.50", districts: ["Dhaka"] } }),
  ]);
  const buyerA = { kind: "customer", userId: a.id } as const;
  const buyerB = { kind: "customer", userId: b.id } as const;
  const product = (stock = 20, price = "101.05") => prisma.product.create({ data: { slug: randomUUID(), name: "Fixture SKU", stock, price } });
  const input = (productId: string, extra: Partial<CheckoutInput> = {}): CheckoutInput => ({
    fullName: "Test Shopper", phone: "01700000000", address: "Synthetic test address", district: "Dhaka",
    city: "Fixture city", zoneId: zone.id, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID(), ...extra,
  });
  const get = (orderNumber: string) => prisma.order.findUniqueOrThrow({ where: { orderNumber }, include: { items: true } });
  const same = async (id: string, stock: number) => assert.equal((await prisma.product.findUniqueOrThrow({ where: { id } })).stock, stock);
  const quote = (data: CheckoutInput) => orderTransaction((tx) => priceCheckout(tx, data, couponBuyerKey(buyerA)));
  const coupon = (extra: Partial<Parameters<typeof prisma.coupon.create>[0]["data"]> = {}) => prisma.coupon.create({
    data: { code: randomUUID().toUpperCase(), type: "FIXED", value: 10, ...extra },
  });

  await t.test("server totals, normalization, line snapshots and idempotent replay", async () => {
    const p = await product();
    const request = input(p.id, { items: [{ productId: p.id, quantity: 2 }, { productId: p.id, quantity: 1 }] });
    const priced = await quote(request);
    assert.equal(priced.summary.total, "327.65");
    const checkout = { ...request, expectedQuote: priced.summary.fingerprint, total: 0, subtotal: 0, deliveryCharge: 0 };
    const order = await get((await createOrder(checkout, buyerA)).orderNumber);
    assert.equal(order.userId, a.id);
    assert.equal(order.total.toFixed(2), "327.65");
    assert.equal(order.subtotal.toFixed(2), "303.15");
    assert.equal(order.deliveryCharge.toFixed(2), "24.50");
    assert.equal(order.status, "PENDING");
    assert.equal(order.paymentStatus, "PENDING");
    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].name, p.name);
    assert.equal(order.items[0].quantity, 3);
    assert.equal((await createOrder({ ...checkout, items: [{ productId: p.id, quantity: 3 }] }, buyerA)).orderNumber, order.orderNumber);
    await assert.rejects(createOrder({ ...checkout, address: "Different address" }, buyerA), /Unable to resume/);
    await assert.rejects(createOrder(checkout, buyerB), /Unable to resume/);
    await same(p.id, 17);
  });

  await t.test("invalid contact, address, quantity, zone, COD policy and price changes leave no writes", async () => {
    const p = await product(1);
    const count = await prisma.order.count();
    const customers = await prisma.customer.count();
    const inactiveZone = await prisma.deliveryZone.create({ data: { name: "Inactive", charge: 1, districts: ["Dhaka"], isActive: false } });
    const inactiveProduct = await prisma.product.update({ where: { id: (await product()).id }, data: { isActive: false } });
    for (const [request, error] of [
      [input(p.id, { phone: "wrong" }), /phone number/i],
      [input(p.id, { address: " " }), /address/i],
      [input(p.id, { postalCode: "abc" }), /postal code/i],
      [input(p.id, { district: "Rajshahi" }), /serves your district/i],
      [input(p.id, { zoneId: inactiveZone.id }), /serves your district/i],
      [input(p.id, { items: [] }), /cart is empty/i],
      [input(p.id, { items: [{ productId: p.id, quantity: 0 }] }), /too small/i],
      [input(p.id, { items: [{ productId: p.id, quantity: 2 }] }), /insufficient stock/i],
      [input(p.id, { items: [{ productId: p.id, quantity: 55 }, { productId: p.id, quantity: 55 }] }), /maximum quantity/i],
      [input(inactiveProduct.id), /no longer available/i],
    ] as const) await assert.rejects(createOrder(request, buyerA), error);
    try {
      await prisma.storeSetting.update({ where: { id: 1 }, data: { codEnabled: false } });
      await assert.rejects(createOrder(input(p.id), buyerA), /cash on delivery/i);
      await prisma.storeSetting.update({ where: { id: 1 }, data: { codEnabled: true, minOrderValue: 200 } });
      await assert.rejects(createOrder(input(p.id), buyerA), /minimum order/i);
    } finally {
      await prisma.storeSetting.update({ where: { id: 1 }, data: { codEnabled: settings.codEnabled, minOrderValue: settings.minOrderValue } });
    }
    const request = input(p.id);
    const priced = await quote(request);
    await prisma.product.update({ where: { id: p.id }, data: { price: "111.11" } });
    await assert.rejects(createOrder({ ...request, expectedQuote: priced.summary.fingerprint }, buyerA), /prices changed/);
    await assert.rejects(prisma.product.update({ where: { id: p.id }, data: { stock: -1 } }));
    assert.equal(await prisma.order.count(), count);
    assert.equal(await prisma.customer.count(), customers);
    await same(p.id, 1);
  });

  await t.test("parallel guest retries share one commit and cannot renew or transfer receipt access", async () => {
    const p = await product(1);
    const request = input(p.id);
    const secret = createGuestCheckoutSecret();
    const grant = guestReceiptForCheckout(secret, request.idempotencyKey);
    const guest = { kind: "guest", checkoutScope: guestCheckoutScope(secret), receipt: grant.proof } as const;
    const [x, y, z] = await Promise.all(Array.from({ length: 3 }, () => createOrder(request, guest)));
    assert.deepEqual(x, y);
    assert.deepEqual(x, z);
    assert.equal(await prisma.order.count({ where: { idempotencyKey: request.idempotencyKey } }), 1);
    await same(p.id, 0);
    assert.ok(await getOrderReceipt(x.orderNumber, { kind: "guest", token: grant.token }));
    assert.equal(await getOrderReceipt(x.orderNumber, { kind: "guest", token: secret }), null);
    assert.equal(await getOrderReceipt(x.orderNumber, { kind: "guest", token: grant.token }, grant.proof.guestReceiptExpiresAt), null);
    const stranger = createGuestCheckoutSecret();
    await assert.rejects(createOrder(request, { kind: "guest", checkoutScope: guestCheckoutScope(stranger), receipt: guestReceiptForCheckout(stranger, request.idempotencyKey).proof }), /Unable to resume/);
    const retryGrant = guestReceiptForCheckout(secret, request.idempotencyKey);
    assert.deepEqual(await createOrder(request, { ...guest, receipt: retryGrant.proof }), x);
  });

  await t.test("concurrent first checkouts share only their own customer record; key collisions disclose nothing", async () => {
    const account = await prisma.user.create({ data: { email: `${randomUUID()}@example.test`, role: "CUSTOMER" } });
    const buyer = { kind: "customer", userId: account.id } as const;
    const [p, q] = await Promise.all([product(3), product(3)]);
    await Promise.all([createOrder(input(p.id), buyer), createOrder(input(q.id), buyer)]);
    assert.equal(await prisma.customer.count({ where: { userId: account.id } }), 1);
    const collision = randomUUID();
    const results = await Promise.allSettled([
      createOrder(input(p.id, { idempotencyKey: collision }), buyerA),
      createOrder(input(q.id, { idempotencyKey: collision }), buyerB),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const loser = results.find((r) => r.status === "rejected");
    assert.match(String(loser?.reason), /unable to resume/i);
    assert.equal(await prisma.order.count({ where: { idempotencyKey: collision } }), 1);
  });

  await t.test("concurrent distinct checkouts cannot oversell", async () => {
    const p = await product(1);
    const results = await Promise.allSettled([createOrder(input(p.id), buyerA), createOrder(input(p.id), buyerB)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const loser = results.find((r) => r.status === "rejected");
    assert.match(String(loser?.reason), /insufficient stock/i);
    await same(p.id, 0);
    assert.equal(await prisma.orderItem.count({ where: { productId: p.id } }), 1);
  });

  await t.test("coupon expiry, scope, minimum, percentage and fixed cap are authoritative", async () => {
    const p = await product();
    const q = await product();
    const cat = await prisma.category.create({ data: { name: "Coupon category", slug: randomUUID(), products: { connect: { id: q.id } } } });
    const invalid = "MISSING";
    const expired = await coupon({ expiresAt: new Date(0) });
    const minimum = await coupon({ minOrderAmount: 500 });
    const pct = await coupon({ type: "PERCENTAGE", value: 12.5, categoryIds: [cat.id] });
    const capped = await coupon({ value: 999, productIds: [p.id] });
    for (const [code, error] of [[invalid, /invalid coupon|inactive coupon/i], [expired.code, /expired/i], [minimum.code, /minimum/i], [pct.code, /does not apply/i]] as const) {
      await assert.rejects(createOrder(input(p.id, { couponCode: code }), buyerA), error);
    }
    const lines = [{ productId: p.id, quantity: 1 }, { productId: q.id, quantity: 1 }];
    const percentage = await get((await createOrder(input(p.id, { items: lines, couponCode: pct.code }), buyerA)).orderNumber);
    assert.equal(percentage.discount.toFixed(2), "12.63");
    assert.equal(percentage.total.toFixed(2), "213.97");
    const fixed = await get((await createOrder(input(p.id, { items: lines, couponCode: capped.code.toLowerCase() }), buyerA)).orderNumber);
    assert.equal(fixed.discount.toFixed(2), "101.05");
    assert.equal(fixed.total.toFixed(2), "125.55");
  });

  await t.test("coupon caps and repeat restriction survive concurrency without consuming loser inventory", async () => {
    const p = await product(5);
    for (const [limit, buyers] of [[1, [buyerA, buyerB]], [null, [buyerA, buyerA]]] as const) {
      const c = await coupon({ usageLimit: limit });
      const results = await Promise.allSettled(buyers.map((buyer) => createOrder(input(p.id, { couponCode: c.code }), buyer)));
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const loser = results.find((r) => r.status === "rejected");
      assert.match(String(loser?.reason), /usage limit|already used/i);
      assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } })).usedCount, 1);
      assert.equal(await prisma.couponRedemption.count({ where: { couponId: c.id } }), 1);
    }
    await same(p.id, 3);
  });

  await t.test("variant stock and SKU snapshot; archived SKU restoration once with ownership and audit", async () => {
    const p = await product(0);
    const v = await prisma.productVariant.create({ data: { productId: p.id, name: "Size", value: "M", stock: 1, price: "55.39", sku: "EXAMPLE-M" } });
    const other = await product();
    const line = { productId: p.id, variantId: v.id, quantity: 1 };
    await assert.rejects(createOrder(input(p.id), buyerA), /select a variant/i);
    await assert.rejects(createOrder(input(other.id, { items: [{ ...line, productId: other.id }] }), buyerA), /variant is no longer available/i);
    const requests = await Promise.allSettled([buyerA, buyerB].map((buyer) => createOrder(input(p.id, { items: [line] }), buyer)));
    const wins = requests.filter((r) => r.status === "fulfilled");
    assert.equal(wins.length, 1);
    const order = await get(wins[0].value.orderNumber);
    assert.equal(order.items[0].variant, "Size: M");
    assert.equal(order.items[0].sku, "EXAMPLE-M");
    assert.equal(order.items[0].price.toFixed(2), "55.39");
    assert.equal(order.items[0].variantId, v.id);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, 0);
    await same(p.id, 0);
    assert.ok((await listLowStock(20)).some((sku) => sku.id === v.id));
    const edit = productSchema.parse({ name: p.name, price: Number(p.price), stock: 0, originalStock: 0, variants: [
      { id: v.id, name: "Size", value: "Medium", sku: "EXAMPLE-M", stock: 1, originalStock: 1 },
    ] });
    await updateProduct(p.id, edit, admin.id);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, 0);
    await assert.rejects(updateProduct(p.id, { ...edit, variants: [{ ...edit.variants[0], stock: 3 }] }, admin.id), /stock was changed/i);
    await updateProduct(p.id, { ...edit, variants: [] }, admin.id);
    await assert.rejects(createOrder(input(p.id, { items: [line] }), buyerA), /variant is no longer available/i);
    const owner = order.userId!;
    await assert.rejects(cancelCustomerOrder(owner === a.id ? b.id : a.id, order.orderNumber), /not found/i);
    await assert.rejects(updateOrderStatus(order.id, "CONFIRMED", owner), /cannot change/i);
    const cancelling = await Promise.allSettled([cancelCustomerOrder(owner, order.orderNumber), updateOrderStatus(order.id, "CANCELLED", admin.id, "Test")]);
    assert.equal(cancelling.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await get(order.orderNumber)).status, "CANCELLED");
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, 1);
    await same(p.id, 0);
    assert.equal(await prisma.auditLog.count({ where: { entityId: order.id, action: "ORDER_STATUS_CHANGE" } }), 1);
    await assert.rejects(updateOrderStatus(order.id, "CONFIRMED", admin.id), /cannot change status/i);
    await assert.rejects(updatePaymentStatus(order.id, "PAID", admin.id), /not allowed/i);
  });

  await t.test("plain cancellation restores stock; missing legacy variant rolls back state and history", async () => {
    const p = await product(3);
    const order = await get((await createOrder(input(p.id), buyerA)).orderNumber);
    await same(p.id, 2);
    await cancelCustomerOrder(a.id, order.orderNumber);
    await same(p.id, 3);
    await assert.rejects(cancelCustomerOrder(a.id, order.orderNumber), /no longer be cancelled/i);
    const old = await get((await createOrder(input(p.id), buyerA)).orderNumber);
    await prisma.order.update({ where: { id: old.id }, data: { inventoryVersion: 1, items: { update: { where: { id: old.items[0].id }, data: { variantId: "missing", variant: "Legacy: missing" } } } } });
    await assert.rejects(cancelCustomerOrder(a.id, old.orderNumber), /manual inventory review/i);
    assert.equal((await get(old.orderNumber)).status, "PENDING");
    assert.equal(await prisma.auditLog.count({ where: { entityId: old.id } }), 0);
    await same(p.id, 2);
  });

  await t.test("version 1 orders restore the original dual stock debit", async () => {
    const p = await product(2);
    const v = await prisma.productVariant.create({ data: { productId: p.id, name: "Size", value: "L", stock: 2 } });
    const order = await get((await createOrder(input(p.id, { items: [{ productId: p.id, variantId: v.id, quantity: 1 }] }), buyerA)).orderNumber);
    // Reproduce a Phase 1 reservation: its checkout also debited the parent row.
    await prisma.$transaction([
      prisma.product.update({ where: { id: p.id }, data: { stock: { decrement: 1 } } }),
      prisma.order.update({ where: { id: order.id }, data: { inventoryVersion: 1 } }),
    ]);
    await cancelCustomerOrder(a.id, order.orderNumber);
    await same(p.id, 2);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, 2);
  });

  await t.test("COD totals distinguish unpaid, paid, returned and cancelled", async () => {
    const p = await product(5, "75.50");
    const before = await getOrderMetrics();
    const created = await get((await createOrder(input(p.id), buyerA)).orderNumber);
    const canceled = await get((await createOrder(input(p.id), buyerA)).orderNumber);
    await cancelCustomerOrder(a.id, canceled.orderNumber);
    // Simulate pre-migration data; even a misflagged cancelled order must never count.
    await prisma.order.update({ where: { id: canceled.id }, data: { paymentStatus: "PAID" } });
    const unpaid = await getOrderMetrics();
    assert.equal(unpaid.orderValue - before.orderValue, 100);
    assert.equal(unpaid.pendingCod - before.pendingCod, 100);
    assert.equal(unpaid.collectedCod, before.collectedCod);
    await assert.rejects(updatePaymentStatus(created.id, "PAID", admin.id), /not allowed/i);
    await assert.rejects(updateOrderStatus(created.id, "DELIVERED", admin.id), /cannot change status/i);
    for (const next of ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as const) await updateOrderStatus(created.id, next, admin.id);
    await assert.rejects(cancelCustomerOrder(a.id, created.orderNumber), /no longer be cancelled/i);
    assert.equal((await getOrderMetrics()).collectedCod, before.collectedCod);
    await assert.rejects(updatePaymentStatus(created.id, "PAID", a.id), /cannot change/i);
    await updatePaymentStatus(created.id, "PAID", admin.id);
    const paid = await getOrderMetrics();
    assert.equal(paid.pendingCod, before.pendingCod);
    assert.equal(paid.collectedCod - before.collectedCod, 100);
    await updateOrderStatus(created.id, "RETURNED", admin.id);
    assert.equal((await getOrderMetrics()).collectedCod, paid.collectedCod);
    await updatePaymentStatus(created.id, "REFUNDED", admin.id);
    assert.equal((await getOrderMetrics()).collectedCod, before.collectedCod);
    assert.equal(await prisma.auditLog.count({ where: { entityId: created.id } }), 7);
    await same(p.id, 4);
  });
});
