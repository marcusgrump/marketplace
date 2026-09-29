"use client";

import { useActionState, useState, useTransition } from "react";
import { changePassword, disconnectShopee, saveShopeeCredentials } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopeeCredentialsForm({ connected }: { connected: boolean }) {
  const [state, action, pending] = useActionState(saveShopeeCredentials, undefined);
  const [disconnecting, startDisconnect] = useTransition();
  const [appId, setAppId] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conta de afiliado da Shopee</CardTitle>
        <CardDescription>
          Com a conta conectada você busca produtos com comissão, importa com 1 clique e atualiza os
          preços de todos os produtos de uma vez.
        </CardDescription>
        <CardAction>
          <Badge variant={connected ? "default" : "secondary"}>{connected ? "Conectada" : "Não conectada"}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          <li>
            Entre em{" "}
            <a
              href="https://affiliate.shopee.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              affiliate.shopee.com.br
            </a>{" "}
            com sua conta de afiliado.
          </li>
          <li>
            No menu, abra <b className="text-foreground">Open API</b> e solicite o acesso (a Shopee pode levar alguns dias
            para liberar).
          </li>
          <li>
            Copie o <b className="text-foreground">AppID</b> e a <b className="text-foreground">Senha (Secret)</b> e cole
            abaixo.
          </li>
        </ol>
        <form action={action} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="app_id">AppID</Label>
              <Input
                id="app_id"
                name="app_id"
                inputMode="numeric"
                autoComplete="off"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secret">Senha (Secret)</Label>
              <Input id="secret" name="secret" type="password" autoComplete="off" required />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Testando conexão..." : connected ? "Trocar credenciais" : "Conectar"}
            </Button>
            {connected && (
              <Button
                type="button"
                variant="ghost"
                disabled={disconnecting}
                onClick={() => startDisconnect(() => disconnectShopee())}
              >
                Desconectar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trocar senha</CardTitle>
        <CardDescription>Conta: {email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Repita a nova senha</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Trocar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
