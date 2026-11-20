-- Additive only; no customer/order records are rewritten or reassigned.
ALTER TABLE "DeliveryZone" ADD COLUMN "districts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProductVariant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Coupon" ADD COLUMN "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Order" ADD COLUMN "checkoutFingerprint" TEXT,
  ADD COLUMN "guestCheckoutScope" TEXT,
  ADD COLUMN "inventoryVersion" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "CouponRedemption" (
  "couponId" TEXT NOT NULL,
  "buyerKey" TEXT NOT NULL,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("couponId", "buyerKey"),
  CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Order_userId_placedAt_idx" ON "Order"("userId", "placedAt");
-- Enforce new writes without rewriting historical rows that need operator review.
ALTER TABLE "Product" ADD CONSTRAINT "Product_nonnegative_stock" CHECK ("stock" >= 0) NOT VALID;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_nonnegative_stock" CHECK ("stock" >= 0) NOT VALID;
