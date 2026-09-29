import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { ProductTable } from "@/components/admin/ProductTable";
import { RefreshPricesButton } from "@/components/admin/RefreshPricesButton";
import { SavedToast } from "@/components/admin/SavedToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isShopeeConnected } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import type { ProductRow } from "@/lib/products";

const DAY = 24 * 60 * 60 * 1000;
const STALE_DAYS = 7;

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const countClicks = (days: number) =>
    supabase.from("clicks").select("id", { count: "exact", head: true }).gte("created_at", since(days));

  const [{ data: rows }, { data: stats }, day, week, month, shopeeConnected] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.rpc("click_stats", { p_days: 30 }),
    countClicks(1),
    countClicks(7),
    countClicks(30),
    isShopeeConnected(supabase),
  ]);

  const products = (rows ?? []) as ProductRow[];
  const clicks = Object.fromEntries(
    ((stats ?? []) as { product_id: string; clicks: number }[]).map((s) => [s.product_id, Number(s.clicks)]),
  );
  const tips = buildTips(products, clicks, shopeeConnected);
  const hasShopeeProducts = products.some((p) => p.shopee_item_id);

  return (
    <div className="grid gap-6">
      <SavedToast />

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Produtos</h1>
        {shopeeConnected && hasShopeeProducts && <RefreshPricesButton />}
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
        <Stat label="Produtos no ar" value={products.filter((p) => p.active).length} />
        <Stat label="Cliques em 24h" value={day.count ?? 0} />
        <Stat label="Cliques em 7 dias" value={week.count ?? 0} />
        <Stat label="Cliques em 30 dias" value={month.count ?? 0} />
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

      <ProductTable products={products} clicks={clicks} />
    </div>
  );
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

type Tip = { text: string; href?: string; cta?: string };

function buildTips(products: ProductRow[], clicks: Record<string, number>, shopeeConnected: boolean): Tip[] {
  const tips: Tip[] = [];
  const active = products.filter((p) => p.active);

  if (!shopeeConnected) {
    tips.push({
      text: "Conecte sua conta de afiliado da Shopee para buscar produtos com comissão e importar com 1 clique.",
      href: "/admin/configuracoes",
      cta: "Conectar",
    });
  }
  if (products.length === 0) {
    tips.push({
      text: "Comece com 10 a 20 produtos de categorias que seu público compra. Qualidade vale mais que quantidade.",
      href: shopeeConnected ? "/admin/shopee" : "/admin/produtos/novo",
      cta: "Adicionar produtos",
    });
    return tips;
  }

  const noImage = active.filter((p) => !p.image_url).length;
  if (noImage) tips.push({ text: `${noImage} produto(s) sem foto. Produtos com foto recebem muito mais cliques.` });

  const featured = active.filter((p) => p.featured).length;
  if (featured === 0 && active.length >= 4) {
    tips.push({ text: "Nenhum produto em destaque. Destaque de 4 a 8 ofertas para aparecerem no topo do site." });
  }

  const lowCommission = active.filter((p) => p.commission_rate !== null && p.commission_rate < 0.05).length;
  if (lowCommission) {
    tips.push({
      text: `${lowCommission} produto(s) com comissão abaixo de 5%. Vale procurar um similar com comissão maior.`,
      href: shopeeConnected ? "/admin/shopee" : undefined,
      cta: "Buscar alternativas",
    });
  }

  const staleCutoff = Date.now() - STALE_DAYS * DAY;
  const stale = active.filter(
    (p) => p.shopee_item_id && (!p.price_checked_at || new Date(p.price_checked_at).getTime() < staleCutoff),
  ).length;
  if (stale && shopeeConnected) {
    tips.push({ text: `${stale} produto(s) com preço conferido há mais de ${STALE_DAYS} dias. Clique em "Atualizar preços".` });
  }

  const cold = active.filter((p) => !clicks[p.id] && new Date(p.created_at).getTime() < staleCutoff).length;
  if (cold) {
    tips.push({ text: `${cold} produto(s) sem nenhum clique em 30 dias. Troque por outros ou divulgue o link curto deles.` });
  }

  return tips;
}
