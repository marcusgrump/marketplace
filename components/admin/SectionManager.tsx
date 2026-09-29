"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  addSuggestedSections,
  createSection,
  deleteSection,
  moveSection,
  previewSection,
  setSectionActive,
  updateSection,
  type SectionInput,
} from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatPercent, formatPrice } from "@/lib/products";
import { SECTION_SUGGESTIONS, type Section } from "@/lib/sections";
import { SORT_OPTIONS, type ShopeeOffer, type SortKey } from "@/lib/shopee-shared";

type Change =
  | { type: "active"; id: string; value: boolean }
  | { type: "delete"; id: string }
  | { type: "move"; id: string; direction: "up" | "down" }
  | { type: "edit"; id: string; input: SectionInput };

function applyChange(state: Section[], change: Change): Section[] {
  switch (change.type) {
    case "active":
      return state.map((s) => (s.id === change.id ? { ...s, active: change.value } : s));
    case "delete":
      return state.filter((s) => s.id !== change.id);
    case "edit":
      return state.map((s) =>
        s.id === change.id
          ? { ...s, title: change.input.title, keyword: change.input.keyword, sort: change.input.sort as SortKey }
          : s,
      );
    case "move": {
      const i = state.findIndex((s) => s.id === change.id);
      const j = change.direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= state.length) return state;
      const next = [...state];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    }
  }
}

const EMPTY: SectionInput = { title: "", keyword: "", sort: "vendidos" };

export function SectionManager({
  sections,
  clicks,
  connected,
}: {
  sections: Section[];
  clicks: Record<string, number>;
  connected: boolean;
}) {
  const [optimistic, apply] = useOptimistic(sections, applyChange);
  const [, start] = useTransition();
  const [moving, startMove] = useTransition();
  const [adding, startAdd] = useTransition();
  const [draft, setDraft] = useState<SectionInput>(EMPTY);

  const taken = new Set(sections.map((s) => s.title.toLocaleLowerCase("pt-BR")));
  const missing = SECTION_SUGGESTIONS.filter((s) => !taken.has(s.title.toLocaleLowerCase("pt-BR")));

  const run = (change: Change, action: () => Promise<{ error?: string }>, success?: string) =>
    (change.type === "move" ? startMove : start)(async () => {
      apply(change);
      const r = await action();
      if (r.error) toast.error(r.error);
      else if (success) toast.success(success);
    });

  const create = () =>
    startAdd(async () => {
      const r = await createSection(draft);
      if (r.error) return void toast.error(r.error);
      setDraft(EMPTY);
      toast.success("Seção adicionada no fim da lista.");
    });

  const addSuggestions = () =>
    startAdd(async () => {
      const r = await addSuggestedSections();
      if (r.error) toast.error(r.error);
      else if (r.added) toast.success(`${r.added} seção(ões) adicionada(s).`);
      else toast.info("Todas as sugestões já estão na vitrine.");
    });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova seção</CardTitle>
          <CardDescription>Deixe a palavra-chave em branco para mostrar produtos de todas as categorias.</CardDescription>
          {missing.length > 0 && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                disabled={adding}
                onClick={addSuggestions}
                title={missing.map((s) => s.title).join(", ")}
              >
                <SparklesIcon /> Adicionar sugestões ({missing.length})
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <SectionFields idPrefix="new" value={draft} onChange={setDraft} />
            <Button type="submit" disabled={adding}>
              <PlusIcon /> {adding ? "Adicionando..." : "Adicionar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {optimistic.length === 0 ? (
        <Card className="items-center py-12 text-center text-muted-foreground">
          Nenhuma seção ainda. Crie a primeira acima ou clique em &quot;Adicionar sugestões&quot; para começar com
          seções prontas.
        </Card>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {optimistic.map((s, i) => (
              <SectionRow
                key={s.id}
                section={s}
                clicks={clicks[s.id] ?? 0}
                connected={connected}
                first={i === 0}
                last={i === optimistic.length - 1}
                moving={moving}
                onToggle={(value) => run({ type: "active", id: s.id, value }, () => setSectionActive(s.id, value))}
                onMove={(direction) => run({ type: "move", id: s.id, direction }, () => moveSection(s.id, direction))}
                onDelete={() => run({ type: "delete", id: s.id }, () => deleteSection(s.id), "Seção excluída.")}
                onEdit={(input) => apply({ type: "edit", id: s.id, input })}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SectionRow({
  section: s,
  clicks,
  connected,
  first,
  last,
  moving,
  onToggle,
  onMove,
  onDelete,
  onEdit,
}: {
  section: Section;
  clicks: number;
  connected: boolean;
  first: boolean;
  last: boolean;
  moving: boolean;
  onToggle: (value: boolean) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onEdit: (input: SectionInput) => void;
}) {
  const [editing, setEditing] = useState<SectionInput | null>(null);
  const [preview, setPreview] = useState<ShopeeOffer[] | null>(null);
  const [saving, startSave] = useTransition();
  const [loading, startPreview] = useTransition();

  const save = () =>
    startSave(async () => {
      if (!editing) return;
      onEdit(editing);
      const r = await updateSection(s.id, editing);
      if (r.error) return void toast.error(r.error);
      setEditing(null);
      setPreview(null);
      toast.success("Seção atualizada.");
    });

  const togglePreview = () => {
    if (preview) return setPreview(null);
    startPreview(async () => {
      const r = await previewSection(s.id);
      if ("error" in r) toast.error(r.error);
      else setPreview(r.offers);
    });
  };

  return (
    <li className={`grid gap-3 p-4 ${s.active ? "" : "bg-muted/40"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon-xs"
            title="Subir"
            disabled={first || moving}
            onClick={() => onMove("up")}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            title="Descer"
            disabled={last || moving}
            onClick={() => onMove("down")}
          >
            <ArrowDownIcon />
          </Button>
        </div>

        <div className={`min-w-48 flex-1 ${s.active ? "" : "opacity-60"}`}>
          <p className="truncate font-medium">{s.title}</p>
          <p className="text-xs text-muted-foreground">
            Palavra-chave: <span className="text-foreground">{s.keyword || "—"}</span> ·{" "}
            {SORT_OPTIONS[s.sort]?.label ?? s.sort}
          </p>
        </div>

        <p className="w-24 text-right text-sm">
          <b className="tabular-nums">{clicks.toLocaleString("pt-BR")}</b>{" "}
          <span className="text-xs text-muted-foreground">cliques 30d</span>
        </p>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={s.active} onCheckedChange={onToggle} aria-label="No ar" />
          No ar
        </label>

        <div className="flex gap-1">
          {connected && (
            <Button variant="ghost" size="sm" disabled={loading} onClick={togglePreview}>
              {preview ? <EyeOffIcon /> : <EyeIcon />}
              {loading ? "Buscando..." : preview ? "Fechar" : "Pré-visualizar"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Editar"
            onClick={() => setEditing(editing ? null : { title: s.title, keyword: s.keyword, sort: s.sort })}
          >
            <PencilIcon />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Excluir">
                <Trash2Icon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{s.title}&quot; sai da página inicial. Nenhum produto é apagado (eles vêm da Shopee). Para só
                  esconder, desligue &quot;No ar&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {editing && (
        <form
          className="grid gap-4 rounded-lg border bg-card p-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <SectionFields idPrefix={s.id} value={editing} onChange={setEditing} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {preview &&
        (preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            A Shopee não encontrou produtos com essa palavra-chave. Tente outra.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {preview.map((o) => (
              <li key={o.itemId} className="grid content-start gap-1 rounded-lg border p-2 text-xs">
                <img src={o.imageUrl} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                <p className="line-clamp-2">{o.name}</p>
                <p className="text-sm font-semibold">{formatPrice(o.price)}</p>
                <p className="text-muted-foreground">
                  Comissão <b className="text-foreground">{formatPercent(o.commissionRate)}</b>
                </p>
              </li>
            ))}
          </ul>
        ))}
    </li>
  );
}

function SectionFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: SectionInput;
  onChange: (value: SectionInput) => void;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Título</Label>
        <Input
          id={`${idPrefix}-title`}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Ex.: Achadinhos de cozinha"
          minLength={2}
          maxLength={80}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-keyword`}>Palavra-chave na Shopee</Label>
        <Input
          id={`${idPrefix}-keyword`}
          value={value.keyword}
          onChange={(e) => onChange({ ...value, keyword: e.target.value })}
          placeholder="Ex.: air fryer (opcional)"
          maxLength={80}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-sort`}>Ordenar por</Label>
        <Select value={value.sort} onValueChange={(sort) => onChange({ ...value, sort })}>
          <SelectTrigger id={`${idPrefix}-sort`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_OPTIONS).map(([k, o]) => (
              <SelectItem key={k} value={k}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
