import type { StoreId } from "@/lib/site";

/** Linha da tabela public.products. */
export type ProductRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  price: number;
  original_price: number | null;
  store: StoreId;
  category: string;
  affiliate_url: string;
  source_url: string | null;
  shopee_shop_id: number | null;
  shopee_item_id: number | null;
  commission_rate: number | null;
  sales: number | null;
  rating: number | null;
  featured: boolean;
  active: boolean;
  price_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Campos que a vitrine pública usa. */
export type Product = Pick<
  ProductRow,
  "id" | "slug" | "title" | "image_url" | "price" | "original_price" | "store" | "category" | "featured"
>;

export const PUBLIC_COLUMNS = "id, slug, title, image_url, price, original_price, store, category, featured";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(value: number): string {
  return brl.format(value);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function discountPercent(p: Pick<Product, "price" | "original_price">): number | null {
  if (!p.original_price || p.original_price <= p.price) return null;
  return Math.round((1 - p.price / p.original_price) * 100);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
