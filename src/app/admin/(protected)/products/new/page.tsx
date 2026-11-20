import { requireAdmin } from "@/lib/auth-guard";
import { listCategories } from "@/server/services/category.service";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Add Product</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
