-- Additive read indexes only; existing products, reviews and orders are unchanged.
CREATE INDEX "Product_active_created_id_idx" ON "Product" ("isActive", "createdAt" DESC, "id");
CREATE INDEX "Product_active_price_id_idx" ON "Product" ("isActive", "price", "id");
CREATE INDEX "ProductImage_product_sort_id_idx" ON "ProductImage" ("productId", "sortOrder", "id");
CREATE INDEX "Review_product_approved_created_id_idx" ON "Review" ("productId", "isApproved", "createdAt" DESC, "id" DESC);
CREATE INDEX "Order_status_placed_idx" ON "Order" ("status", "placedAt" DESC);
