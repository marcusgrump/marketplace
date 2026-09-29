import { produtos } from "@/data/produtos";
import type { StoreId } from "@/lib/site";

export type Product = {
  id: string;
  titulo: string;
  imagem: string;
  preco: number;
  precoAntigo?: number;
  loja: StoreId;
  categoria: string;
  link: string;
  destaque?: boolean;
};

export function getProducts(): Product[] {
  return [...produtos].sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque));
}

export function getProduct(id: string): Product | undefined {
  return produtos.find((p) => p.id === id);
}

export function getCategories(): string[] {
  return [...new Set(produtos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(value: number): string {
  return brl.format(value);
}

export function discountPercent(p: Product): number | null {
  if (!p.precoAntigo || p.precoAntigo <= p.preco) return null;
  return Math.round((1 - p.preco / p.precoAntigo) * 100);
}
