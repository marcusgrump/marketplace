import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: `${site.name} | Ofertas e achadinhos`,
  description: site.tagline,
  openGraph: { title: site.name, description: site.tagline, type: "website", locale: "pt_BR" },
};

export const viewport: Viewport = { themeColor: "#ee4d2d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
