"use client";

import { useActionState, useState, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { lookupShopeeLink, saveProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatPercent, formatPrice, type ProductRow } from "@/lib/products";
import { stores } from "@/lib/site";

type Fields = {
  title: string;
  image_url: string;
  price: string;
  original_price: string;
  store: string;
  category: string;
  affiliate_url: string;
  shopee_shop_id: string;
  shopee_item_id: string;
  commission_rate: string;
  featured: boolean;
  active: boolean;
};

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toFields(p?: ProductRow): Fields {
  return {
    title: p?.title ?? "",
    image_url: p?.image_url ?? "",
    price: str(p?.price),
    original_price: str(p?.original_price),
    store: p?.store ?? "shopee",
    category: p?.category ?? "",
    affiliate_url: p?.affiliate_url ?? "",
    shopee_shop_id: str(p?.shopee_shop_id),
    shopee_item_id: str(p?.shopee_item_id),
    commission_rate: p?.commission_rate != null ? String(Math.round(p.commission_rate * 1000) / 10) : "",
    featured: p?.featured ?? false,
    active: p?.active ?? true,
  };
}

export function ProductForm({ product, categories }: { product?: ProductRow; categories: string[] }) {
  const [state, action, saving] = useActionState(saveProduct, undefined);
  const [f, setF] = useState<Fields>(() => toFields(product));
  const [link, setLink] = useState("");
  const [lookupMsg, setLookupMsg] = useState<{ error?: string; ok?: string }>();
  const [priceChecked, setPriceChecked] = useState(false);
  const [looking, startLookup] = useTransition();

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  const lookup = () =>
    startLookup(async () => {
      setLookupMsg(undefined);
      const r = await lookupShopeeLink(link);
      if (r.error || !r.product) {
        setLookupMsg({ error: r.error });
        // Sem API: se o link colado já é um link de afiliado da Shopee, aproveita.
        if (/^https:\/\/s\.shopee\.com\.br\//.test(link.trim()) && !f.affiliate_url) {
          setF((prev) => ({ ...prev, store: "shopee", affiliate_url: link.trim() }));
        }
        return;
      }
      const p = r.product;
      setF((prev) => ({
        ...prev,
        title: p.title,
        image_url: p.image_url,
        price: String(p.price),
        original_price: str(p.original_price),
        store: "shopee",
        affiliate_url: p.affiliate_url,
        shopee_shop_id: String(p.shopee_shop_id),
        shopee_item_id: String(p.shopee_item_id),
        commission_rate: String(Math.round(p.commission_rate * 1000) / 10),
      }));
      setPriceChecked(true);
      setLookupMsg({
        ok: `Dados preenchidos. Comissão de ${formatPercent(p.commission_rate)} (~${formatPrice(p.price * p.commission_rate)} por venda).`,
      });
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <form action={action} className="grid gap-6">
        {product && <input type="hidden" name="id" value={product.id} />}
        {priceChecked && <input type="hidden" name="price_checked" value="1" />}
        <input type="hidden" name="shopee_shop_id" value={f.shopee_shop_id} />
        <input type="hidden" name="shopee_item_id" value={f.shopee_item_id} />
        <input type="hidden" name="store" value={f.store} />

        <Card>
          <CardHeader>
            <CardTitle>Importar da Shopee</CardTitle>
            <CardDescription>Cole o link do produto e os dados são preenchidos com o seu link de comissão.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://shopee.com.br/... ou https://s.shopee.com.br/..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (link.trim()) lookup();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={lookup} disabled={!link.trim() || looking}>
                <DownloadIcon /> {looking ? "Buscando..." : "Buscar dados"}
              </Button>
            </div>
            {lookupMsg?.error && <p className="text-sm text-destructive">{lookupMsg.error}</p>}
            {lookupMsg?.ok && <p className="text-sm text-green-700">{lookupMsg.ok}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do produto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Nome do produto" htmlFor="title">
              <Input id="title" name="title" value={f.title} onChange={set("title")} required maxLength={200} />
              <Hint>{f.title.length > 70 ? `${f.title.length} caracteres. Nomes curtos leem melhor no celular.` : null}</Hint>
            </Field>

            <Field label="Link de afiliado (comissão)" htmlFor="affiliate_url">
              <Input
                id="affiliate_url"
                name="affiliate_url"
                type="url"
                value={f.affiliate_url}
                onChange={set("affiliate_url")}
                placeholder="https://s.shopee.com.br/..."
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loja" htmlFor="store">
                <Select value={f.store} onValueChange={(v) => setF((prev) => ({ ...prev, store: v }))}>
                  <SelectTrigger id="store" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stores).map(([id, s]) => (
                      <SelectItem key={id} value={id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Categoria" htmlFor="category">
                <Input
                  id="category"
                  name="category"
                  list="categories"
                  value={f.category}
                  onChange={set("category")}
                  placeholder="Ex.: Casa, Beleza, Eletrônicos"
                />
                <datalist id="categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Preço (R$)" htmlFor="price">
                <Input id="price" name="price" inputMode="decimal" value={f.price} onChange={set("price")} required />
              </Field>
              <Field label="Preço antigo (opcional)" htmlFor="original_price">
                <Input
                  id="original_price"
                  name="original_price"
                  inputMode="decimal"
                  value={f.original_price}
                  onChange={set("original_price")}
                />
              </Field>
              <Field label="Comissão % (opcional)" htmlFor="commission_rate">
                <Input
                  id="commission_rate"
                  name="commission_rate"
                  inputMode="decimal"
                  value={f.commission_rate}
                  onChange={set("commission_rate")}
                />
              </Field>
            </div>

            <Field label="URL da foto" htmlFor="image_url">
              <div className="flex gap-3">
                <Input id="image_url" name="image_url" type="url" value={f.image_url} onChange={set("image_url")} />
                {f.image_url && <img src={f.image_url} alt="" className="size-9 shrink-0 rounded-md object-cover" />}
              </div>
            </Field>

            <div className="flex flex-wrap gap-6">
              <Toggle name="active" label="No ar" checked={f.active} onChange={(v) => setF((p) => ({ ...p, active: v }))} />
              <Toggle
                name="featured"
                label="Destaque (aparece primeiro)"
                checked={f.featured}
                onChange={(v) => setF((p) => ({ ...p, featured: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Salvando..." : product ? "Salvar alterações" : "Adicionar ao site"}
          </Button>
        </div>
      </form>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Dicas para vender mais</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-sm text-muted-foreground">
            <li>
              <b className="text-foreground">Comissão:</b> prefira produtos com 8% ou mais. Na Shopee, lojas com
              &quot;comissão extra&quot; costumam pagar bem acima disso.
            </li>
            <li>
              <b className="text-foreground">Prova social:</b> produtos com muitas vendas e nota 4,5+ convertem mais.
            </li>
            <li>
              <b className="text-foreground">Nome:</b> curto e direto (até ~60 caracteres). Tire excesso de palavras-chave
              que o vendedor coloca.
            </li>
            <li>
              <b className="text-foreground">Preço antigo:</b> só preencha se o desconto for real.
            </li>
            <li>
              <b className="text-foreground">Categorias:</b> use poucas e sempre com o mesmo nome, para o filtro do site
              ficar limpo.
            </li>
            <li>
              <b className="text-foreground">Divulgação:</b> depois de salvar, copie o link curto na lista de produtos e
              compartilhe.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return children ? <p className="text-xs text-muted-foreground">{children}</p> : null;
}

function Toggle({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {checked && <input type="hidden" name={name} value="on" />}
      {label}
    </label>
  );
}
