import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: `${site.name} | Ofertas e achadinhos`,
  description: site.tagline,
  openGraph: { title: site.name, description: site.tagline, type: "website", locale: "pt_BR" },
};

export const viewport: Viewport = { themeColor: "#ee4d2d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
