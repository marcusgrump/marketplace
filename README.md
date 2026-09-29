# Marketplace de Comissões

Vitrine de produtos com links de afiliado (Shopee, Mercado Livre, Amazon, AliExpress, Magalu), com painel
para cadastrar produtos. O visitante clica em **Ver oferta** e vai para a loja pelo **seu** link de comissão.

Não tem carrinho, checkout nem pagamento: a venda acontece na loja e a comissão cai na sua conta de afiliado.

## O que tem

**Site público (`/`)**
- Produtos com busca (sem diferenciar acentos), filtro por categoria e por loja, desconto e destaque.
- **Vitrine automática**: seções da Shopee (ex.: "Air fryer", "Skincare") montadas ao vivo, sem cadastrar produto.
  A home mostra 10 por seção e um botão **Ver todos** (`/ofertas`), com páginas de 50.
- A busca do site também mostra resultados ao vivo da Shopee.
- 50 produtos por página, no site e no painel.
- Link curto por produto: `seusite.com/go/<slug>`. Ele conta o clique e redireciona para o link de afiliado.
  Use esse link para divulgar no WhatsApp, Instagram e TikTok. Produtos da vitrine automática e da busca usam
  `/go/v`, que também conta o clique.

**Painel (`/admin`)**
- Login com e-mail e senha.
- Produtos: lista paginada (50 por página) com busca no servidor, comissão, cliques dos últimos 30 dias,
  liga/desliga "No ar" e "Destaque", copiar link curto, editar e excluir.
- Números de cliques (hoje, 7 e 30 dias) e **recomendações** do que fazer: produtos sem foto, comissão baixa,
  preço desatualizado, produtos sem cliques etc. Também traz dicas sobre as seções da vitrine automática e sobre o que
  as pessoas buscam no site.
- **Vitrine automática**: crie, edite e apague seções. Cada seção tem título, palavra-chave e
  ordenação (relevância, vendas, preço ou comissão).
- **Buscar na Shopee**: pesquisa produtos do programa de afiliados já com o seu link de comissão, ordenando
  por comissão ou vendas. Marca como **Recomendado** o que tem comissão de 8%+, 100+ vendas e nota 4,5+, e
  adiciona com 1 clique (ou todos os recomendados de uma vez).
- **Importar por link**: cole o link de um produto da Shopee e os dados são preenchidos.
- **Atualizar preços**: atualiza preço, comissão e vendas de todos os produtos da Shopee e oculta os que
  saíram do programa.
- Configurações: conectar a conta da Shopee e trocar a senha.

## Conectar a Shopee

A busca, a importação e a vitrine automática usam a **Open API de afiliados da Shopee**:

1. Entre em [affiliate.shopee.com.br](https://affiliate.shopee.com.br) com sua conta de afiliado.
2. Abra **Open API** e solicite o acesso. A Shopee pode levar alguns dias para liberar.
3. Copie o **AppID** e a **Senha** e cole em **Painel > Configurações**.

Sem a Open API o painel continua funcionando: você cadastra o produto à mão, colando o link de afiliado que
gera no app ou no site da Shopee. Sem ela, a vitrine automática e a busca ao vivo ficam escondidas.

## Vitrine automática

- As seções (título + palavra-chave + ordenação) ficam em **Painel > Vitrine automática**.
- Os produtos vêm **ao vivo** da Open API, já com o seu link de comissão, e ficam em cache por **1 hora**
  (cache por tag: alterar seções ou as credenciais no painel limpa o cache).
- Nada disso é gravado no banco. Só a definição da seção e o contador de cliques.
- Cliques nesses produtos passam por `/go/v` e são contados **por seção** (ou em "busca", quando vêm da busca
  do site).

## O que é guardado e o que não é

- **Produtos cadastrados (curados)**: só o necessário para exibir: título, URL da imagem (a imagem em si
  continua nos servidores da loja), preço, preço antigo, loja, categoria, link de afiliado, ids da Shopee,
  comissão, flags (no ar, destaque) e datas. Cerca de **1 KB por produto**.
- **Cliques**: **um contador por dia por produto/seção** (`click_daily`), não uma linha por clique. A tabela
  cresce no máximo uma linha por produto/seção por dia.
- **Produtos da vitrine automática**: nunca são guardados.

Plano gratuito do Supabase: 500 MB. Com ~1 KB por produto e contadores minúsculos, 500 MB comportam centenas de
milhares de produtos; o limite prático é o seu tempo de curadoria.

## Como funciona por dentro

- Next.js 16 (App Router) + Tailwind 4 + [shadcn/ui](https://ui.shadcn.com) no painel.
- Supabase: banco Postgres e login. Tabelas `products`, `click_daily`, `admins` e `settings` (mais as das
  seções da vitrine), todas com RLS: o público só lê produtos ativos; o resto só admin acessa. Cliques são
  gravados por função no banco, a única coisa que o público pode executar.
- A página inicial usa cache com tags e é regerada sempre que você salva algo no painel.

## Variáveis de ambiente

| Variável | Para que serve |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable do Supabase. |
| `SERVER_SECRET` | Tem de ser igual à linha `server_token` da tabela `settings`. Permite ao servidor do site ler as credenciais da Shopee sem usuário logado (vitrine automática e busca). **Mantenha em segredo**: só nas variáveis do servidor, nunca no código nem no navegador. |
| `SHOPEE_API_URL` | Opcional. Aponta para outra API, só para testes locais (ex.: o mock abaixo). Sem ela, usa a API real da Shopee. |

## Rodar localmente

```bash
cp .env.example .env.local   # preencha com a URL e a chave publishable do Supabase e o SERVER_SECRET
npm install
npm run dev                   # http://localhost:3000 e http://localhost:3000/admin
```

**Shopee de mentira (sem conta de afiliado)**: `scripts/mock-shopee.mjs` imita a Open API com ~150 ofertas
fictícias, sem dependências (Node 22+).

```bash
node scripts/mock-shopee.mjs   # http://localhost:4555/graphql (troque a porta com PORT=xxxx)
```

1. No `.env.local`: `SHOPEE_API_URL=http://localhost:4555/graphql` e reinicie o `npm run dev`.
2. Em **Painel > Configurações**: AppID `999` e Senha `segredo`.

Os links das ofertas do mock são fictícios e não levam a lugar nenhum. A assinatura é validada como na API
real; com a senha errada volta o erro "Invalid Signature".

## Publicar

Vercel, com as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SERVER_SECRET`
configuradas no projeto. Não configure `SHOPEE_API_URL` em produção.

Para dar acesso ao painel a outra pessoa: crie o usuário em Supabase > Authentication e adicione o id dele
na tabela `admins`.
