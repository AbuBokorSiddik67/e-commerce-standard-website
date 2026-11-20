"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCategoryAction, deleteCategoryAction } from "@/server/actions/admin";
import { CategoryForm, type CategoryFormValues } from "./category-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";

type Category = CategoryFormValues & { id: string; _count?: { products: number } };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            </DialogHeader>
            <CategoryForm
              category={editing}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              onDone={() => { setOpen(false); setEditing(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Slug</th>
                  <th className="p-4 font-medium">Products</th>
                  <th className="p-4 font-medium">Homepage</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No categories yet</td></tr>
                )}
                {categories.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4 text-muted-foreground">{c.slug}</td>
                    <td className="p-4">{c._count?.products ?? 0}</td>
                    <td className="p-4">{c.showOnHome ? <Badge>Shown</Badge> : <Badge variant="outline">Hidden</Badge>}</td>
                    <td className="p-4">{c.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete &quot;{c.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={deleting}
                                onClick={(e) => {
                                  e.preventDefault();
                                  startDelete(async () => {
                                    const res = await deleteCategoryAction(c.id);
                                    if (res.success) { toast.success("Deleted"); router.refresh(); }
                                    else toast.error(res.error ?? "Failed");
                                  });
                                }}
                              >
                                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
