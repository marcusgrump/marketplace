"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, string> = {
  criado: "Produto adicionado ao site.",
  editado: "Produto atualizado.",
};

/** Mostra o aviso de "salvo" depois de um redirect com ?salvo=... e limpa a URL. */
export function SavedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const saved = params.get("salvo");

  useEffect(() => {
    if (!saved) return;
    toast.success(messages[saved] ?? "Salvo.");
    const rest = new URLSearchParams(params);
    rest.delete("salvo");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [saved, params, router, pathname]);

  return null;
}
