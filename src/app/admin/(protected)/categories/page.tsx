import { requireAdmin } from "@/lib/auth-guard";
import { listCategories } from "@/server/services/category.service";
import { CategoryManager } from "@/components/admin/category-manager";
import { AppError } from "@/components/shared/app-error";
import { attempt } from "@/lib/errors";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categoriesResult = await attempt("admin.categories", listCategories);

  if (!categoriesResult.ok) {
    return (
      <AppError
        variant="admin"
        title="Categories could not be loaded"
        description="We couldn't reach the category database. Please retry in a moment."
      />
    );
  }

  const categories = categoriesResult.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Categories</h1>
        <p className="text-sm text-muted-foreground">Organize your products into collections</p>
      </div>
      <CategoryManager categories={categories as never} />
    </div>
  );
}
