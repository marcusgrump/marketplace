import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCategories(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("products").select("category");
  return [...new Set((data ?? []).map((r) => r.category as string))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function isShopeeConnected(supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase
    .from("settings")
    .select("key", { count: "exact", head: true })
    .eq("key", "shopee_app_id");
  return (count ?? 0) > 0;
}
