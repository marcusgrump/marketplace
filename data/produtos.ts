import type { Product } from "@/lib/products";

/**
 * Seus produtos. Para adicionar um novo, copie um bloco e troque os campos:
 *
 * - id:        identificador único, sem espaços (vira o link curto /go/<id>)
 * - titulo:    nome do produto
 * - imagem:    URL da foto (clique com o botão direito na foto da Shopee > "Copiar endereço da imagem")
 * - preco:     preço atual em reais (use ponto: 49.9)
 * - precoAntigo (opcional): preço "de", para mostrar o desconto
 * - loja:      shopee | mercadolivre | amazon | aliexpress | magalu
 * - categoria: texto livre; as categorias do filtro são criadas automaticamente
 * - link:      SEU link de afiliado (ex.: https://s.shopee.com.br/xxxxx)
 * - destaque (opcional): true para aparecer primeiro
 *
 * Os exemplos abaixo são fictícios: substitua por produtos e links reais.
 */
export const produtos: Product[] = [
  {
    id: "fone-bluetooth-tws",
    titulo: "Fone de Ouvido Bluetooth TWS com Case Carregador",
    imagem: "",
    preco: 39.9,
    precoAntigo: 89.9,
    loja: "shopee",
    categoria: "Eletrônicos",
    link: "https://s.shopee.com.br/SEU_LINK_AQUI",
    destaque: true,
  },
  {
    id: "garrafa-termica-1l",
    titulo: "Garrafa Térmica Inox 1L Mantém Gelado 24h",
    imagem: "",
    preco: 54.9,
    precoAntigo: 79.9,
    loja: "shopee",
    categoria: "Casa",
    link: "https://s.shopee.com.br/SEU_LINK_AQUI",
  },
  {
    id: "organizador-maquiagem",
    titulo: "Organizador de Maquiagem Acrílico Giratório 360°",
    imagem: "",
    preco: 32.5,
    loja: "shopee",
    categoria: "Beleza",
    link: "https://s.shopee.com.br/SEU_LINK_AQUI",
  },
  {
    id: "luminaria-led-mesa",
    titulo: "Luminária LED de Mesa com 3 Tons de Luz e USB",
    imagem: "",
    preco: 45.0,
    precoAntigo: 69.9,
    loja: "mercadolivre",
    categoria: "Casa",
    link: "https://mercadolivre.com/sec/SEU_LINK_AQUI",
  },
  {
    id: "smartwatch-d20",
    titulo: "Smartwatch Esportivo com Monitor Cardíaco",
    imagem: "",
    preco: 59.9,
    precoAntigo: 129.9,
    loja: "shopee",
    categoria: "Eletrônicos",
    link: "https://s.shopee.com.br/SEU_LINK_AQUI",
    destaque: true,
  },
  {
    id: "kindle-basico",
    titulo: "Leitor de E-books com Tela Antirreflexo",
    imagem: "",
    preco: 499.0,
    loja: "amazon",
    categoria: "Eletrônicos",
    link: "https://amzn.to/SEU_LINK_AQUI",
  },
];
