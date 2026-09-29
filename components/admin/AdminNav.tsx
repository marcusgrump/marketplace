"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const links = [
  { href: "/admin", label: "Produtos" },
  { href: "/admin/vitrine", label: "Vitrine automática" },
  { href: "/admin/shopee", label: "Buscar na Shopee" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {links.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/produtos") : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
