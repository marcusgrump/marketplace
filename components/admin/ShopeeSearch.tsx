"use client";

import { useState, useTransition } from "react";
import { CheckIcon, PlusIcon, SearchIcon, StarIcon } from "lucide-react";
import { toast } from "sonner";
import { importOffers, searchShopee } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPercent, formatPrice } from "@/lib/products";
import { isRecommended, SORT_OPTIONS, type ShopeeOffer, type SortKey } from "@/lib/shopee-shared";

export function ShopeeSearch({ categories, existing }: { categories: string[]; existing: number[] }) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<SortKey>("comissao");
  const [category, setCategory] = useState("");
  const [offers, setOffers] = useState<ShopeeOffer[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [added, setAdded] = useState(() => new Set(existing));
  const [searched, setSearched] = useState(false);
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();

  const search = (nextPage: number) =>
    startSearch(async () => {
      const r = await searchShopee(keyword, sort, nextPage);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setOffers((prev) => (nextPage === 1 ? r.offers : [...prev, ...r.offers]));
      setPage(nextPage);
      setHasNext(r.hasNextPage);
      setSearched(true);
    });

  const add = (list: ShopeeOffer[]) =>
    startImport(async () => {
      const r = await importOffers(list, category || keyword || "Outros");
      if (r.error) toast.error(r.error);
      setAdded((prev) => new Set([...prev, ...list.map((o) => o.itemId)]));
      if (r.imported) toast.success(`${r.imported} produto(s) adicionado(s) ao site.`);
      else if (r.skipped) toast.info("Esse produto já estava cadastrado.");
    });

  const recommendedNotAdded = offers.filter((o) => isRecommended(o) && !added.has(o.itemId));

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <form
          className="grid gap-4 md:grid-cols-[1fr_180px_200px_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            search(1);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="kw">O que você quer divulgar?</Label>
            <Input
              id="kw"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex.: air fryer, fone bluetooth, skincare"
            />
          </div>
          <div className="grid gap-2">
            <Label>Ordenar por</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_OPTIONS).map(([k, o]) => (
                  <SelectItem key={k} value={k}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cat">Categoria no site</Label>
            <Input
              id="cat"
              list="cats"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={keyword || "Ex.: Cozinha"}
            />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <Button type="submit" size="lg" disabled={searching}>
            <SearchIcon /> {searching && page === 1 ? "Buscando..." : "Buscar"}
          </Button>
        </form>
      </Card>

      {recommendedNotAdded.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="mr-auto">
            {recommendedNotAdded.length} produtos recomendados nesta busca ainda não estão no seu site.
          </span>
          <Button size="sm" disabled={importing} onClick={() => add(recommendedNotAdded)}>
            <PlusIcon /> Adicionar todos os recomendados
          </Button>
        </div>
      )}

      {searched && offers.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">Nenhum produto encontrado. Tente outra palavra.</p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {offers.map((o) => {
          const isAdded = added.has(o.itemId);
          return (
            <li key={o.itemId}>
              <Card className="h-full gap-0 py-0">
                <div className="relative aspect-square bg-muted">
                  <img src={o.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {isRecommended(o) && (
                    <Badge className="absolute left-2 top-2">
                      <StarIcon /> Recomendado
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <a
                    href={o.productLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-sm hover:underline"
                  >
                    {o.name}
                  </a>
                  <p className="font-semibold">{formatPrice(o.price)}</p>
                  <div className="grid grid-cols-2 gap-x-2 text-xs text-muted-foreground">
                    <span>
                      Comissão <b className="text-foreground">{formatPercent(o.commissionRate)}</b>
                    </span>
                    <span>
                      ~<b className="text-foreground">{formatPrice(o.commission || o.price * o.commissionRate)}</b>/venda
                    </span>
                    <span>{o.sales.toLocaleString("pt-BR")} vendidos</span>
                    <span>★ {o.rating ? o.rating.toFixed(1) : "—"}</span>
                  </div>
                  <Button
                    className="mt-auto"
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    disabled={isAdded || importing}
                    onClick={() => add([o])}
                  >
                    {isAdded ? (
                      <>
                        <CheckIcon /> No site
                      </>
                    ) : (
                      <>
                        <PlusIcon /> Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {hasNext && (
        <div className="text-center">
          <Button variant="outline" disabled={searching} onClick={() => search(page + 1)}>
            {searching ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}
