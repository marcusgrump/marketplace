import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { PlusIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { ProductTable } from "@/components/admin/ProductTable";
import { RefreshPricesButton } from "@/components/admin/RefreshPricesButton";
import { SavedToast } from "@/components/admin/SavedToast";
import { Pagination, withParams } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildTips,
  escapeLike,
  getCatalogSummary,
  getClickStats,
  getClickTotals,
  getSections,
  isShopeeConnected,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { PAGE_SIZE, type ProductRow } from "@/lib/products";

const STATUS = { todos: "Todos", ativos: "No ar", inativos: "Fora do ar" } as const;
type Status = keyof typeof STATUS;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminHome({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const param = (key: string) => {
    const v = sp[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const q = param("q").trim().slice(0, 100);
  const status: Status = Object.hasOwn(STATUS, param("status")) ? (param("status") as Status) : "todos";
  const page = Math.max(1, Math.floor(Number(param("pagina"))) || 1);
  const current = { q: q || undefined, status: status === "todos" ? undefined : status };
  const href = (changes: Record<string, string | number | undefined>) => withParams("/admin", current, changes);

  const filtered = (head: boolean) => {
    let query = supabase.from("products").select("*", { count: "exact", head });
    if (q) query = query.ilike("title", `%${escapeLike(q)}%`);
    if (status !== "todos") query = query.eq("active", status === "ativos");
    return query;
  };
  const from = (page - 1) * PAGE_SIZE;

  const [list, summary, totals, shopeeConnected, sections] = await Promise.all([
    filtered(false)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1),
    getCatalogSummary(supabase),
    getClickTotals(supabase),
    isShopeeConnected(supabase),
    getSections(supabase),
  ]);

  // Página além da última (ex.: depois de excluir produtos): o banco responde erro de intervalo.
  let found = list.count ?? 0;
  if (list.error || (page > 1 && !list.data?.length)) {
    if (list.error && list.error.code !== "PGRST103") throw new Error(`Falha ao carregar produtos: ${list.error.message}`);
    found = (await filtered(true)).count ?? 0;
  }
  const totalPages = Math.max(1, Math.ceil(found / PAGE_SIZE));
  if (page > totalPages) redirect(href({ pagina: totalPages }));

  const products = (list.data ?? []) as ProductRow[];
  // Só as origens necessárias: produtos desta página, todas as seções e a busca.
  const clicks = await getClickStats(supabase, 30, [
    ...products.map((p) => `p:${p.id}`),
    ...sections.map((s) => `s:${s.id}`),
    "busca",
  ]);
  const pageClicks = Object.fromEntries(products.map((p) => [p.id, clicks[`p:${p.id}`] ?? 0]));
  const tips = buildTips({ summary, sections, clicks, shopeeConnected });
  const counts: Record<Status, number> = {
    todos: summary.total,
    ativos: summary.active,
    inativos: summary.total - summary.active,
  };

  return (
    <div className="grid gap-6">
      <SavedToast />

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Produtos</h1>
        {shopeeConnected && summary.shopee > 0 && <RefreshPricesButton />}
        <Button variant="outline" asChild>
          <Link href="/admin/shopee">
            <SearchIcon /> Buscar na Shopee
          </Link>
        </Button>
        <Button asChild>
          <Link href="/admin/produtos/novo">
            <PlusIcon /> Novo produto
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Produtos no ar" value={summary.active} />
        <Stat label="Cliques hoje" value={totals.today} />
        <Stat label="Cliques em 7 dias" value={totals.week} />
        <Stat label="Cliques em 30 dias" value={totals.month} />
      </div>

      {tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recomendações</CardTitle>
            <CardDescription>O que fazer para vender mais.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    {t.text}
                    {t.href && (
                      <>
                        {" "}
                        <Link href={t.href} className="font-medium text-primary hover:underline">
                          {t.cta}
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {summary.total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <nav className="mr-auto flex flex-wrap gap-1 text-sm" aria-label="Filtrar por status">
            {(Object.keys(STATUS) as Status[]).map((s) => (
              <Link
                key={s}
                href={withParams("/admin", { q: current.q }, { status: s === "todos" ? undefined : s })}
                aria-current={s === status ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 transition-colors",
                  s === status ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                )}
              >
                {STATUS[s]}
                {!q && <span className="ml-1 tabular-nums opacity-70">{counts[s].toLocaleString("pt-BR")}</span>}
              </Link>
            ))}
          </nav>
          <Form action="/admin" className="flex gap-2">
            {current.status && <input type="hidden" name="status" value={current.status} />}
            <Input key={q} name="q" type="search" defaultValue={q} placeholder="Buscar pelo nome" className="w-56" />
            <Button type="submit" variant="outline">
              <SearchIcon /> Buscar
            </Button>
          </Form>
        </div>
      )}

      {q && found > 0 && (
        <p className="-mt-3 text-sm text-muted-foreground">
          {found.toLocaleString("pt-BR")} resultado(s) para &quot;{q}&quot;.{" "}
          <Link href={href({ q: undefined })} className="font-medium text-primary hover:underline">
            Limpar busca
          </Link>
        </p>
      )}

      <div>
        <ProductTable
          products={products}
          clicks={pageClicks}
          empty={<EmptyState total={summary.total} q={q} status={status} clearHref={href({ q: undefined })} />}
        />
        <Pagination page={page} totalPages={totalPages} hrefFor={(p) => href({ pagina: p })} />
      </div>
    </div>
  );
}

function EmptyState({ total, q, status, clearHref }: { total: number; q: string; status: Status; clearHref: string }) {
  if (total === 0) {
    return (
      <p>
        Nenhum produto ainda. Clique em &quot;Buscar na Shopee&quot; ou &quot;Novo produto&quot;, ou monte a{" "}
        <Link href="/admin/vitrine" className="font-medium text-primary hover:underline">
          vitrine automática
        </Link>
        .
      </p>
    );
  }
  if (q) {
    return (
      <>
        <p>
          Nenhum produto {status === "todos" ? "" : `${STATUS[status].toLowerCase()} `}encontrado para &quot;{q}&quot;.
        </p>
        <Link href={clearHref} className="font-medium text-primary hover:underline">
          Limpar busca
        </Link>
      </>
    );
  }
  return <p>{status === "todos" ? "Nenhum produto nesta página." : `Nenhum produto ${STATUS[status].toLowerCase()}.`}</p>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</p>
      </CardContent>
    </Card>
  );
}
