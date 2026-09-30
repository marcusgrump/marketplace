import { cn } from "cn";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import type { ShopeeOffer } from "@/lib/shopee-shared";

const gridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

/** Origem do clique numa oferta da Shopee: seção da vitrine automática ou busca. */
export type OfferRef = `s:${string}` | "busca";

/** Link de saída das ofertas da Shopee: passa pelo /go/v para contar o clique. */
export function offerHref(offer: ShopeeOffer, ref: OfferRef): string {
  return `/go/v?u=${encodeURIComponent(offer.offerLink)}&r=${encodeURIComponent(ref)}`;
}

export function CuratedGrid({ products }: { products: Product[] }) {
  return (
    <ul className={gridClass}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard
            href={`/go/${p.slug}`}
            title={p.title}
            imageUrl={p.image_url}
            price={p.price}
            originalPrice={p.original_price}
            store={p.store}
            fallbackLabel={p.category}
          />
        </li>
      ))}
    </ul>
  );
}

export function OfferGrid({ offers, refTag }: { offers: ShopeeOffer[]; refTag: OfferRef }) {
  return (
    <ul className={gridClass}>
      {offers.map((o) => (
        <li key={`${o.shopId}-${o.itemId}`}>
          <ProductCard
            href={offerHref(o, refTag)}
            title={o.name}
            imageUrl={o.imageUrl || null}
            price={o.price}
            originalPrice={o.originalPrice}
            store="shopee"
            fallbackLabel="Shopee"
          />
        </li>
      ))}
    </ul>
  );
}

// Uma linha de cards vazios, com a mesma quantidade de colunas da grade em cada tela.
const skeletonVisibility = ["", "", "hidden sm:block", "hidden lg:block", "hidden xl:block"];

/** Esqueleto leve de um bloco de ofertas enquanto a Shopee responde. */
export function OffersSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mt-10">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className={cn(gridClass, "mt-4")}>
        {skeletonVisibility.map((visibility, i) => (
          <div key={i} className={cn("overflow-hidden rounded-xl border bg-card", visibility)}>
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3 animate-pulse rounded bg-muted" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
