import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Pagination, withParams } from "@/components/Pagination";
import { CuratedGrid, OffersSkeleton } from "@/components/store/grids";
import { Chip, ChipRow, SiteFooter, SiteHeader } from "@/components/store/layout";
import { ComingSoon, EmptyShowcase, SearchOffers, SectionOffers } from "@/components/store/offers";
import { firstParam, parsePage } from "@/components/store/params";
import { getActiveSections, getCategories, getProductsPage } from "@/lib/catalog";
import { PAGE_SIZE } from "@/lib/products";
import { stores, type StoreId } from "@/lib/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim().slice(0, 100) || undefined;
  const category = firstParam(sp.categoria)?.trim() || undefined;
  const lojaParam = firstParam(sp.loja);
  const store = lojaParam && lojaParam in stores ? (lojaParam as StoreId) : undefined;
  const page = parsePage(sp.pagina);

  // Filtros atuais, no formato da URL, para montar os links.
  const current = { q, categoria: category, loja: store, pagina: String(page) };
  const filtering = !!(q || category || store);
  // Seções automáticas só na página inicial "limpa" (sem busca, filtro ou paginação).
  const showSections = !filtering && page === 1;

  const [{ products, total }, categories, sections] = await Promise.all([
    getProductsPage({ q, category, store, page }),
    getCategories(),
    showSections ? getActiveSections() : [],
  ]);

  // Página além da última: a consulta volta vazia, então descobre o total pela primeira página.
  if (!products.length && page > 1) {
    const { total: realTotal } = await getProductsPage({ q, category, store, page: 1 });
    // Sem nenhum resultado: volta para a página 1, que mostra "Nenhum produto encontrado".
    redirect(withParams("/", current, { pagina: realTotal ? Math.ceil(realTotal / PAGE_SIZE) : undefined }));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Lojas: só vale filtrar quando há mais de uma nos resultados (ou quando o filtro já está ativo).
  const usedStores = [...new Set<StoreId>([...(store ? [store] : []), ...products.map((p) => p.store)])];
  const showStores = usedStores.length > 1 || !!store;

  return (
    <>
      <SiteHeader q={q} hidden={{ categoria: category, loja: store }} isHome />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {categories.length > 1 && (
          <ChipRow label="Categorias">
            <Chip href={withParams("/", current, { categoria: undefined, pagina: undefined })} active={!category}>
              Todos
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.category}
                href={withParams("/", current, { categoria: c.category, pagina: undefined })}
                active={category === c.category}
                count={c.total}
              >
                {c.category}
              </Chip>
            ))}
          </ChipRow>
        )}

        {showStores && (
          <div className="mt-2">
            <ChipRow label="Lojas">
              <Chip href={withParams("/", current, { loja: undefined, pagina: undefined })} active={!store}>
                Todas as lojas
              </Chip>
              {usedStores.map((s) => (
                <Chip key={s} href={withParams("/", current, { loja: s, pagina: undefined })} active={store === s}>
                  {stores[s].label}
                </Chip>
              ))}
            </ChipRow>
          </div>
        )}

        {filtering && (
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
            <p aria-live="polite">
              {total === 1 ? "1 produto" : `${total.toLocaleString("pt-BR")} produtos`}
              {q && <> para “{q}”</>}
            </p>
            <Link href="/" className="font-semibold text-primary hover:underline">
              Limpar filtros
            </Link>
          </div>
        )}

        {products.length > 0 && (
          <section aria-labelledby="selecionados" className="mt-6">
            <h2 id="selecionados" className="sr-only">
              Produtos selecionados
            </h2>
            <CuratedGrid products={products} />
            <Pagination page={page} totalPages={totalPages} hrefFor={(p) => withParams("/", current, { pagina: p })} />
          </section>
        )}

        {q && page === 1 ? (
          <>
            {!products.length && <p className="mt-6 text-muted-foreground">Nenhum produto selecionado para essa busca.</p>}
            <Suspense fallback={<OffersSkeleton label="Buscando ofertas na Shopee" />}>
              <SearchOffers
                q={q}
                whenEmpty={
                  !products.length && (
                    <p className="mt-2 text-muted-foreground">
                      Nada encontrado para “{q}”. Tente outras palavras ou{" "}
                      <Link href="/" className="font-semibold text-primary hover:underline">
                        veja todas as ofertas
                      </Link>
                      .
                    </p>
                  )
                }
              />
            </Suspense>
          </>
        ) : (
          filtering &&
          !products.length && <p className="py-16 text-center text-muted-foreground">Nenhum produto encontrado.</p>
        )}

        {sections.map((s) => (
          <Suspense key={s.id} fallback={<OffersSkeleton label={`Carregando ${s.title}`} />}>
            <SectionOffers section={s} />
          </Suspense>
        ))}

        {showSections &&
          !products.length &&
          (sections.length ? (
            <Suspense fallback={null}>
              <EmptyShowcase sections={sections} />
            </Suspense>
          ) : (
            <ComingSoon />
          ))}
      </main>

      <SiteFooter />
    </>
  );
}
