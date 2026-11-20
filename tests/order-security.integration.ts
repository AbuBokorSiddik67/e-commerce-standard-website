import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createGuestReceipt } from "../src/server/services/order-access";

// Run against an explicitly supplied, disposable, local PostgreSQL database only.
const rawUrl = process.env.SHOPBD_SECURITY_TEST_DATABASE_URL;
if (!rawUrl) throw new Error("Set SHOPBD_SECURITY_TEST_DATABASE_URL to a disposable local shopbd_security_test database");
const url = new URL(rawUrl);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/shopbd_security_test" || url.search || url.hash
) {
  throw new Error("Security integration tests require a local shopbd_security_test database without URL options");
}
process.env.DATABASE_URL = rawUrl;

const now = new Date("2026-11-20T12:00:00Z");
const sharedDeliveryPhone = "01700000000";

test("PostgreSQL order ownership and receipt boundaries", async (t) => {
  const { prisma } = await import("../src/lib/prisma");
  const { getCustomerOrder, listCustomerOrders } = await import("../src/server/services/account.service");
  const { createOrder, getOrderReceipt } = await import("../src/server/services/order.service");
  t.after(() => prisma.$disconnect());

  const runId = randomUUID();
  const [accountA, accountB, product, zone] = await Promise.all([
    prisma.user.create({
      data: { email: `a-${runId}@example.test`, role: "CUSTOMER", customer: {
        create: { fullName: "Fixture A", phone: sharedDeliveryPhone },
      } },
      include: { customer: true },
    }),
    // A user without a Customer row must never acquire a guest's Customer row.
    prisma.user.create({ data: { email: `b-${runId}@example.test`, role: "CUSTOMER" } }),
    prisma.product.create({ data: { slug: `fixture-${runId}`, name: "Fixture product", price: 100, stock: 10 } }),
    prisma.deliveryZone.create({ data: { name: `Fixture zone ${runId}`, charge: 50 } }),
  ]);

  const checkoutInput = () => ({
    fullName: "Fixture delivery", phone: sharedDeliveryPhone, address: "Synthetic address",
    district: "Dhaka", city: "Dhaka", zoneId: zone.id,
    idempotencyKey: randomUUID(), items: [{ productId: product.id, quantity: 1 }],
  });
  const buyerA = { kind: "customer", userId: accountA.id } as const;
  const buyerB = { kind: "customer", userId: accountB.id } as const;
  const grantA = createGuestReceipt(now);
  const grantB = createGuestReceipt(now);
  const guestAInput = checkoutInput();

  const guestA = await createOrder(guestAInput, { kind: "guest", receipt: grantA.proof });
  const guestB = await createOrder(checkoutInput(), { kind: "guest", receipt: grantB.proof });
  const orderA = await createOrder(checkoutInput(), buyerA);
  const accountBInput = checkoutInput();
  const orderB = await createOrder(accountBInput, buyerB);

  // Simulate unsafe associations already in the database without changing Order.userId.
  await prisma.order.updateMany({
    where: { orderNumber: { in: [orderB.orderNumber, guestA.orderNumber] } },
    data: { customerId: accountA.customer!.id },
  });

  await t.test("Customer A cannot access Customer B's order or linked guest order", async () => {
    assert.equal(await getCustomerOrder(accountA.id, orderB.orderNumber), null);
    assert.equal(await getCustomerOrder(accountA.id, guestA.orderNumber), null);
    assert.deepEqual((await listCustomerOrders(accountA.id)).map((order) => order.orderNumber), [orderA.orderNumber]);
  });

  await t.test("Customer A cannot access Customer B's receipt", async () => {
    assert.equal(await getOrderReceipt(orderB.orderNumber, buyerA, now), null);
  });

  await t.test("a guest receipt token cannot access another guest or an authenticated order", async () => {
    const viewer = { kind: "guest", token: grantA.token } as const;
    assert.equal(await getOrderReceipt(guestB.orderNumber, viewer, now), null);
    assert.equal(await getOrderReceipt(orderB.orderNumber, viewer, now), null);
  });

  await t.test("knowing an order number without a grant does not grant access", async () => {
    assert.equal(await getOrderReceipt(guestA.orderNumber, { kind: "guest" }, now), null);
    assert.equal(await getOrderReceipt(orderA.orderNumber, { kind: "guest" }, now), null);
  });

  await t.test("the exact guest receipt expiry boundary and later timestamps are rejected", async () => {
    const viewer = { kind: "guest", token: grantA.token } as const;
    const expiry = grantA.proof.guestReceiptExpiresAt;
    assert.equal(await getOrderReceipt(guestA.orderNumber, viewer, expiry), null);
    assert.equal(await getOrderReceipt(guestA.orderNumber, viewer, new Date(expiry.getTime() + 1)), null);
  });

  await t.test("malformed and well-formed invalid guest tokens are rejected", async () => {
    for (const token of ["invalid", createGuestReceipt(now).token]) {
      assert.equal(await getOrderReceipt(guestA.orderNumber, { kind: "guest", token }, now), null);
    }
  });

  await t.test("authenticated customers can access their own orders and receipts", async () => {
    assert.equal((await getCustomerOrder(accountB.id, orderB.orderNumber))?.orderNumber, orderB.orderNumber);
    assert.equal((await getOrderReceipt(orderB.orderNumber, buyerB, now))?.orderNumber, orderB.orderNumber);
  });

  await t.test("a legitimate guest can view a minimized receipt with the matching grant", async () => {
    const receipt = await getOrderReceipt(guestA.orderNumber, { kind: "guest", token: grantA.token }, now);
    assert.ok(receipt);
    assert.equal(receipt.orderNumber, guestA.orderNumber);
    assert.deepEqual(Object.keys(receipt).sort(), ["items", "orderNumber", "status", "total"]);
    assert.equal(receipt.items.length, 1);
  });

  await t.test("new orders with the same delivery phone retain independent ownership", async () => {
    const own = await prisma.customer.findUniqueOrThrow({ where: { userId: accountB.id } });
    assert.notEqual(own.id, accountA.customer!.id);
    const guest = await prisma.order.findUniqueOrThrow({ where: { orderNumber: guestB.orderNumber }, include: { customer: true } });
    assert.equal(guest.userId, null);
    assert.ok(guest.customer);
    assert.equal(guest.customer.userId, null);
    assert.notEqual(guest.customerId, own.id);
    assert.notEqual(guest.guestReceiptTokenHash, grantB.token);
    assert.equal(guest.guestReceiptTokenHash, grantB.proof.guestReceiptTokenHash);
  });

  await t.test("reused checkout keys do not disclose unrelated orders or grant new guest access", async () => {
    await assert.rejects(createOrder(accountBInput, buyerA), /Unable to resume/);
    await assert.rejects(createOrder(guestAInput, { kind: "guest", receipt: createGuestReceipt(now).proof }), /Unable to resume/);
    assert.deepEqual(await createOrder(accountBInput, buyerB), orderB);
  });
});
