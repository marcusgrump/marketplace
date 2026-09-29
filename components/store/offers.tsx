import "server-only";
import Link from "next/link";
import { cache } from "react";
import { SECTION_PREVIEW_SIZE, type Section } from "@/lib/sections";
import { getPublicOffers, type SortKey } from "@/lib/shopee";
import { OfferGrid } from "./grids";

/** Mesma consulta pedida duas vezes na mesma página (ex.: seção + aviso de vitrine vazia) vai uma vez só à Shopee. */
export const loadOffers = cache((keyword: string, sort: SortKey, page: number, limit: number) =>
  getPublicOffers({ keyword, sort, page, limit }),
);

export const loadSectionPreview = (section: Section) =>
  loadOffers(section.keyword, section.sort, 1, SECTION_PREVIEW_SIZE);

/** Bloco de uma seção da vitrine automática na página inicial. Sem ofertas, não mostra nada. */
export async function SectionOffers({ section }: { section: Section }) {
  const result = await loadSectionPreview(section);
  if (!result?.offers.length) return null;

  return (
    <section aria-labelledby={`secao-${section.id}`} className="mt-10">
      <BlockHeader id={`secao-${section.id}`} title={section.title} href={`/ofertas?secao=${section.id}`} linkLabel="Ver todos →" />
      <OfferGrid offers={result.offers} refTag={`s:${section.id}`} />
    </section>
  );
}

/** Resultados da Shopee abaixo da busca nos produtos cadastrados. */
export async function SearchOffers({ q, whenEmpty }: { q: string; whenEmpty?: React.ReactNode }) {
  const result = await loadOffers(q, "relevancia", 1, 20);
  if (!result?.offers.length) return whenEmpty ?? null;

  return (
    <section aria-labelledby="busca-shopee" className="mt-10">
      <BlockHeader
        id="busca-shopee"
        title={`Mais ofertas da Shopee para “${q}”`}
        href={`/ofertas?q=${encodeURIComponent(q)}`}
        linkLabel="Ver todas →"
      />
      <OfferGrid offers={result.offers} refTag="busca" />
    </section>
  );
}

/**
 * Aviso de vitrine vazia: só aparece se nenhuma seção trouxer ofertas.
 * As consultas são as mesmas das seções (cache do React), então não custa chamadas extras.
 */
export async function EmptyShowcase({ sections }: { sections: Section[] }) {
  const results = await Promise.all(sections.map(loadSectionPreview));
  if (results.some((r) => r?.offers.length)) return null;
  return <ComingSoon />;
}

export function ComingSoon() {
  return <p className="py-24 text-center text-muted-foreground">Novas ofertas chegando em breve.</p>;
}

function BlockHeader({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-lg font-bold sm:text-xl">
        {title}
      </h2>
      <Link href={href} className="shrink-0 text-sm font-semibold text-primary hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}
