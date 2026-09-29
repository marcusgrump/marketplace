# Marketplace de Comissões

Vitrine de produtos com links de afiliado (Shopee, Mercado Livre, Amazon, AliExpress, Magalu), com painel
para cadastrar produtos. O visitante clica em **Ver oferta** e vai para a loja pelo **seu** link de comissão.

Não tem carrinho, checkout nem pagamento: a venda acontece na loja e a comissão cai na sua conta de afiliado.

## O que tem

**Site público (`/`)**
- Produtos com busca, filtro por categoria e por loja, desconto e destaque.
- Link curto por produto: `seusite.com/go/<slug>`. Ele conta o clique e redireciona para o link de afiliado.
  Use esse link para divulgar no WhatsApp, Instagram e TikTok.

**Painel (`/admin`)**
- Login com e-mail e senha.
- Produtos: lista com comissão, cliques dos últimos 30 dias, liga/desliga "No ar" e "Destaque", copiar link
  curto, editar e excluir.
- Números de cliques (24h, 7 e 30 dias) e **recomendações** do que fazer: produtos sem foto, comissão baixa,
  preço desatualizado, produtos sem cliques etc.
- **Buscar na Shopee**: pesquisa produtos do programa de afiliados já com o seu link de comissão, ordenando
  por comissão ou vendas. Marca como **Recomendado** o que tem comissão de 8%+, 100+ vendas e nota 4,5+, e
  adiciona com 1 clique (ou todos os recomendados de uma vez).
- **Importar por link**: cole o link de um produto da Shopee e os dados são preenchidos.
- **Atualizar preços**: atualiza preço, comissão e vendas de todos os produtos da Shopee e oculta os que
  saíram do programa.
- Configurações: conectar a conta da Shopee e trocar a senha.

## Conectar a Shopee

A busca e a importação automática usam a **Open API de afiliados da Shopee**:

1. Entre em [affiliate.shopee.com.br](https://affiliate.shopee.com.br) com sua conta de afiliado.
2. Abra **Open API** e solicite o acesso. A Shopee pode levar alguns dias para liberar.
3. Copie o **AppID** e a **Senha** e cole em **Painel > Configurações**.

Sem a Open API o painel continua funcionando: você cadastra o produto à mão, colando o link de afiliado que
gera no app ou no site da Shopee.

## Como funciona por dentro

- Next.js 16 (App Router) + Tailwind 4 + [shadcn/ui](https://ui.shadcn.com) no painel.
- Supabase: banco Postgres e login. Tabelas `products`, `clicks`, `admins` e `settings`, todas com RLS:
  o público só lê produtos ativos; o resto só admin acessa. Cliques são gravados pela função
  `register_click`, a única coisa que o público pode executar.
- A página inicial é estática (rápida e barata) e é regerada sempre que você salva algo no painel.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha com a URL e a chave publishable do Supabase
npm install
npm run dev                   # http://localhost:3000 e http://localhost:3000/admin
```

## Publicar

Vercel, com as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configuradas
no projeto.

Para dar acesso ao painel a outra pessoa: crie o usuário em Supabase > Authentication e adicione o id dele
na tabela `admins`.
