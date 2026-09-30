import Link from "next/link";
import { ShopeeSearch } from "@/components/admin/ShopeeSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getCategories, isShopeeConnected } from "@/lib/admin";

export default async function ShopeePage() {
  const { supabase } = await requireAdmin();

  if (!(await isShopeeConnected(supabase))) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Conecte sua conta da Shopee</CardTitle>
          <CardDescription>
            Para buscar produtos com comissão direto daqui, informe o AppID e a Senha da Open API de afiliados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/configuracoes">Ir para Configurações</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Buscar na Shopee</h1>
        <p className="text-sm text-muted-foreground">
          Produtos do programa de afiliados, já com o seu link de comissão. Os marcados como{" "}
          <b className="text-foreground">Recomendado</b> têm comissão de 8%+, 100+ vendas e nota 4,5+.
        </p>
      </div>
      <ShopeeSearch categories={await getCategories(supabase)} />
    </div>
  );
}
