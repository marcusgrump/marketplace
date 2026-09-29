import { Catalog } from "@/components/Catalog";
import { PUBLIC_COLUMNS, type Product } from "@/lib/products";
import { site } from "@/lib/site";
import { createAnonClient } from "@/lib/supabase/server";

// A vitrine é gerada de forma estática e atualizada sempre que o painel salva algo
// (e, por garantia, a cada 10 minutos).
export const revalidate = 600;

export default async function Home() {
  const { data, error } = await createAnonClient()
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  // Falhar aqui mantém a última versão boa da página no ar, em vez de uma vitrine vazia.
  if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);

  const products = (data ?? []) as Product[];
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      <header className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-bold sm:text-3xl">{site.name}</h1>
          <p className="mt-1 text-sm text-white/90 sm:text-base">{site.tagline}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {products.length === 0 ? (
          <p className="py-24 text-center text-muted-foreground">Novas ofertas chegando em breve.</p>
        ) : (
          <Catalog products={products} categories={categories} />
        )}
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
          <p>{site.disclosure}</p>
          <p className="mt-2">Preços e disponibilidade podem mudar na loja.</p>
        </div>
      </footer>
    </>
  );
}
