"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { refreshShopeePrices } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function RefreshPricesButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await refreshShopeePrices();
          const summary = [
            r.updated ? `${r.updated} atualizado(s)` : "",
            r.unavailable ? `${r.unavailable} indisponível(is) na Shopee, ocultado(s) do site` : "",
          ]
            .filter(Boolean)
            .join(", ");
          if (r.error) toast.error(summary ? `${r.error} (${summary})` : r.error);
          else toast.success(summary ? `Preços atualizados: ${summary}.` : "Nada para atualizar.");
        })
      }
    >
      <RefreshCwIcon className={pending ? "animate-spin" : undefined} />
      {pending ? "Atualizando..." : "Atualizar preços"}
    </Button>
  );
}
