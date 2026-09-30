import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";

/**
 * Paginação por links (?pagina=N), sem JavaScript no navegador.
 * Com `totalPages` mostra os números; sem ele (ex.: API da Shopee, que não informa o total)
 * mostra só Anterior / página atual / Próxima, usando `hasNext`.
 */
export function Pagination({
  page,
  totalPages,
  hasNext,
  hrefFor,
}: {
  page: number;
  totalPages?: number;
  hasNext?: boolean;
  hrefFor: (page: number) => string;
}) {
  const next = totalPages !== undefined ? page < totalPages : !!hasNext;
  if (page <= 1 && !next) return null;

  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-wrap items-center justify-center gap-1 text-sm">
      <PageLink href={page > 1 ? hrefFor(page - 1) : undefined} label="Página anterior">
        <ChevronLeftIcon className="size-4" /> Anterior
      </PageLink>
      {totalPages !== undefined ? (
        pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-2 text-muted-foreground">
              …
            </span>
          ) : (
            <PageLink key={p} href={p === page ? undefined : hrefFor(p)} current={p === page} label={`Página ${p}`}>
              {p}
            </PageLink>
          ),
        )
      ) : (
        <PageLink current label={`Página ${page}`}>
          {page}
        </PageLink>
      )}
      <PageLink href={next ? hrefFor(page + 1) : undefined} label="Próxima página">
        Próxima <ChevronRightIcon className="size-4" />
      </PageLink>
    </nav>
  );
}

/** 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, total: number): (number | null)[] {
  const pages = new Set([1, total, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

function PageLink({
  href,
  current,
  label,
  children,
}: {
  href?: string;
  current?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-3 transition-colors",
    current && "border-primary bg-primary text-primary-foreground",
    !current && href && "bg-card hover:border-primary",
    !current && !href && "pointer-events-none bg-card opacity-40",
  );
  if (!href || current) {
    return (
      <span className={className} aria-current={current ? "page" : undefined} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

/** Monta a URL mantendo os filtros atuais e trocando só os parâmetros informados. */
export function withParams(path: string, current: Record<string, string | undefined>, changes: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) {
    if (v !== undefined && v !== "" && !(k === "pagina" && Number(v) <= 1)) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
