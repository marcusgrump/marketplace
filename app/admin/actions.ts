"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { TAGS } from "@/lib/cache";
import { slugify } from "@/lib/products";
import { SECTION_SUGGESTIONS } from "@/lib/sections";
import {
  getOffer,
  getShopeeCredentials,
  parseShopeeUrl,
  searchOffers,
  ShopeeError,
  SORT_OPTIONS,
  type ShopeeOffer,
  type SortKey,
} from "@/lib/shopee";
import { stores, type StoreId } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;
export type ActionResult = { error?: string };

function errorMessage(e: unknown): string {
  if (e instanceof ShopeeError) return e.message;
  console.error(e);
  return "Algo deu errado. Tente novamente.";
}

// O site guarda produtos e seções em cache; isto faz a próxima visita já ver a mudança.
function productsChanged() {
  updateTag(TAGS.products);
}

function sectionsChanged() {
  updateTag(TAGS.sections);
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

// Slugs que são rotas próprias em /go/<slug> (ex.: /go/v) e não podem virar link de produto.
const RESERVED_SLUGS = new Set(["v"]);

async function uniqueSlug(supabase: SupabaseClient, title: string): Promise<string> {
  const base = slugify(title) || "produto";
  const { data } = await supabase.from("products").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  const isTaken = (slug: string) => taken.has(slug) || RESERVED_SLUGS.has(slug);
  if (!isTaken(base)) return base;
  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
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
    shopee_shop_id: optionalNumber("shopee_shop_id"),
    shopee_item_id: optionalNumber("shopee_item_id"),
    commission_rate: rate === null ? null : rate / 100,
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

  productsChanged();
  redirect(`/admin?salvo=${id ? "editado" : "criado"}`);
}

export async function setProductFlag(id: string, field: "active" | "featured", value: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("products")
    .update({ [field]: value })
    .eq("id", id);
  if (error) return { error: errorMessage(error) };
  productsChanged();
  return {};
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: errorMessage(error) };
  productsChanged();
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
    shopee_shop_id: number;
    shopee_item_id: number;
    commission_rate: number;
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
    shopee_shop_id: o.shopId,
    shopee_item_id: o.itemId,
    commission_rate: o.commissionRate,
  };
}

export async function searchShopee(keyword: string, sort: SortKey, page: number) {
  const { supabase } = await requireAdmin();
  const creds = await getShopeeCredentials(supabase);
  if (!creds) return { error: "Conecte sua conta da Shopee em Configurações." };
  try {
    const result = await searchOffers(creds, { keyword: keyword.trim(), sort, page });
    // Quais itens deste resultado já estão cadastrados (evita carregar todos os ids do catálogo).
    const ids = result.offers.map((o) => o.itemId);
    let existingIds: number[] = [];
    if (ids.length) {
      const { data, error } = await supabase.from("products").select("shopee_item_id").in("shopee_item_id", ids);
      if (error) return { error: errorMessage(error) };
      existingIds = (data ?? []).map((r) => Number(r.shopee_item_id));
    }
    return { ...result, existingIds };
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
    else {
      if (imported) productsChanged();
      return { error: errorMessage(error), imported, skipped };
    }
  }

  if (imported) productsChanged();
  return { imported, skipped };
}

/** Atualiza preço, comissão, foto e link de todos os produtos importados da Shopee. */
export async function refreshShopeePrices() {
  const { supabase } = await requireAdmin();
  const creds = await getShopeeCredentials(supabase);
  if (!creds) return { error: "Conecte sua conta da Shopee em Configurações." };

  // Lê em lotes de 500 (o banco limita cada resposta a 1000 linhas), ordenados por id.
  const BATCH = 500;
  const loadBatch = (from: number) =>
    supabase
      .from("products")
      .select("id, shopee_shop_id, shopee_item_id")
      .eq("store", "shopee")
      .not("shopee_item_id", "is", null)
      .order("id")
      .range(from, from + BATCH - 1);

  let updated = 0;
  let unavailable = 0;
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await loadBatch(from);
    if (error) {
      if (updated || unavailable) productsChanged();
      return { error: errorMessage(error), updated, unavailable };
    }
    const batch = data ?? [];

    for (const p of batch) {
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
            image_url: offer.imageUrl,
            affiliate_url: offer.offerLink,
            price_checked_at: now,
          })
          .eq("id", p.id);
        updated++;
      } catch (e) {
        productsChanged();
        return { error: errorMessage(e), updated, unavailable };
      }
    }

    if (batch.length < BATCH) break;
  }

  productsChanged();
  return { updated, unavailable };
}

// ---------- Vitrine automática (seções) ----------

export type SectionInput = { title: string; keyword: string; sort: string };

function parseSectionInput(input: SectionInput): { error: string } | { title: string; keyword: string; sort: SortKey } {
  const title = String(input?.title ?? "").trim().replace(/\s+/g, " ");
  const keyword = String(input?.keyword ?? "").trim().replace(/\s+/g, " ");
  const sort = String(input?.sort ?? "");
  if (title.length < 2 || title.length > 80) return { error: "O título precisa ter de 2 a 80 caracteres." };
  if (keyword.length > 80) return { error: "A palavra-chave pode ter no máximo 80 caracteres." };
  if (!Object.hasOwn(SORT_OPTIONS, sort)) return { error: "Ordenação inválida." };
  return { title, keyword, sort: sort as SortKey };
}

async function nextSectionPosition(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("sections").select("position").order("position", { ascending: false }).limit(1);
  return data?.length ? Number(data[0].position) + 1 : 0;
}

export async function createSection(input: SectionInput): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = parseSectionInput(input);
  if ("error" in parsed) return parsed;

  const { error } = await supabase
    .from("sections")
    .insert({ ...parsed, position: await nextSectionPosition(supabase), active: true });
  if (error) return { error: errorMessage(error) };
  sectionsChanged();
  return {};
}

export async function updateSection(id: string, input: SectionInput): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = parseSectionInput(input);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("sections").update(parsed).eq("id", id);
  if (error) return { error: errorMessage(error) };
  sectionsChanged();
  return {};
}

export async function setSectionActive(id: string, active: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("sections").update({ active }).eq("id", id);
  if (error) return { error: errorMessage(error) };
  sectionsChanged();
  return {};
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) return { error: errorMessage(error) };
  sectionsChanged();
  return {};
}

/** Troca a seção de lugar com a vizinha e renumera todas (0, 1, 2...) para corrigir posições repetidas. */
export async function moveSection(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("sections").select("id, position").order("position").order("created_at");
  if (error) return { error: errorMessage(error) };

  const rows = data ?? [];
  const order = rows.map((r) => r.id as string);
  const i = order.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0) return { error: "Seção não encontrada." };
  if (j < 0 || j >= order.length) return {};
  [order[i], order[j]] = [order[j], order[i]];

  const changed = order.filter((sid, pos) => rows.find((r) => r.id === sid)?.position !== pos);
  const results = await Promise.all(
    changed.map((sid) => supabase.from("sections").update({ position: order.indexOf(sid) }).eq("id", sid)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: errorMessage(failed.error) };
  sectionsChanged();
  return {};
}

/** Adiciona ao fim da lista as sugestões prontas que ainda não existem (compara pelo título). */
export async function addSuggestedSections(): Promise<ActionResult & { added?: number }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("sections").select("title");
  if (error) return { error: errorMessage(error) };

  const taken = new Set((data ?? []).map((r) => String(r.title).toLocaleLowerCase("pt-BR")));
  const missing = SECTION_SUGGESTIONS.filter((s) => !taken.has(s.title.toLocaleLowerCase("pt-BR")));
  if (!missing.length) return { added: 0 };

  const start = await nextSectionPosition(supabase);
  const { error: insertError } = await supabase
    .from("sections")
    .insert(missing.map((s, i) => ({ ...s, position: start + i, active: true })));
  if (insertError) return { error: errorMessage(insertError) };
  sectionsChanged();
  return { added: missing.length };
}

/** Amostra de produtos da seção, buscada agora com a conta do admin (sem cache). */
export async function previewSection(id: string): Promise<{ error: string } | { offers: ShopeeOffer[] }> {
  const { supabase } = await requireAdmin();
  const creds = await getShopeeCredentials(supabase);
  if (!creds) return { error: "Conecte sua conta da Shopee em Configurações." };

  const { data: section } = await supabase.from("sections").select("keyword, sort").eq("id", id).maybeSingle();
  if (!section) return { error: "Seção não encontrada." };

  try {
    const { offers } = await searchOffers(creds, { keyword: section.keyword ?? "", sort: section.sort, limit: 5 });
    return { offers };
  } catch (e) {
    return { error: errorMessage(e) };
  }
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

  shopeeAccountChanged();
  return { success: "Conta da Shopee conectada!" };
}

export async function disconnectShopee() {
  const { supabase } = await requireAdmin();
  await supabase.from("settings").delete().in("key", ["shopee_app_id", "shopee_secret"]);
  shopeeAccountChanged();
}

/** Troca de conta: o site volta a consultar a Shopee com a conta nova (ou esconde as seções). */
function shopeeAccountChanged() {
  updateTag(TAGS.shopee);
  updateTag(TAGS.sections);
  revalidatePath("/admin", "layout"); // avisos de "Shopee não conectada" em todas as telas do painel
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
