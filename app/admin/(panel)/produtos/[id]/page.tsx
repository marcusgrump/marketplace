import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/admin";
import type { ProductRow } from "@/lib/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Editar produto</h1>
      <ProductForm product={data as ProductRow} categories={await getCategories(supabase)} />
    </div>
  );
}
