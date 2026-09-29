import { NextResponse } from "next/server";
import { getProduct } from "@/lib/products";

// Link curto /go/<id> que redireciona para o link de afiliado.
// Serve para compartilhar no WhatsApp/Instagram e para trocar o link em um só lugar.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Aparece nos logs da Vercel: permite ver quais produtos recebem mais cliques.
  console.log(`[clique] ${product.id} -> ${product.loja}`);

  const response = NextResponse.redirect(product.link, 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
