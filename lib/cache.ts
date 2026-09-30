/**
 * Tags do cache do Next. O painel chama updateTag(...) depois de salvar,
 * e o site mostra a mudança na próxima visita.
 */
export const TAGS = {
  products: "products", // produtos cadastrados e categorias
  sections: "sections", // seções da vitrine automática
  shopee: "shopee", // respostas da API da Shopee (vitrine automática e busca)
} as const;

/** Por quanto tempo (segundos) a resposta da Shopee fica em cache antes de consultar de novo. */
export const SHOPEE_CACHE_SECONDS = 60 * 60;
