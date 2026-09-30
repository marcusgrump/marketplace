import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pagination, withParams } from "@/components/Pagination";
import { OfferGrid, type OfferRef } from "@/components/store/grids";
import { SiteFooter, SiteHeader } from "@/components/store/layout";
import { loadOffers } from "@/components/store/offers";
import { firstParam, parsePage } from "@/components/store/params";
import { getActiveSections } from "@/lib/catalog";
import { PAGE_SIZE } from "@/lib/products";
import type { SortKey } from "@/lib/shopee-shared";
import { site } from "@/lib/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Limite de páginas: evita que links inventados gerem consultas sem fim na API da Shopee.
const MAX_PAGE = 100;

type Listing = { title: string; keyword: string; sort: SortKey; ref: OfferRef; params: Record<string, string> };

/** Descobre o que listar a partir da URL: uma seção da vitrine automática (?secao=) ou uma busca (?q=). */
async function resolveListing(sp: Awaited<SearchParams>): Promise<Listing | null> {
  const sectionId = firstParam(sp.secao);
  if (sectionId) {
    const section = (await getActiveSections()).find((s) => s.id === sectionId);
    if (!section) notFound();
    return {
      title: section.title,
      keyword: section.keyword,
      sort: section.sort,
      ref: `s:${section.id}`,
      params: { secao: section.id },
    };
  }
  const q = firstParam(sp.q)?.trim().slice(0, 100);
  if (q) return { title: `Ofertas para “${q}”`, keyword: q, sort: "relevancia", ref: "busca", params: { q } };
  return null;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const listing = await resolveListing(sp);
  if (!listing) return {};
  const page = parsePage(sp.pagina);
  return {
    title: `${listing.title}${page > 1 ? ` (página ${page})` : ""} | ${site.name}`,
    description: site.tagline,
    // Páginas de busca não precisam aparecer no Google.
    robots: listing.ref === "busca" ? { index: false, follow: true } : undefined,
  };
}

export default async function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const listing = await resolveListing(sp);
  if (!listing) redirect("/");

  const page = parsePage(sp.pagina);
  if (page > MAX_PAGE) notFound();

  const result = await loadOffers(listing.keyword, listing.sort, page, PAGE_SIZE);
  const isSearch = listing.ref === "busca";

  return (
    <>
      <SiteHeader q={isSearch ? listing.keyword : undefined} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-3 text-xl font-bold sm:text-2xl">{listing.title}</h1>

        {!result ? (
          <div className="py-24 text-center text-muted-foreground">
            <p>Ofertas indisponíveis no momento. Tente de novo mais tarde.</p>
            <Link href="/" className="mt-3 inline-block font-semibold text-primary hover:underline">
              Ir para a página inicial
            </Link>
          </div>
        ) : !result.offers.length ? (
          <p className="py-24 text-center text-muted-foreground">
            {page > 1 ? "Não há mais ofertas por aqui." : "Nenhuma oferta encontrada."}
          </p>
        ) : (
          <div className="mt-6">
            <OfferGrid offers={result.offers} refTag={listing.ref} />
          </div>
        )}

        {result && (
          <Pagination
            page={page}
            hasNext={result.hasNextPage && result.offers.length > 0 && page < MAX_PAGE}
            hrefFor={(p) => withParams("/ofertas", listing.params, { pagina: p })}
          />
        )}
      </main>

      <SiteFooter />
    </>
  );
}
