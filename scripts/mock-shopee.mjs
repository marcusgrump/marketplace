#!/usr/bin/env node
/**
 * Mock da Open API de afiliados da Shopee (GraphQL), só para desenvolvimento e testes locais.
 * Sem dependências. Requer Node >= 22.
 *
 * Como usar:
 *   1. node scripts/mock-shopee.mjs            (porta 4555, ou PORT=xxxx node scripts/mock-shopee.mjs)
 *   2. No .env.local:  SHOPEE_API_URL=http://localhost:4555/graphql
 *   3. No painel (/admin): Configurações -> AppID 999 / Senha segredo
 *      (o site público também usa essas credenciais, via SERVER_SECRET, para a vitrine automática)
 *
 * Imita:
 *   - POST /graphql com corpo JSON { query }
 *   - Header  Authorization: SHA256 Credential={AppId}, Timestamp={ts}, Signature={sha256_hex(AppId + ts + corpo + Secret)}
 *   - Query   productOfferV2(keyword, sortType, page, limit, shopId, itemId)
 *     sortType: 1 relevância, 2 vendas, 3 maior preço, 4 menor preço, 5 maior comissão
 *   - Assinatura inválida: HTTP 200 com errors[0].extensions.code = 10020, como a Shopee.
 *
 * O catálogo é fixo (mesmos produtos a cada execução) e fictício: os links não levam a lugar nenhum.
 */
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const APP_ID = "999";
const SECRET = "segredo";
const PORT = Number(process.env.PORT) || 4555;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

// ---------------------------------------------------------------------------------------------
// Catálogo determinístico

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEMES = [
  {
    name: "cozinha",
    shops: ["Cozinha Prática Oficial", "Casa & Sabor", "Chef em Casa"],
    price: [25, 450],
    nouns: [
      "Air Fryer Digital 4L",
      "Air Fryer Forno 12L com Timer",
      "Air Fryer Family 5,5L Preta",
      "Panela de Pressão Elétrica 5L",
      "Jogo de Panelas Antiaderente 5 Peças",
      "Sanduicheira e Grill Elétrica",
      "Liquidificador 1000W 2L",
      "Cafeteira Elétrica 30 Xícaras",
      "Fritadeira sem Óleo Inox",
      "Espremedor de Frutas Elétrico",
      "Kit Facas de Cozinha Inox 6 Peças",
      "Potes Herméticos de Vidro 10 Unidades",
      "Batedeira Planetária 5L",
      "Mixer 3 em 1 com Copo Medidor",
      "Chaleira Elétrica 1,8L",
      "Forma de Silicone para Air Fryer",
    ],
    adjectives: ["Premium", "Compacto", "Turbo", "Multiuso", "Inox", "Bivolt", "110V", "220V"],
  },
  {
    name: "skincare",
    shops: ["Skin Lab Brasil", "Beleza Real", "Dermo Store"],
    price: [12, 180],
    nouns: [
      "Protetor Solar Facial FPS 60",
      "Sérum Vitamina C 30ml",
      "Ácido Hialurônico Sérum Facial",
      "Hidratante Facial com Niacinamida",
      "Sabonete Facial Gel de Limpeza",
      "Água Micelar 400ml",
      "Máscara Facial de Argila Verde",
      "Creme Anti-idade Noturno",
      "Esfoliante Corporal de Café",
      "Tônico Facial de Ácido Salicílico",
      "Protetor Labial com Cor FPS 30",
      "Kit Skincare 5 Passos",
      "Contorno dos Olhos com Cafeína",
      "Bruma Facial Hidratante",
    ],
    adjectives: ["Vegano", "Oil Free", "Dermatológico", "Hipoalergênico", "Coreano", "Original"],
  },
  {
    name: "fone",
    shops: ["Som & Tecnologia", "TechPlus Eletrônicos", "Audio Max Oficial"],
    price: [19, 320],
    nouns: [
      "Fone de Ouvido Bluetooth TWS",
      "Fone Bluetooth com Cancelamento de Ruído",
      "Fone Bluetooth Sem Fio Esportivo",
      "Headset Gamer com Microfone",
      "Caixa de Som Bluetooth Portátil",
      "Fone de Ouvido com Fio P2",
      "Fone Bluetooth Over Ear Dobrável",
      "Carregador Turbo 20W USB-C",
      "Cabo USB-C Reforçado 2m",
      "Power Bank 10000mAh",
      "Suporte de Celular para Mesa",
      "Smartwatch Fitness Tela AMOLED",
    ],
    adjectives: ["Pro", "Mini", "Plus", "Lite", "Original", "Novo"],
  },
  {
    name: "casa",
    shops: ["Lar Doce Lar", "Organiza Casa", "Casa Nova Decor"],
    price: [9, 280],
    nouns: [
      "Organizador de Geladeira Transparente",
      "Kit Cabides Aveludados 30 Unidades",
      "Lençol de Casal Microfibra 4 Peças",
      "Jogo de Toalhas de Banho 5 Peças",
      "Luminária LED de Mesa Recarregável",
      "Tapete Antiderrapante para Banheiro",
      "Cesto Organizador Dobrável",
      "Difusor de Aromas Elétrico",
      "Cortina Blackout 2,80 x 1,60m",
      "Mop Giratório com Balde",
      "Aspirador de Pó Portátil sem Fio",
      "Fita LED RGB 5 Metros com Controle",
      "Travesseiro Nasa Viscoelástico",
    ],
    adjectives: ["Luxo", "Slim", "Dobrável", "Reforçado", "Decorativo", "Clean"],
  },
  {
    name: "achadinhos",
    shops: ["Achadinhos da Ju", "Mania de Achados", "Tudo por 10"],
    price: [3, 60],
    nouns: [
      "Mini Ventilador Portátil Recarregável",
      "Garrafa Térmica 500ml",
      "Necessaire Organizadora de Viagem",
      "Kit 10 Esponjas Mágicas de Limpeza",
      "Escova Secadora Alisadora Elétrica",
      "Capa de Celular Transparente Anti-impacto",
      "Kit Elásticos de Cabelo 50 Unidades",
      "Mochila Antifurto com USB",
      "Relógio Digital LED Esportivo",
      "Lanterna Tática Recarregável",
      "Copo Térmico com Canudo 1 Litro",
      "Massageador Elétrico de Pescoço",
      "Ring Light 26cm com Tripé",
      "Kit Pincéis de Maquiagem 12 Peças",
    ],
    adjectives: ["Fofo", "Viral", "Útil", "Mais Vendido", "Barato", "Prático"],
  },
];

const PER_THEME = [32, 30, 28, 30, 30]; // total 150

function buildCatalog() {
  const rand = mulberry32(20260929);
  const items = [];
  let itemId = 10000000001;
  THEMES.forEach((theme, ti) => {
    for (let i = 0; i < PER_THEME[ti]; i++) {
      const noun = theme.nouns[i % theme.nouns.length];
      const cycle = Math.floor(i / theme.nouns.length);
      // A partir da segunda volta, acrescenta um adjetivo para os nomes não se repetirem.
      const adjective = cycle === 0 ? "" : ` ${theme.adjectives[(i + cycle) % theme.adjectives.length]}`;
      const productName = `${noun}${adjective}`;

      const shopIndex = Math.floor(rand() * theme.shops.length);
      const shopId = 500000000 + ti * 1000 + shopIndex * 37 + 11;
      const [lo, hi] = theme.price;
      // Preços tendem para a faixa baixa e terminam em ,90 ou ,99 como no varejo.
      const raw = lo + (hi - lo) * rand() ** 1.7;
      const priceMin = (Math.max(lo, Math.floor(raw)) + (rand() < 0.6 ? 0.9 : 0.99)).toFixed(2);
      const priceDiscountRate = rand() < 0.15 ? 0 : Math.floor(rand() * 61);
      const rate = Math.round((0.02 + rand() * 0.18) * 100) / 100; // 0.02 .. 0.20
      const commission = (Number(priceMin) * rate).toFixed(2);
      const sales = Math.floor(5 + rand() ** 3 * 60000);
      const ratingStar = (3.9 + rand() * 1.1).toFixed(1);

      items.push({
        itemId,
        shopId,
        productName,
        imageUrl: `https://picsum.photos/seed/${itemId}/400`,
        priceMin,
        priceDiscountRate,
        commissionRate: rate.toFixed(2),
        commission,
        sales,
        ratingStar: Number(ratingStar) > 5 ? "5.0" : ratingStar,
        shopName: theme.shops[shopIndex],
        shopType: [],
        productLink: `https://shopee.com.br/product/${shopId}/${itemId}`,
        offerLink: `https://s.shopee.com.br/mock${itemId}`,
      });
      itemId += 1 + Math.floor(rand() * 9973);
    }
  });
  return items;
}

const CATALOG = buildCatalog();

// ---------------------------------------------------------------------------------------------
// Consulta

function normalize(s) {
  return String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

// Texto entre os parênteses de productOfferV2(...), ignorando ")" dentro de strings.
function callArgs(query) {
  const open = query.match(/productOfferV2\s*\(/);
  if (!open) return "";
  const start = open.index + open[0].length;
  let inString = false;
  for (let i = start; i < query.length; i++) {
    const c = query[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === ")") return query.slice(start, i);
  }
  return query.slice(start);
}

function parseArgs(query) {
  const src = callArgs(query);
  const withoutStrings = src.replace(/"(?:[^"\\]|\\.)*"/g, '""'); // números não podem vir de dentro do keyword
  const num = (name) => {
    const m = withoutStrings.match(new RegExp(`\\b${name}\\s*:\\s*"?(\\d+)"?`));
    return m ? Number(m[1]) : undefined;
  };
  let keyword = "";
  const k = src.match(/\bkeyword\s*:\s*("(?:[^"\\]|\\.)*")/);
  if (k) {
    try {
      keyword = String(JSON.parse(k[1]));
    } catch {
      keyword = "";
    }
  }
  return {
    keyword,
    sortType: num("sortType") ?? 1,
    page: num("page"),
    limit: num("limit"),
    shopId: num("shopId"),
    itemId: num("itemId"),
  };
}

function runQuery(args) {
  const page = Math.max(1, args.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? DEFAULT_LIMIT));

  let list = CATALOG;
  if (args.itemId !== undefined) list = list.filter((o) => o.itemId === args.itemId);
  if (args.shopId !== undefined) list = list.filter((o) => o.shopId === args.shopId);
  const kw = normalize(args.keyword.trim());
  if (kw) list = list.filter((o) => normalize(o.productName).includes(kw));

  const num = (v) => Number(v);
  switch (args.sortType) {
    case 2:
      list = [...list].sort((a, b) => b.sales - a.sales);
      break;
    case 3:
      list = [...list].sort((a, b) => num(b.priceMin) - num(a.priceMin));
      break;
    case 4:
      list = [...list].sort((a, b) => num(a.priceMin) - num(b.priceMin));
      break;
    case 5:
      list = [...list].sort((a, b) => num(b.commissionRate) - num(a.commissionRate));
      break;
    default: // 1: relevância = ordem do catálogo
  }

  const start = (page - 1) * limit;
  return {
    total: list.length,
    page,
    limit,
    body: {
      data: {
        productOfferV2: {
          nodes: list.slice(start, start + limit),
          pageInfo: { page, limit, hasNextPage: start + limit < list.length },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Assinatura

function validSignature(header, rawBody) {
  const m = /^SHA256\s+Credential=([^,\s]+)\s*,\s*Timestamp=([^,\s]+)\s*,\s*Signature=([0-9a-fA-F]+)\s*$/.exec(header ?? "");
  if (!m) return false;
  const [, appId, timestamp, signature] = m;
  if (appId !== APP_ID) return false;
  const expected = createHash("sha256").update(`${appId}${timestamp}${rawBody}${SECRET}`).digest("hex");
  return expected === signature.toLowerCase();
}

const INVALID_SIGNATURE = {
  errors: [{ message: "Invalid Signature", extensions: { code: 10020, message: "Invalid Signature" } }],
};

// ---------------------------------------------------------------------------------------------
// Servidor

function send(res, status, json) {
  const payload = JSON.stringify(json);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function log(...parts) {
  console.log(`[mock-shopee] ${new Date().toISOString()} ${parts.join(" ")}`);
}

const server = createServer((req, res) => {
  const path = (req.url ?? "").split("?")[0];
  if (req.method !== "POST" || path !== "/graphql") {
    log(req.method, path, "-> 404");
    return send(res, 404, { error: "Use POST /graphql" });
  }

  const chunks = [];
  let size = 0;
  req.on("data", (c) => {
    size += c.length;
    if (size > 1_000_000) req.destroy();
    else chunks.push(c);
  });
  req.on("error", () => {});
  req.on("end", () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");

    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      log("bad JSON -> 400");
      return send(res, 400, { errors: [{ message: "Bad Request: invalid JSON" }] });
    }
    if (!parsed || typeof parsed.query !== "string") {
      log("missing query -> 400");
      return send(res, 400, { errors: [{ message: "Bad Request: missing query" }] });
    }

    if (!validSignature(req.headers.authorization, rawBody)) {
      log("invalid signature -> 10020");
      return send(res, 200, INVALID_SIGNATURE);
    }

    const args = parseArgs(parsed.query);
    const { total, page, limit, body } = runQuery(args);
    const summary = [
      `keyword=${JSON.stringify(args.keyword)}`,
      `sort=${args.sortType}`,
      `page=${page}`,
      `limit=${limit}`,
      args.shopId !== undefined ? `shopId=${args.shopId}` : "",
      args.itemId !== undefined ? `itemId=${args.itemId}` : "",
      `-> ${body.data.productOfferV2.nodes.length}/${total}`,
    ].filter(Boolean);
    log(summary.join(" "));
    send(res, 200, body);
  });
});

server.listen(PORT, () => {
  console.log(`[mock-shopee] ${CATALOG.length} ofertas fictícias em http://localhost:${PORT}/graphql`);
  console.log(`[mock-shopee] AppID ${APP_ID} / Senha ${SECRET}`);
  console.log(`[mock-shopee] Use SHOPEE_API_URL=http://localhost:${PORT}/graphql`);
});

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
