import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  createGuestReceipt,
  customerOrderOwnership,
  guestReceiptPath,
  isOwnedCheckoutReplay,
  receiptWhere,
} from "../src/server/services/order-access";

const now = new Date("2026-11-20T12:00:00Z");
const orderNumber = "TEST-ORDER";

test("account orders and authenticated receipts require the authenticated user ID", () => {
  assert.deepEqual(customerOrderOwnership("customer-a"), { userId: "customer-a" });
  assert.deepEqual(receiptWhere(orderNumber, { kind: "customer", userId: "customer-a" }), {
    orderNumber, userId: "customer-a",
  });
  assert.throws(() => customerOrderOwnership(""), /session is required/);
});

test("guest tokens are independent 256-bit values, persisted as digests with a short expiry", () => {
  const grant = createGuestReceipt(now);
  assert.equal(Buffer.from(grant.token, "base64url").length, 32);
  assert.notEqual(grant.token, createGuestReceipt(now).token);
  assert.equal(grant.proof.guestReceiptTokenHash, createHash("sha256").update(grant.token).digest("hex"));
  assert.equal(grant.proof.guestReceiptExpiresAt.getTime() - now.getTime(), 30 * 60 * 1000);
});

test("a guest lookup requires order scope, anonymous ownership, digest and unexpired grant", () => {
  const grant = createGuestReceipt(now);
  assert.deepEqual(receiptWhere(orderNumber, { kind: "guest", token: grant.token }, now), {
    orderNumber,
    userId: null,
    guestReceiptTokenHash: grant.proof.guestReceiptTokenHash,
    guestReceiptExpiresAt: { gt: now },
  });
  assert.equal(guestReceiptPath(orderNumber), `/order-success/${orderNumber}`);
});

test("order numbers and malformed tokens are not receipt credentials", () => {
  assert.equal(receiptWhere(orderNumber, { kind: "guest" }), null);
  assert.equal(receiptWhere(orderNumber, { kind: "guest", token: orderNumber }), null);
});

test("anonymous sessions and other customers cannot resume a checkout based on its idempotency key", () => {
  const guest = { kind: "guest", receipt: createGuestReceipt(now).proof } as const;
  assert.equal(isOwnedCheckoutReplay(guest, null), false);
  assert.equal(isOwnedCheckoutReplay(guest, "customer-a"), false);
  assert.equal(isOwnedCheckoutReplay({ kind: "customer", userId: "customer-a" }, "customer-b"), false);
  assert.equal(isOwnedCheckoutReplay({ kind: "customer", userId: "customer-a" }, "customer-a"), true);
});
