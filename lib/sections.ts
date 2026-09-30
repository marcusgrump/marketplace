import type { SortKey } from "@/lib/shopee-shared";

/** Seção da vitrine automática: os produtos vêm da Shopee na hora, nada é guardado no banco. */
export type Section = {
  id: string;
  title: string;
  keyword: string;
  sort: SortKey;
  position: number;
  active: boolean;
  created_at: string;
};

/** Sugestões prontas para começar a vitrine automática. */
export const SECTION_SUGGESTIONS: Pick<Section, "title" | "keyword" | "sort">[] = [
  { title: "Mais vendidos da Shopee", keyword: "", sort: "vendidos" },
  { title: "Maior comissão", keyword: "", sort: "comissao" },
  { title: "Casa e cozinha", keyword: "cozinha", sort: "vendidos" },
  { title: "Beleza", keyword: "skincare", sort: "vendidos" },
  { title: "Eletrônicos", keyword: "fone bluetooth", sort: "vendidos" },
  { title: "Achadinhos até R$ 30", keyword: "achadinhos", sort: "menor_preco" },
];

/** Quantos produtos cada seção mostra na página inicial (o resto fica em "Ver todos"). */
export const SECTION_PREVIEW_SIZE = 10;
