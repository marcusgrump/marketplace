import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAGS } from "@/lib/cache";

const VALID_TAGS = new Set<string>(Object.values(TAGS));

// Limpa o cache do site quando produtos, seções ou configurações mudam fora do painel
// (ex.: edição direta no Supabase). Quem chama é um gatilho no banco, com o SERVER_SECRET.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tags: string[] = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => VALID_TAGS.has(String(t))) : [];
  if (!tags.length) return NextResponse.json({ error: "no valid tags" }, { status: 400 });

  // expire: 0 = a próxima visita já busca os dados novos, sem mostrar a versão antiga.
  tags.forEach((tag) => revalidateTag(tag, { expire: 0 }));
  return NextResponse.json({ revalidated: tags });
}

function isAuthorized(given: string | null): boolean {
  const secret = process.env.SERVER_SECRET;
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
