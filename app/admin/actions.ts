"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/products";
import {
  getOffer,
  getShopeeCredentials,
  parseShopeeUrl,
  searchOffers,
  ShopeeError,
  type ShopeeOffer,
  type SortKey,
} from "@/lib/shopee";
import { stores, type StoreId } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

function errorMessage(e: unknown): string {
  if (e instanceof ShopeeError) return e.message;
  console.error(e);
  return "Algo deu errado. Tente novamente.";
}

function refreshSite() {
  revalidatePath("/");
  revalidatePath("/admin", "layout");
}

// ---------- Login ----------

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "E-mail ou senha incorretos." };
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------- Produtos ----------

async function uniqueSlug(supabase: SupabaseClient, title: string): Promise<string> {
  const base = slugify(title) || "produto";
  const { data } = await supabase.from("products").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function parseMoney(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  // Aceita "1.234,56", "1234,56" e "1234.56"
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "") || undefined;

  const title = String(formData.get("title") ?? "").trim();
  const affiliateUrl = String(formData.get("affiliate_url") ?? "").trim();
  const store = String(formData.get("store") ?? "shopee") as StoreId;
  const price = parseMoney(formData.get("price"));
  const originalPrice = parseMoney(formData.get("original_price"));
  const rate = parseMoney(formData.get("commission_rate"));

  if (title.length < 3) return { error: "Informe o nome do produto." };
  if (!/^https?:\/\//i.test(affiliateUrl)) return { error: "O link de afiliado precisa começar com https://" };
  if (!(store in stores)) return { error: "Loja inválida." };
  if (price === null || Number.isNaN(price)) return { error: "Informe um preço válido." };
  if (Number.isNaN(originalPrice)) return { error: "Preço antigo inválido." };
  if (Number.isNaN(rate) || (rate !== null && rate > 100)) return { error: "Comissão inválida (use de 0 a 100)." };

  const optionalNumber = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v ? Number(v) : null;
  };

  const row = {
    title,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    price,
    original_price: originalPrice && originalPrice > price ? originalPrice : null,
    store,
    category: String(formData.get("category") ?? "").trim() || "Outros",
    affiliate_url: affiliateUrl,
    source_url: String(formData.get("source_url") ?? "").trim() || null,
    shopee_shop_id: optionalNumber("shopee_shop_id"),
    shopee_item_id: optionalNumber("shopee_item_id"),
    commission_rate: rate === null ? null : rate / 100,
    sales: optionalNumber("sales"),
    rating: optionalNumber("rating"),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    ...(formData.get("price_checked") === "1" ? { price_checked_at: new Date().toISOString() } : {}),
  };

  // O slug (link curto /go/<slug>) não muda ao editar, para não quebrar links já divulgados.
  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert({ ...row, slug: await uniqueSlug(supabase, title) });

  if (error) {
    if (error.code === "23505") return { error: "Esse produto da Shopee já está cadastrado." };
    return { error: errorMessage(error) };
  }

  refreshSite();
  redirect(`/admin?salvo=${id ? "editado" : "criado"}`);
}

export async function setProductFlag(id: string, field: "active" | "featured", value: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("products")
    .update({ [field]: value })
    .eq("id", id);
  if (error) return { error: errorMessage(error) };
  refreshSite();
  return {};
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: errorMessage(error) };
  refreshSite();
  return {};
}

// ---------- Shopee ----------

export type ShopeeLookup = {
  error?: string;
  product?: {
    title: string;
    image_url: string;
    price: number;
    original_price: number | null;
    affiliate_url: string;
    source_url: string;
    shopee_shop_id: number;
    shopee_item_id: number;
    commission_rate: number;
    sales: number;
    rating: number;
  };
};

/** Busca os dados de um produto a partir do link dele na Shopee. */
export async function lookupShopeeLink(url: string): Promise<ShopeeLookup> {
  const { supabase } = await requireAdmin();
  const creds = await getShopeeCredentials(supabase);
  if (!creds) return { error: "Conecte sua conta de afiliado da Shopee em Configurações para preencher automaticamente." };

  const ids = await parseShopeeUrl(url);
  if (!ids) return { error: "Não reconheci esse link. Cole o link da página do produto na Shopee." };

  try {
    const offer = await getOffer(creds, ids.shopId, ids.itemId);
    if (!offer) return { error: "Esse produto não participa do programa de afiliados (ou não está disponível)." };
    return { product: offerToFields(offer) };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

function offerToFields(o: ShopeeOffer) {
  return {
    title: o.name,
    image_url: o.imageUrl,
    price: o.price,
    original_price: o.originalPrice,
    affiliate_url: o.offerLink,
    source_url: o.productLink,
    shopee_shop_id: o.shopId,
    shopee_item_id: o.itemId,
    commission_rate: o.commissionRate,
    sales: o.sales,
    rating: o.rating,
  };
}

export async function searchShopee(keyword: string, sort: SortKey, page: number) {
  const { supabase } = await requireAdmin();
  const creds = await getShopeeCredentials(supabase);
  if (!creds) return { error: "Conecte sua conta da Shopee em Configurações." };
  try {
    return await searchOffers(creds, { keyword: keyword.trim(), sort, page });
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function importOffers(offers: ShopeeOffer[], category: string) {
  const { supabase } = await requireAdmin();
  let imported = 0;
  let skipped = 0;

  for (const offer of offers) {
    const row = {
      ...offerToFields(offer),
      store: "shopee",
      category: category.trim() || "Outros",
      slug: await uniqueSlug(supabase, offer.name),
      price_checked_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("products").insert(row);
    if (!error) imported++;
    else if (error.code === "23505") skipped++;
    else return { error: errorMessage(error), imported, skipped };
  }

  refreshSite();
  return { imported, skipped };
}

/** Atualiza preço, comissão e vendas de todos os produtos importados da Shopee. */
export async function refreshShopeePrices() {
  const { supabase } = await requireAdmin();
  const creds = await getShopeeCredentials(supabase);
  if (!creds) return { error: "Conecte sua conta da Shopee em Configurações." };

  const { data: products, error } = await supabase
    .from("products")
    .select("id, shopee_shop_id, shopee_item_id")
    .eq("store", "shopee")
    .not("shopee_item_id", "is", null);
  if (error) return { error: errorMessage(error) };

  let updated = 0;
  let unavailable = 0;
  for (const p of products ?? []) {
    try {
      const offer = await getOffer(creds, p.shopee_shop_id, p.shopee_item_id);
      const now = new Date().toISOString();
      if (!offer) {
        // Saiu do programa de afiliados ou foi removido: esconde da vitrine.
        await supabase.from("products").update({ active: false, price_checked_at: now }).eq("id", p.id);
        unavailable++;
        continue;
      }
      await supabase
        .from("products")
        .update({
          price: offer.price,
          original_price: offer.originalPrice,
          commission_rate: offer.commissionRate,
          sales: offer.sales,
          rating: offer.rating,
          image_url: offer.imageUrl,
          affiliate_url: offer.offerLink,
          price_checked_at: now,
        })
        .eq("id", p.id);
      updated++;
    } catch (e) {
      refreshSite();
      return { error: errorMessage(e), updated, unavailable };
    }
  }

  refreshSite();
  return { updated, unavailable };
}

// ---------- Configurações ----------

export async function saveShopeeCredentials(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const appId = String(formData.get("app_id") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  if (!appId || !secret) return { error: "Preencha o AppID e a Senha." };

  try {
    await searchOffers({ appId, secret }, { keyword: "fone", sort: "relevancia", limit: 1 });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  const { error } = await supabase.from("settings").upsert([
    { key: "shopee_app_id", value: appId, updated_at: new Date().toISOString() },
    { key: "shopee_secret", value: secret, updated_at: new Date().toISOString() },
  ]);
  if (error) return { error: errorMessage(error) };

  revalidatePath("/admin", "layout");
  return { success: "Conta da Shopee conectada!" };
}

export async function disconnectShopee() {
  const { supabase } = await requireAdmin();
  await supabase.from("settings").delete().in("key", ["shopee_app_id", "shopee_secret"]);
  revalidatePath("/admin", "layout");
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== formData.get("confirm")) return { error: "As senhas não conferem." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível trocar a senha. Tente outra." };
  return { success: "Senha alterada." };
}
