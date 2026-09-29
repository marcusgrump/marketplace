import { PasswordForm, ShopeeCredentialsForm } from "@/components/admin/SettingsForms";
import { requireAdmin } from "@/lib/auth";
import { isShopeeConnected } from "@/lib/admin";

export default async function SettingsPage() {
  const { supabase, user } = await requireAdmin();

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <ShopeeCredentialsForm connected={await isShopeeConnected(supabase)} />
      <PasswordForm email={user.email ?? ""} />
    </div>
  );
}
