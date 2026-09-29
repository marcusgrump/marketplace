# Marketplace de Comissões

Vitrine de produtos com links de afiliado (Shopee, Mercado Livre, Amazon, AliExpress, Magalu).
O visitante vê os produtos, clica em **Ver oferta** e é levado para a loja pelo **seu** link de comissão.

Não tem carrinho, checkout, pagamento, cadastro de vendedor nem banco de dados: a venda acontece na loja,
e a comissão cai na sua conta de afiliado.

## Como funciona

- `data/produtos.ts` é a sua lista de produtos. É o único arquivo que você precisa editar no dia a dia.
- A página inicial mostra os produtos com busca, filtro por categoria e filtro por loja.
- Cada produto ganha um link curto: `seusite.com/go/<id>`. Ele redireciona para o seu link de afiliado.
  Use esse link para divulgar no WhatsApp, Instagram e TikTok. Se o link de afiliado mudar, você troca em
  um lugar só.
- Cada clique aparece nos logs da Vercel (`[clique] <id> -> <loja>`), então dá para ver o que está vendendo.
- O rodapé avisa que os links são de afiliado. O CONAR recomenda deixar isso claro para o visitante.

## Adicionar um produto da Shopee

1. Entre no [Programa de Afiliados da Shopee](https://affiliate.shopee.com.br) e gere o link do produto
   (algo como `https://s.shopee.com.br/xxxxx`).
2. Na página do produto, clique com o botão direito na foto e escolha **Copiar endereço da imagem**.
3. Em `data/produtos.ts`, adicione um bloco:

```ts
{
  id: "air-fryer-4l",
  titulo: "Air Fryer 4L Antiaderente",
  imagem: "https://down-br.img.susercontent.com/file/....jpg",
  preco: 199.9,
  precoAntigo: 349.9, // opcional: mostra o desconto
  loja: "shopee",
  categoria: "Cozinha",
  link: "https://s.shopee.com.br/xxxxx",
  destaque: true, // opcional: aparece primeiro
},
```

4. Faça o commit. A Vercel publica sozinha.

O nome do site, o slogan e o texto do aviso ficam em `lib/site.ts`.

## Rodar localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

## Publicar

Importe o repositório na [Vercel](https://vercel.com/new). Não precisa configurar nada.
