import Link from "next/link";
import { SectionManager } from "@/components/admin/SectionManager";
import { getClickStats, getSections, isShopeeConnected } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/products";
import { SECTION_PREVIEW_SIZE } from "@/lib/sections";

export default async function ShowcasePage() {
  const { supabase } = await requireAdmin();
  const [sections, connected] = await Promise.all([getSections(supabase), isShopeeConnected(supabase)]);
  const clicks = await getClickStats(supabase, 30, sections.map((s) => `s:${s.id}`));
  const sectionClicks = Object.fromEntries(sections.map((s) => [s.id, clicks[`s:${s.id}`] ?? 0]));

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Vitrine automática</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Cada seção mostra produtos da Shopee buscados na hora, já com o seu link de comissão. A busca fica em cache por
          1 hora e nada é guardado no banco. Na página inicial cada seção mostra {SECTION_PREVIEW_SIZE} produtos e um
          botão &quot;Ver todos&quot;, com páginas de {PAGE_SIZE}.
        </p>
      </div>

      {!connected && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          A Shopee não está conectada, então as seções ainda não aparecem no site. Você já pode criá-las e depois{" "}
          <Link href="/admin/configuracoes" className="font-medium text-primary hover:underline">
            conectar a conta em Configurações
          </Link>
          .
        </div>
      )}

      <SectionManager sections={sections} clicks={sectionClicks} connected={connected} />
    </div>
  );
}
