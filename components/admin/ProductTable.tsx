"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, setProductFlag } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent, formatPrice, type ProductRow } from "@/lib/products";
import { stores } from "@/lib/site";

type Flag = "active" | "featured";

export function ProductTable({ products, clicks }: { products: ProductRow[]; clicks: Record<string, number> }) {
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    products,
    (state, change: { id: string; field: Flag; value: boolean } | { id: string; deleted: true }) =>
      "deleted" in change
        ? state.filter((p) => p.id !== change.id)
        : state.map((p) => (p.id === change.id ? { ...p, [change.field]: change.value } : p)),
  );

  const toggle = (id: string, field: Flag, value: boolean) =>
    start(async () => {
      setOptimistic({ id, field, value });
      const r = await setProductFlag(id, field, value);
      if (r.error) toast.error(r.error);
    });

  const remove = (id: string) =>
    start(async () => {
      setOptimistic({ id, deleted: true });
      const r = await deleteProduct(id);
      if (r.error) toast.error(r.error);
      else toast.success("Produto excluído.");
    });

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/go/${slug}`);
    toast.success("Link copiado! Cole no WhatsApp, Instagram, onde quiser.");
  };

  if (optimistic.length === 0) {
    return (
      <Card className="items-center py-12 text-center text-muted-foreground">
        Nenhum produto ainda. Clique em &quot;Buscar na Shopee&quot; ou &quot;Novo produto&quot;.
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead className="text-right">Cliques 30d</TableHead>
            <TableHead className="text-center">No ar</TableHead>
            <TableHead className="text-center">Destaque</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimistic.map((p) => (
            <TableRow key={p.id} className={p.active ? undefined : "opacity-60"}>
              <TableCell>
                <div className="flex min-w-64 items-center gap-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="size-10 shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="max-w-80 truncate font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {stores[p.store].label} · {p.category}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatPrice(p.price)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {p.commission_rate !== null ? (
                  <Badge variant={p.commission_rate >= 0.08 ? "default" : "secondary"}>
                    {formatPercent(p.commission_rate)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{clicks[p.id] ?? 0}</TableCell>
              <TableCell className="text-center">
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, "active", v)} aria-label="No ar" />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={p.featured}
                  onCheckedChange={(v) => toggle(p.id, "featured", v)}
                  aria-label="Destaque"
                />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" title="Copiar link curto" onClick={() => copyLink(p.slug)}>
                    <CopyIcon />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Editar" asChild>
                    <Link href={`/admin/produtos/${p.id}`}>
                      <PencilIcon />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon-sm" title="Excluir">
                        <Trash2Icon />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{p.title}&quot; sai do site e o link curto dele para de funcionar. Para só esconder,
                          desligue &quot;No ar&quot;.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => remove(p.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
