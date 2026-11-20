-- Existing orders retain null grants; no historical ownership is inferred.
ALTER TABLE "Order"
  ADD COLUMN "guestReceiptTokenHash" TEXT,
  ADD COLUMN "guestReceiptExpiresAt" TIMESTAMP(3);
