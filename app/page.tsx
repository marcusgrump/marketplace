import { Catalog } from "@/components/Catalog";
import { getCategories, getProducts } from "@/lib/products";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <header className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-bold sm:text-3xl">{site.name}</h1>
          <p className="mt-1 text-sm text-white/90 sm:text-base">{site.tagline}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Catalog products={getProducts()} categories={getCategories()} />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-gray-500">
          <p>{site.disclosure}</p>
          <p className="mt-2">Preços e disponibilidade podem mudar na loja.</p>
        </div>
      </footer>
    </>
  );
}
