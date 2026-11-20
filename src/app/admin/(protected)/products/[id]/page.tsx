import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { getProductById } from "@/server/repositories/product.repo";
import { listCategories } from "@/server/services/category.service";
import { ProductForm } from "@/components/admin/product-form";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";
import type { SafeProduct } from "@/types/domain";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [productResult, categoriesResult] = await Promise.all([
    attempt("admin.productDetail", () => getProductById(id)),
    attempt("admin.productCategories", listCategories),
  ]);

  if (!productResult.ok || !categoriesResult.ok) {
    return (
      <AppError
        variant="admin"
        title="This product could not be loaded"
        description="We couldn't fetch the product details. Your data is safe — please retry in a moment."
      />
    );
  }

  const product = productResult.value;
  const categories = categoriesResult.value;
  if (!product) notFound();

  const safeProduct = {
    ...product,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    costPrice: product.costPrice?.toString() ?? null,
    images: product.images.map((i) => ({ ...i, url: i.url })),
    variants: product.variants.map((v) => ({ ...v, price: v.price?.toString() ?? null })),
    categories: product.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  } as SafeProduct;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Product</h1>
      <ProductForm product={safeProduct} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
