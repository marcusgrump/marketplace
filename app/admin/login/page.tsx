import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar | Painel", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm notice={erro === "sem-acesso" ? "Essa conta não tem acesso ao painel." : undefined} />
    </main>
  );
}
