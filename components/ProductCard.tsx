import { discountPercent, formatPrice, type Product } from "@/lib/products";
import { stores } from "@/lib/site";

export function ProductCard({ product: p }: { product: Product }) {
  const store = stores[p.store];
  const discount = discountPercent(p);

  return (
    <a
      href={`/go/${p.slug}`}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square bg-muted">
        {p.image_url ? (
          // <img> simples: aceita imagem de qualquer loja sem configurar domínios.
          <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {p.category}
          </div>
        )}
        {discount && (
          <span className="absolute right-2 top-2 rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
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
        <h2 className="line-clamp-2 text-sm">{p.title}</h2>
        <div className="mt-auto pt-2">
          {p.original_price && discount && (
            <p className="text-xs text-muted-foreground line-through">{formatPrice(p.original_price)}</p>
          )}
          <p className="text-lg font-bold text-primary">{formatPrice(p.price)}</p>
          <span className="mt-2 block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground group-hover:bg-brand-dark">
            Ver oferta
          </span>
        </div>
      </div>
    </a>
  );
}
