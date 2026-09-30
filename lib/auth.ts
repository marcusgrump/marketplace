import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Garante que quem está chamando é admin. Retorna o cliente Supabase com a sessão dele. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?erro=sem-acesso");
  }

  return { supabase, user };
}
