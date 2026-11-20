import { createHash, randomBytes } from "node:crypto";

const RECEIPT_LIFETIME_MS = 30 * 60 * 1000;
const RECEIPT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const GUEST_RECEIPT_COOKIE = "shopbd_guest_receipt";

export type GuestReceiptProof = {
  guestReceiptTokenHash: string;
  guestReceiptExpiresAt: Date;
};

export type CheckoutBuyer =
  | { kind: "customer"; userId: string }
  | { kind: "guest"; receipt: GuestReceiptProof };

export type ReceiptViewer =
  | { kind: "customer"; userId: string }
  | { kind: "guest"; token?: string };

function hashReceiptToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createGuestReceipt(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const proof: GuestReceiptProof = {
    guestReceiptTokenHash: hashReceiptToken(token),
    guestReceiptExpiresAt: new Date(now.getTime() + RECEIPT_LIFETIME_MS),
  };
  return { token, proof };
}

export function guestReceiptPath(orderNumber: string) {
  return `/order-success/${encodeURIComponent(orderNumber)}`;
}

export function customerOrderOwnership(userId: string) {
  // Never authorize by customerId: legacy links may have been made by phone.
  if (!userId) throw new Error("A customer session is required");
  return { userId };
}

export function receiptWhere(orderNumber: string, viewer: ReceiptViewer, now = new Date()) {
  if (viewer.kind === "customer") {
    return { orderNumber, ...customerOrderOwnership(viewer.userId) };
  }
  if (!viewer.token || !RECEIPT_TOKEN_PATTERN.test(viewer.token)) return null;
  return {
    orderNumber,
    userId: null,
    guestReceiptTokenHash: hashReceiptToken(viewer.token),
    guestReceiptExpiresAt: { gt: now },
  };
}

export function isOwnedCheckoutReplay(buyer: CheckoutBuyer, orderUserId: string | null) {
  // The idempotency key is not a receipt grant or a guest credential.
  return buyer.kind === "customer" && buyer.userId === orderUserId;
}
