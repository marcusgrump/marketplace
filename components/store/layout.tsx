import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { cn } from "cn";
import { site } from "@/lib/site";

/** Topo laranja com o nome do site e a busca (formulário GET, sem JavaScript). */
export function SiteHeader({
  q,
  hidden = {},
  isHome = false,
}: {
  q?: string;
  /** Filtros mantidos na nova busca (ex.: categoria). */
  hidden?: Record<string, string | undefined>;
  /** Na página inicial o nome do site é o título principal (h1); nas outras, a página tem o seu. */
  isHome?: boolean;
}) {
  const Name = isHome ? "h1" : "p";
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/" className="inline-block">
          <Name className="text-2xl font-bold sm:text-3xl">{site.name}</Name>
        </Link>
        <p className="mt-1 text-sm text-white/90 sm:text-base">{site.tagline}</p>

        <form action="/" method="get" role="search" className="mt-4 flex gap-2">
          <label htmlFor="busca" className="sr-only">
            Buscar produto
          </label>
          <input
            id="busca"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar produto..."
            maxLength={100}
            className="h-11 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
          />
          {Object.entries(hidden).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null,
          )}
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-brand-dark px-4 font-semibold hover:bg-black/20"
          >
            <SearchIcon className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Buscar</span>
          </button>
        </form>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        <p>{site.disclosure}</p>
        <p className="mt-2">Preços e disponibilidade podem mudar na loja.</p>
      </div>
    </footer>
  );
}

/** Filtro em forma de link (categoria, loja). */
export function Chip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:border-primary",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{count}</span>
      )}
    </Link>
  );
}

export function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {children}
    </nav>
  );
}
