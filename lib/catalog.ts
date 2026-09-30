import "server-only";
import { unstable_cache } from "next/cache";
import { TAGS } from "@/lib/cache";
import { PAGE_SIZE, type Product } from "@/lib/products";
import type { Section } from "@/lib/sections";
import type { StoreId } from "@/lib/site";
import { createAnonClient } from "@/lib/supabase/server";

// Consultas da vitrine pública. Ficam em cache até o painel salvar algo (updateTag),
// então o banco só é consultado quando algo muda ou a cada hora, por garantia.

export type ProductFilters = { q?: string; category?: string; store?: StoreId; page: number };

export const getProductsPage = unstable_cache(
  async ({ q, category, store, page }: ProductFilters): Promise<{ products: Product[]; total: number }> => {
    const { data, error } = await createAnonClient().rpc("list_products", {
      p_q: q || null,
      p_category: category || null,
      p_store: store || null,
      p_limit: PAGE_SIZE,
      p_offset: (Math.max(page, 1) - 1) * PAGE_SIZE,
    });
    if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);
    const rows = (data ?? []) as (Product & { total_count: number })[];
    return {
      products: rows.map(({ total_count: _, ...p }) => ({ ...p, price: Number(p.price), original_price: p.original_price === null ? null : Number(p.original_price) })),
      total: rows.length ? Number(rows[0].total_count) : 0,
    };
  },
  ["products-page"],
  { tags: [TAGS.products], revalidate: 3600 },
);

export const getCategories = unstable_cache(
  async (): Promise<{ category: string; total: number }[]> => {
    const { data, error } = await createAnonClient().rpc("product_categories");
    if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);
    return ((data ?? []) as { category: string; total: number }[]).map((c) => ({ ...c, total: Number(c.total) }));
  },
  ["product-categories"],
  { tags: [TAGS.products], revalidate: 3600 },
);

export const getActiveSections = unstable_cache(
  async (): Promise<Section[]> => {
    const { data, error } = await createAnonClient()
      .from("sections")
      .select("*")
      .eq("active", true)
      .order("position")
      .order("created_at");
    if (error) throw new Error(`Falha ao carregar seções: ${error.message}`);
    return (data ?? []) as Section[];
  },
  ["active-sections"],
  { tags: [TAGS.sections], revalidate: 3600 },
);
