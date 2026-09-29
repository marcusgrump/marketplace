import { discountPercent, formatPrice } from "@/lib/products";
import { stores, type StoreId } from "@/lib/site";

/**
 * Card de produto só de apresentação: serve tanto para os produtos cadastrados (/go/<slug>)
 * quanto para as ofertas que vêm na hora da Shopee (/go/v?...).
 */
export function ProductCard({
  href,
  title,
  imageUrl,
  price,
  originalPrice,
  store,
  fallbackLabel,
}: {
  href: string;
  title: string;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  store: StoreId;
  /** Texto mostrado no lugar da imagem quando ela não existe. */
  fallbackLabel: string;
}) {
  const badge = stores[store];
  const discount = discountPercent({ price, original_price: originalPrice });

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square bg-muted">
        {imageUrl ? (
          // <img> simples: aceita imagem de qualquer loja sem configurar domínios.
          <img src={imageUrl} alt={title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {fallbackLabel}
          </div>
        )}
        {discount && (
          <span className="absolute right-2 top-2 rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
            -{discount}%
          </span>
        )}
        <span
          className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: badge.color, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm">{title}</h3>
        <div className="mt-auto pt-2">
          {originalPrice && discount && (
            <p className="text-xs text-muted-foreground line-through">{formatPrice(originalPrice)}</p>
          )}
          <p className="text-lg font-bold text-primary">{formatPrice(price)}</p>
          <span className="mt-2 block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground group-hover:bg-brand-dark">
            Ver oferta
          </span>
        </div>
      </div>
    </a>
  );
}
