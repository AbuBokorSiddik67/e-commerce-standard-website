import { requireAdmin } from "@/lib/auth-guard";
import { listCoupons } from "@/server/services/content.service";
import { CouponManager } from "@/components/admin/coupon-manager";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function AdminCouponsPage() {
  await requireAdmin();
  const couponsResult = await attempt("admin.coupons", listCoupons);

  if (!couponsResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Coupons could not be loaded"
        description="We couldn't reach the coupon database. Please retry in a moment."
      />
    );
  }

  const coupons = couponsResult.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="text-sm text-muted-foreground">Discount codes customers can apply at checkout</p>
      </div>
      <CouponManager coupons={coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value.toString(),
        minOrderAmount: c.minOrderAmount?.toString() ?? null,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        isActive: c.isActive,
      }))} />
    </div>
  );
}
