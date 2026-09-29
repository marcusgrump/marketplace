"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import { stores, type StoreId } from "@/lib/site";
import { ProductCard } from "./ProductCard";

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function Catalog({ products, categories }: { products: Product[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [store, setStore] = useState<StoreId | null>(null);

  const usedStores = useMemo(() => [...new Set(products.map((p) => p.loja))], [products]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return products.filter(
      (p) =>
        (!category || p.categoria === category) &&
        (!store || p.loja === store) &&
        (!q || normalize(p.titulo).includes(q)),
    );
  }, [products, query, category, store]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar produto..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-brand"
      />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={!category} onClick={() => setCategory(null)}>
          Todos
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {c}
          </Chip>
        ))}
      </div>

      {usedStores.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {usedStores.map((s) => (
            <Chip key={s} active={store === s} onClick={() => setStore(store === s ? null : s)}>
              {stores[s].label}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-gray-500">Nenhum produto encontrado.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
        active ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-700 hover:border-brand"
      }`}
    >
      {children}
    </button>
  );
}
