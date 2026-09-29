import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/server";

// Link curto /go/<slug>: registra o clique e redireciona para o link de afiliado.
// Serve para compartilhar no WhatsApp/Instagram e para trocar o link em um só lugar.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: url } = await createAnonClient().rpc("register_click", { p_slug: slug });

  if (typeof url !== "string") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(url, 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
