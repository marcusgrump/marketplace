import { discountPercent, formatPrice, type Product } from "@/lib/products";
import { stores } from "@/lib/site";

export function ProductCard({ product: p }: { product: Product }) {
  const store = stores[p.loja];
  const discount = discountPercent(p);

  return (
    <a
      href={`/go/${p.id}`}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square bg-gray-100">
        {p.imagem ? (
          // <img> simples: aceita imagem de qualquer loja sem configurar domínios.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagem} alt={p.titulo} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
            {p.categoria}
          </div>
        )}
        {discount && (
          <span className="absolute right-2 top-2 rounded bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
        <span
          className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: store.color, color: store.text }}
        >
          {store.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h2 className="line-clamp-2 text-sm text-gray-800">{p.titulo}</h2>
        <div className="mt-auto pt-2">
          {p.precoAntigo && discount && (
            <p className="text-xs text-gray-400 line-through">{formatPrice(p.precoAntigo)}</p>
          )}
          <p className="text-lg font-bold text-brand">{formatPrice(p.preco)}</p>
          <span className="mt-2 block rounded bg-brand py-2 text-center text-sm font-semibold text-white group-hover:bg-brand-dark">
            Ver oferta
          </span>
        </div>
      </div>
    </a>
  );
}
