import type { SupabaseClient } from "@supabase/supabase-js";
import type { Section } from "@/lib/sections";

const DAY = 24 * 60 * 60 * 1000;
export const STALE_DAYS = 7;

export async function getCategories(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc("all_categories");
  if (error) console.error("[all_categories]", error);
  return ((data ?? []) as { category: string }[]).map((r) => r.category);
}

export async function isShopeeConnected(supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase
    .from("settings")
    .select("key", { count: "exact", head: true })
    .eq("key", "shopee_app_id");
  return (count ?? 0) > 0;
}

/** Escapa \, % e _ para usar o texto digitado num filtro ilike. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function getSections(supabase: SupabaseClient): Promise<Section[]> {
  const { data, error } = await supabase.from("sections").select("*").order("position").order("created_at");
  if (error) throw new Error(`Falha ao carregar seções: ${error.message}`);
  return (data ?? []) as Section[];
}

// ---------- Cliques ----------

export type ClickTotals = { today: number; week: number; month: number };

export async function getClickTotals(supabase: SupabaseClient): Promise<ClickTotals> {
  const { data, error } = await supabase.rpc("click_totals");
  if (error) console.error("[click_totals]", error);
  const row = (Array.isArray(data) ? data[0] : data) as Partial<Record<keyof ClickTotals, number | string>> | null;
  return { today: Number(row?.today ?? 0), week: Number(row?.week ?? 0), month: Number(row?.month ?? 0) };
}

/**
 * Cliques por origem no período: "p:<produto>", "s:<seção>" ou "busca".
 * Passe só as origens necessárias em `refs` (o banco devolve no máximo 1000 linhas por chamada).
 */
export async function getClickStats(supabase: SupabaseClient, days = 30, refs?: string[]): Promise<Record<string, number>> {
  if (refs && refs.length === 0) return {};
  const { data, error } = await supabase.rpc("click_stats", { p_days: days, p_refs: refs ?? null });
  if (error) console.error("[click_stats]", error);
  return Object.fromEntries(((data ?? []) as { ref: string; clicks: number | string }[]).map((r) => [r.ref, Number(r.clicks)]));
}

// ---------- Resumo do catálogo (contagens, sem carregar os produtos) ----------

export type CatalogSummary = {
  total: number;
  active: number;
  shopee: number;
  noImage: number;
  featured: number;
  lowCommission: number;
  stale: number;
  cold: number;
};

export async function getCatalogSummary(supabase: SupabaseClient): Promise<CatalogSummary> {
  const since = new Date(Date.now() - STALE_DAYS * DAY).toISOString();
  const count = () => supabase.from("products").select("id", { count: "exact", head: true });
  const n = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0;

  // "Sem cliques" = produtos no ar, com mais de STALE_DAYS dias e sem clique em 30 dias (contado no banco).
  const coldCount = async () => {
    const { data, error } = await supabase.rpc("cold_products_count", { p_days: 30, p_min_age_days: STALE_DAYS });
    if (error) console.error("[cold_products_count]", error);
    return Number(data ?? 0);
  };

  const [total, active, shopee, noImage, featured, lowCommission, stale, cold] = await Promise.all([
    n(count()),
    n(count().eq("active", true)),
    n(count().not("shopee_item_id", "is", null)),
    n(count().eq("active", true).is("image_url", null)),
    n(count().eq("active", true).eq("featured", true)),
    n(count().eq("active", true).lt("commission_rate", 0.05)),
    n(
      count()
        .eq("active", true)
        .not("shopee_item_id", "is", null)
        .or(`price_checked_at.is.null,price_checked_at.lt."${since}"`),
    ),
    coldCount(),
  ]);

  return { total, active, shopee, noImage, featured, lowCommission, stale, cold };
}

// ---------- Recomendações ----------

export type Tip = { text: string; href?: string; cta?: string };

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

export function buildTips({
  summary: s,
  sections,
  clicks,
  shopeeConnected,
}: {
  summary: CatalogSummary;
  sections: Section[];
  clicks: Record<string, number>;
  shopeeConnected: boolean;
}): Tip[] {
  const tips: Tip[] = [];

  if (!shopeeConnected) {
    tips.push({
      text: "Conecte sua conta de afiliado da Shopee para buscar produtos com comissão, importar com 1 clique e ligar a vitrine automática.",
      href: "/admin/configuracoes",
      cta: "Conectar",
    });
  }

  if (s.total === 0) {
    tips.push({
      text: "Comece com 10 a 20 produtos de categorias que seu público compra. Qualidade vale mais que quantidade.",
      href: shopeeConnected ? "/admin/shopee" : "/admin/produtos/novo",
      cta: "Adicionar produtos",
    });
  }
  if (s.noImage) {
    tips.push({ text: `${plural(s.noImage, "produto", "produtos")} sem foto. Produtos com foto recebem muito mais cliques.` });
  }
  if (s.featured === 0 && s.active >= 4) {
    tips.push({ text: "Nenhum produto em destaque. Destaque de 4 a 8 ofertas para aparecerem no topo do site." });
  }
  if (s.lowCommission) {
    tips.push({
      text: `${plural(s.lowCommission, "produto", "produtos")} com comissão abaixo de 5%. Vale procurar um similar com comissão maior.`,
      href: shopeeConnected ? "/admin/shopee" : undefined,
      cta: "Buscar alternativas",
    });
  }
  if (s.stale && shopeeConnected) {
    tips.push({
      text: `${plural(s.stale, "produto", "produtos")} com preço conferido há mais de ${STALE_DAYS} dias. Clique em "Atualizar preços".`,
    });
  }
  if (s.cold) {
    tips.push({
      text: `${plural(s.cold, "produto", "produtos")} sem nenhum clique em 30 dias. Troque por outros ou divulgue o link curto deles.`,
    });
  }

  // Vitrine automática
  const active = sections.filter((x) => x.active);
  const sectionClicks = (x: Section) => clicks[`s:${x.id}`] ?? 0;

  if (shopeeConnected && active.length === 0) {
    tips.push({
      text: "Ative a vitrine automática: mostra centenas de produtos da Shopee sem guardar nada no banco.",
      href: "/admin/vitrine",
      cta: "Montar vitrine",
    });
  }

  const cutoff = Date.now() - STALE_DAYS * DAY;
  const coldSections = active.filter((x) => new Date(x.created_at).getTime() < cutoff && sectionClicks(x) === 0);
  if (coldSections.length) {
    tips.push({
      text:
        coldSections.length === 1
          ? `A seção "${coldSections[0].title}" não teve cliques em 30 dias. Troque a palavra-chave ou a ordenação.`
          : `${coldSections.length} seções sem cliques em 30 dias (ex.: "${coldSections[0].title}"). Troque a palavra-chave ou a ordenação.`,
      href: "/admin/vitrine",
      cta: "Editar seções",
    });
  }

  const best = [...active].sort((a, b) => sectionClicks(b) - sectionClicks(a))[0];
  if (best && sectionClicks(best) > 0) {
    const onTop = active[0]?.id === best.id;
    tips.push({
      text: `A seção "${best.title}" é a que mais gera cliques (${plural(sectionClicks(best), "clique", "cliques")} em 30 dias). ${
        onTop ? "Crie outras parecidas." : "Suba ela para o topo da página."
      }`,
      href: onTop ? undefined : "/admin/vitrine",
      cta: "Reordenar",
    });
  }

  const search = clicks.busca ?? 0;
  if (search > 0) {
    tips.push({
      text: `Visitantes clicaram ${plural(search, "vez", "vezes")} em resultados da Shopee na busca do site. Transforme as buscas mais comuns em seções.`,
      href: "/admin/vitrine",
      cta: "Criar seção",
    });
  }

  return tips;
}
