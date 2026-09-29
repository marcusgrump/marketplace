import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/admin";

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Novo produto</h1>
      <ProductForm categories={await getCategories(supabase)} />
    </div>
  );
}
