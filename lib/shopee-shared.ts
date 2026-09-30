// Tipos e regras da Shopee que podem ser usados também no navegador.

export type ShopeeOffer = {
  itemId: number;
  shopId: number;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  commissionRate: number; // 0.12 = 12%
  commission: number; // comissão estimada por venda, em R$
  sales: number;
  rating: number;
  shopName: string;
  productLink: string;
  offerLink: string;
};

export const SORT_OPTIONS = {
  relevancia: { label: "Relevância", value: 1 },
  vendidos: { label: "Mais vendidos", value: 2 },
  comissao: { label: "Maior comissão", value: 5 },
  menor_preco: { label: "Menor preço", value: 4 },
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

/** Recomendação simples: boa comissão, produto que já vende e é bem avaliado. */
export function isRecommended(o: Pick<ShopeeOffer, "commissionRate" | "sales" | "rating">): boolean {
  return o.commissionRate >= 0.08 && o.sales >= 100 && o.rating >= 4.5;
}
