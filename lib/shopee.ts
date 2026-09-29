import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SORT_OPTIONS, type ShopeeOffer, type SortKey } from "@/lib/shopee-shared";

export * from "@/lib/shopee-shared";

// API de Afiliados da Shopee Brasil (GraphQL).
// Credenciais: https://affiliate.shopee.com.br > Open API (AppID e Senha).
const ENDPOINT = process.env.SHOPEE_API_URL ?? "https://open-api.affiliate.shopee.com.br/graphql";

export type ShopeeCredentials = { appId: string; secret: string };

const ERRORS: Record<number, string> = {
  10020: "AppID ou Senha da Shopee incorretos.",
  10030: "Limite de consultas da Shopee atingido. Tente de novo em alguns minutos.",
  10035: "Sem acesso à Open API: confira o AppID ou solicite o acesso no painel de afiliados da Shopee.",
};

export class ShopeeError extends Error {}

export async function getShopeeCredentials(supabase: SupabaseClient): Promise<ShopeeCredentials | null> {
  const { data } = await supabase.from("settings").select("key, value").in("key", ["shopee_app_id", "shopee_secret"]);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  if (!map.shopee_app_id || !map.shopee_secret) return null;
  return { appId: map.shopee_app_id, secret: map.shopee_secret };
}

async function graphql<T>(creds: ShopeeCredentials, query: string): Promise<T> {
  const payload = JSON.stringify({ query });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256")
    .update(`${creds.appId}${timestamp}${payload}${creds.secret}`)
    .digest("hex");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `SHA256 Credential=${creds.appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  const err = json?.errors?.[0];
  if (err) {
    const code = Number(err.extensions?.code);
    throw new ShopeeError(ERRORS[code] ?? `Erro da Shopee: ${err.extensions?.message ?? err.message}`);
  }
  if (!res.ok || !json?.data) throw new ShopeeError(`A Shopee respondeu com erro (${res.status}).`);
  return json.data as T;
}

const OFFER_FIELDS = `itemId shopId productName imageUrl priceMin priceDiscountRate commissionRate commission
  sales ratingStar shopName productLink offerLink`;

type RawOffer = {
  itemId: number | string;
  shopId: number | string;
  productName: string;
  imageUrl: string;
  priceMin: string | number;
  priceDiscountRate: number | string | null;
  commissionRate: string | number;
  commission: string | number;
  sales: number | string;
  ratingStar: string | number;
  shopName: string;
  productLink: string;
  offerLink: string;
};

function toOffer(raw: RawOffer): ShopeeOffer {
  const price = Number(raw.priceMin) || 0;
  const discount = Number(raw.priceDiscountRate) || 0;
  return {
    itemId: Number(raw.itemId),
    shopId: Number(raw.shopId),
    name: raw.productName,
    imageUrl: raw.imageUrl,
    price,
    originalPrice: discount > 0 && discount < 100 ? Math.round((price / (1 - discount / 100)) * 100) / 100 : null,
    commissionRate: Number(raw.commissionRate) || 0,
    commission: Number(raw.commission) || 0,
    sales: Number(raw.sales) || 0,
    rating: Number(raw.ratingStar) || 0,
    shopName: raw.shopName,
    productLink: raw.productLink,
    offerLink: raw.offerLink,
  };
}

export async function searchOffers(
  creds: ShopeeCredentials,
  { keyword, sort, page = 1, limit = 20 }: { keyword: string; sort: SortKey; page?: number; limit?: number },
): Promise<{ offers: ShopeeOffer[]; hasNextPage: boolean }> {
  const args = [
    keyword ? `keyword: ${JSON.stringify(keyword)}` : "",
    `sortType: ${SORT_OPTIONS[sort].value}`,
    `page: ${page}`,
    `limit: ${limit}`,
  ].filter(Boolean);
  const data = await graphql<{ productOfferV2: { nodes: RawOffer[]; pageInfo: { hasNextPage: boolean } } }>(
    creds,
    `{ productOfferV2(${args.join(", ")}) { nodes { ${OFFER_FIELDS} } pageInfo { hasNextPage } } }`,
  );
  return {
    offers: data.productOfferV2.nodes.map(toOffer),
    hasNextPage: data.productOfferV2.pageInfo.hasNextPage,
  };
}

export async function getOffer(creds: ShopeeCredentials, shopId: number, itemId: number): Promise<ShopeeOffer | null> {
  const data = await graphql<{ productOfferV2: { nodes: RawOffer[] } }>(
    creds,
    `{ productOfferV2(shopId: ${shopId}, itemId: ${itemId}, limit: 1) { nodes { ${OFFER_FIELDS} } } }`,
  );
  const node = data.productOfferV2.nodes[0];
  return node ? toOffer(node) : null;
}

/**
 * Extrai shopId e itemId de um link da Shopee. Aceita:
 * - shopee.com.br/Nome-do-produto-i.123.456
 * - shopee.com.br/product/123/456
 * - links curtos (s.shopee.com.br/xxx), que são seguidos até o link final
 */
export async function parseShopeeUrl(input: string): Promise<{ shopId: number; itemId: number } | null> {
  let url = input.trim();
  for (let hop = 0; hop < 5; hop++) {
    const ids = matchIds(url);
    if (ids) return ids;
    if (!isShopeeHost(url)) return null;

    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    } catch {
      return null;
    }
    const next = res.headers.get("location");
    if (!next) return null;
    url = new URL(next, url).toString();
  }
  return null;
}

function isShopeeHost(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (/(^|\.)shopee\.com\.br$/.test(hostname) || hostname === "shp.ee");
  } catch {
    return false;
  }
}

function matchIds(url: string): { shopId: number; itemId: number } | null {
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {}
  const m = decoded.match(/-i\.(\d+)\.(\d+)/) ?? decoded.match(/\/product\/(\d+)\/(\d+)/);
  return m ? { shopId: Number(m[1]), itemId: Number(m[2]) } : null;
}
