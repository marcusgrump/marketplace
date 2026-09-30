export const site = {
  name: "Achadinhos",
  tagline: "Os melhores achados da Shopee e outras lojas, selecionados a dedo.",
  // Aviso exigido para links de afiliado (transparência com o visitante).
  disclosure:
    "Este site contém links de afiliado. Ao comprar por eles você paga o mesmo preço e eu recebo uma pequena comissão.",
  instagram: "",
  whatsapp: "",
};

export const stores = {
  shopee: { label: "Shopee", color: "#EE4D2D", text: "#fff" },
  mercadolivre: { label: "Mercado Livre", color: "#FFE600", text: "#2D3277" },
  amazon: { label: "Amazon", color: "#232F3E", text: "#FF9900" },
  aliexpress: { label: "AliExpress", color: "#E62E04", text: "#fff" },
  magalu: { label: "Magalu", color: "#0086FF", text: "#fff" },
} as const;

export type StoreId = keyof typeof stores;
