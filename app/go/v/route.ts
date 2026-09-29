import { after, NextResponse, type NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/server";

// Saída das ofertas da vitrine automática (/go/v?u=<link de afiliado>&r=<origem>).
// Nada é guardado por produto: só soma o clique no contador diário da seção (ou da busca).

const REF_PATTERN = /^(s:[0-9a-f-]{36}|busca)$/;

/** Só redireciona para a Shopee, senão o link viraria um redirecionador aberto para qualquer site. */
function shopeeUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    const allowed = host === "shopee.com.br" || host.endsWith(".shopee.com.br") || host === "shp.ee";
    return url.protocol === "https:" && allowed ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const target = shopeeUrl(request.nextUrl.searchParams.get("u"));
  if (!target) return NextResponse.redirect(new URL("/", request.url));

  const ref = request.nextUrl.searchParams.get("r");
  if (ref && REF_PATTERN.test(ref)) {
    // Conta o clique depois de responder: o visitante não espera pelo banco, e uma falha não impede a ida à loja.
    after(async () => {
      try {
        await createAnonClient().rpc("register_ref_click", { p_ref: ref });
      } catch {
        // Contador é só estatística.
      }
    });
  }

  const response = NextResponse.redirect(target, 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
