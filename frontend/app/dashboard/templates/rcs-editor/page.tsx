'use client';

// Uses useSearchParams — render on demand instead of static prerender.
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowLeft, Save, MessageSquareMore, Plus, Loader2, Check, CloudOff, Upload, X, Braces,
  Type as TypeIcon, Image as ImageIcon, GalleryHorizontalEnd, Trash2, ChevronUp, ChevronDown,
} from 'lucide-react';
import toast from '@/lib/toast';

import {
  templates, isEmbedMode, getEmbedReturnOrigin, getBuilderReturnUrl, setBuilderReturnUrl,
} from '@/lib/api';
import { extractRcsVariables, RCS_LIMITS } from '@/lib/rcs';
import { parseCsv, slugifyHeader } from '../contract-editor/_lib/csv';
import { RcsPhonePreview } from './_components/RcsPhonePreview';
import {
  RcsMessage, RcsCard, RcsSuggestion, RcsSuggestionType, RcsMessageType,
  emptyCard, defaultSuggestion,
} from './_lib/rcs-types';
import { parseRcs, serializeRcs } from './_lib/rcs-serializer';

// RCS templates are stored as a JSON payload in `content` (type 5). Same
// {{variable}} convention as the other builders; resolved at render time.

const COMMON_VARIABLES = [
  { name: 'firstName', label: 'Prénom' },
  { name: 'lastName', label: 'Nom' },
  { name: 'company', label: 'Société' },
  { name: 'code', label: 'Code' },
  { name: 'link', label: 'Lien' },
  { name: 'amount', label: 'Montant' },
  { name: 'date', label: 'Date' },
];

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

// onFocus binder → records which field a clicked variable should be inserted into.
type FieldEl = HTMLInputElement | HTMLTextAreaElement;
type Register = (set: (v: string) => void) => {
  onFocus: (e: React.FocusEvent<FieldEl>) => void;
};

const MESSAGE_TYPE_TABS: { value: RcsMessageType; label: string; icon: typeof TypeIcon }[] = [
  { value: 'text', label: 'Texte', icon: TypeIcon },
  { value: 'card', label: 'Carte', icon: ImageIcon },
  { value: 'carousel', label: 'Carrousel', icon: GalleryHorizontalEnd },
];

function RcsEditorContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEmbed = (pathname?.startsWith('/embed') ?? false) || isEmbedMode();
  const postToHost = useCallback((msg: Record<string, unknown>) => {
    if (!isEmbed || typeof window === 'undefined' || window.parent === window) return;
    const origin = getEmbedReturnOrigin();
    if (!origin) return;
    try { window.parent.postMessage(msg, origin); } catch { /* ignore */ }
  }, [isEmbed]);

  const initialTemplateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouveau RCS';
  const description = searchParams.get('description') || '';

  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(initialTemplateId);
  const [message, setMessage] = useState<RcsMessage>(() => parseRcs(null));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialTemplateId ? 'saved' : 'idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [imported, setImported] = useState<{ filename: string; headers: string[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedFor = useRef<string | null>(null);
  // Last-focused text field — where a clicked variable lands.
  const targetRef = useRef<{ el: FieldEl; set: (v: string) => void } | null>(null);

  // ─── Load existing template ────────────────────────────────────────────────
  useEffect(() => {
    if (!initialTemplateId) return;
    if (loadedFor.current === initialTemplateId) return;
    loadedFor.current = initialTemplateId;
    templates.get(initialTemplateId)
      .then((result: unknown) => {
        const r = result as { template?: { content?: string }; content?: string } | null;
        const tmpl = r?.template ?? r;
        setMessage(parseRcs(tmpl?.content ?? ''));
      })
      .catch(() => toast.error('Erreur chargement du template'));
  }, [initialTemplateId]);

  // Mutate helper — any change flags the draft as unsaved.
  const patch = useCallback((p: Partial<RcsMessage>) => {
    setMessage((m) => ({ ...m, ...p }));
    setSaveStatus('unsaved');
  }, []);

  const usedVariables = useMemo(() => extractRcsVariables(serializeRcs(message)), [message]);

  // ─── Variable insertion ─────────────────────────────────────────────────────
  const register: Register = useCallback((set) => ({
    onFocus: (e) => { targetRef.current = { el: e.currentTarget, set }; },
  }), []);

  const insertVariable = useCallback((variableName: string) => {
    const token = `{{${variableName}}}`;
    const t = targetRef.current;
    if (!t) {
      // No field focused → append to the message text.
      patch({ text: message.text + token });
      return;
    }
    const el = t.el;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    t.set(next);
    setSaveStatus('unsaved');
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }, [message.text, patch]);

  const startVariableDrag = useCallback((e: React.DragEvent, variableName: string) => {
    e.dataTransfer.setData('text/plain', `{{${variableName}}}`);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // ─── CSV / spreadsheet import (same as the SMS / contract builders) ──────────
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filename = file.name;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const isSpreadsheet = ['xlsx', 'xls', 'ods'].includes(ext);

    if (isSpreadsheet) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const XLSX = await import('xlsx');
          const buffer = ev.target?.result as ArrayBuffer;
          const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
          if (!data.length) return;
          const headers = (data[0] as (string | number)[]).map(String).map(slugifyHeader).filter(Boolean);
          if (headers.length) setImported({ filename, headers });
          else toast.error('Aucune colonne détectée');
        } catch {
          toast.error('Erreur lecture fichier — vérifiez le format');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { headers } = parseCsv(text);
        if (headers.length) setImported({ filename, headers });
        else toast.error('Aucune colonne détectée — vérifiez le séparateur');
      };
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  }, []);

  const adoptNewTemplateId = useCallback((newId: string) => {
    loadedFor.current = newId;
    setCurrentTemplateId(newId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', newId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const content = serializeRcs(message);
      let resultId: string | null = currentTemplateId;
      if (currentTemplateId) {
        await templates.update(currentTemplateId, { name, description, type: 5, content });
      } else {
        const created = await templates.create({ name, description, type: 5, content }) as
          { id?: string; template?: { id?: string } };
        resultId = created.id ?? created.template?.id ?? null;
      }
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      toast.success('RCS enregistré');
      postToHost({ event: 'saved', templateId: resultId, name });

      const returnUrl = getBuilderReturnUrl();
      if (returnUrl && resultId) {
        setBuilderReturnUrl(null);
        const sep = returnUrl.includes('?') ? '&' : '?';
        window.location.href = `${returnUrl}${sep}template_id=${encodeURIComponent(resultId)}`;
        return;
      }

      if (resultId && !currentTemplateId) adoptNewTemplateId(resultId);
      if (!isEmbed) router.push('/dashboard/templates');
    } catch {
      setSaveStatus('error');
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [message, currentTemplateId, name, description, adoptNewTemplateId, postToHost, isEmbed, router]);

  // Switch message type, carrying content across so nothing the user filled in
  // visually "disappears": card ↔ carousel seed each other when the target is empty.
  const cardHasContent = (c?: RcsCard) =>
    !!(c && (c.title || c.description || c.media?.url || c.suggestions.length));

  const switchType = (next: RcsMessageType) => {
    setMessage((m) => {
      if (next === 'carousel' && !m.cards.some(cardHasContent) && cardHasContent(m.card)) {
        return { ...m, messageType: next, cards: [m.card as RcsCard, emptyCard()] };
      }
      if (next === 'card' && !cardHasContent(m.card)) {
        const filled = m.cards.find(cardHasContent);
        if (filled) return { ...m, messageType: next, card: filled };
      }
      return { ...m, messageType: next };
    });
    setSaveStatus('unsaved');
  };

  // ─── Card helpers ───────────────────────────────────────────────────────────
  const setCard = (next: RcsCard) => patch({ card: next });
  const setCardAt = (i: number, next: RcsCard) => patch({ cards: message.cards.map((c, idx) => (idx === i ? next : c)) });
  const addCard = () => { if (message.cards.length >= RCS_LIMITS.carouselMax) return; patch({ cards: [...message.cards, emptyCard()] }); };
  const removeCard = (i: number) => { if (message.cards.length <= RCS_LIMITS.carouselMin) return; patch({ cards: message.cards.filter((_, idx) => idx !== i) }); };
  const moveCard = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= message.cards.length) return;
    const next = [...message.cards];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ cards: next });
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (isEmbed) postToHost({ event: 'closed' }); else router.back(); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} /> {isEmbed ? 'Fermer' : 'Retour'}
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-muted text-foreground">
            <MessageSquareMore size={12} /> RCS
          </span>
          <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <Save size={13} /> {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left rail — variables + import */}
        <aside className="w-64 border-r border-border bg-white overflow-y-auto p-4 shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Braces size={12} className="text-muted-foreground" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Variables</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
            Cliquez dans un champ, puis insérez une variable — ou glissez-la directement.
          </p>
          <div className="space-y-1.5">
            {COMMON_VARIABLES.map((v) => (
              <button
                key={v.name}
                draggable
                onDragStart={(e) => startVariableDrag(e, v.name)}
                onClick={() => insertVariable(v.name)}
                className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md border border-border text-foreground/80 hover:border-foreground/30 hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
              >
                <span className="truncate font-medium">{v.label}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-foreground">
                  <code>{`{{${v.name}}}`}</code> <Plus size={11} />
                </span>
              </button>
            ))}
          </div>

          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.ods,.tsv,.txt" className="hidden" onChange={handleFile} />
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Importer</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-foreground/70 hover:text-foreground hover:bg-accent border border-border transition-colors"
              >
                <Upload size={9} /> Fichier
              </button>
            </div>
            {!imported ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-1.5 py-4 rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-accent transition-colors"
              >
                <Upload size={16} />
                <span className="text-[10px] leading-snug text-center px-2">Importez un CSV / Excel<br />pour utiliser ses colonnes</span>
              </button>
            ) : (
              <div className="rounded-md border border-border bg-background overflow-hidden">
                <div className="px-2.5 py-1.5 bg-muted border-b border-border flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-foreground bg-background border border-border px-1.5 py-0.5 rounded shrink-0">{imported.headers.length}</span>
                  <span className="text-[10px] font-semibold text-foreground truncate flex-1" title={imported.filename}>{imported.filename}</span>
                  <button onClick={() => setImported(null)} title="Retirer le fichier" className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={10} />
                  </button>
                </div>
                <div className="p-1.5 space-y-0.5">
                  {imported.headers.map((h) => (
                    <button key={h} draggable onDragStart={(e) => startVariableDrag(e, h)} onClick={() => insertVariable(h)}
                      className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-accent transition-colors cursor-grab active:cursor-grabbing">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-foreground border border-border">{`{{${h}}}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {usedVariables.length > 0 && (
            <div className="mt-5">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Utilisées ({usedVariables.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {usedVariables.map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center — form */}
        <div className="flex-1 overflow-y-auto bg-muted/40">
          <div className="mx-auto max-w-4xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
            <div className="min-w-0 space-y-4">
              {/* Message-type switch */}
              <div className="flex gap-1 p-1 rounded-lg bg-background border border-border">
                {MESSAGE_TYPE_TABS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => switchType(t.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-semibold transition-colors ${
                      message.messageType === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>

              {/* Message text — shown for text & card; also the carousel intro text */}
              {message.messageType !== 'carousel' && (
                <Section title="Message texte">
                  <textarea
                    value={message.text}
                    onChange={(e) => patch({ text: e.target.value })}
                    {...register((v) => patch({ text: v }))}
                    placeholder={message.messageType === 'text' ? 'Bonjour {{firstName}}, …' : 'Texte d’accompagnement (optionnel)'}
                    rows={message.messageType === 'text' ? 6 : 3}
                    className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 placeholder:text-slate-300"
                  />
                </Section>
              )}

              {/* Single card */}
              {message.messageType === 'card' && (
                <Section title="Carte">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Orientation</span>
                    {(['vertical', 'horizontal'] as const).map((o) => (
                      <button key={o} onClick={() => patch({ cardOrientation: o })}
                        className={`px-2.5 h-7 rounded-md text-xs font-medium transition-all ${message.cardOrientation === o ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                        {o === 'vertical' ? 'Verticale' : 'Horizontale'}
                      </button>
                    ))}
                  </div>
                  <CardEditor card={message.card ?? emptyCard()} onChange={setCard} register={register} />
                </Section>
              )}

              {/* Carousel */}
              {message.messageType === 'carousel' && (
                <Section title={`Carrousel (${message.cards.length})`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Largeur des cartes</span>
                    {(['small', 'medium'] as const).map((w) => (
                      <button key={w} onClick={() => patch({ cardWidth: w })}
                        className={`px-2.5 h-7 rounded-md text-xs font-medium transition-all ${message.cardWidth === w ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                        {w === 'small' ? 'Petite' : 'Moyenne'}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {message.cards.map((c, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Carte {i + 1}</span>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => moveCard(i, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"><ChevronUp size={13} /></button>
                            <button onClick={() => moveCard(i, 1)} disabled={i === message.cards.length - 1} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"><ChevronDown size={13} /></button>
                            <button onClick={() => removeCard(i)} disabled={message.cards.length <= RCS_LIMITS.carouselMin} title="Supprimer" className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <CardEditor card={c} onChange={(next) => setCardAt(i, next)} register={register} />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addCard}
                    disabled={message.cards.length >= RCS_LIMITS.carouselMax}
                    className="mt-3 w-full h-9 rounded-md border border-dashed border-border text-xs font-medium text-foreground/70 hover:bg-accent hover:border-foreground/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Ajouter une carte
                  </button>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">{RCS_LIMITS.carouselMin}–{RCS_LIMITS.carouselMax} cartes. Les boutons se définissent par carte.</p>
                </Section>
              )}

              {/* Message-level suggestions (text & card only) */}
              {message.messageType !== 'carousel' && (
                <Section title="Suggestions">
                  <SuggestionsEditor
                    suggestions={message.suggestions}
                    onChange={(next) => patch({ suggestions: next })}
                    register={register}
                    max={RCS_LIMITS.messageSuggestions}
                  />
                </Section>
              )}
            </div>

            {/* Phone preview */}
            <div className="lg:sticky lg:top-8">
              <RcsPhonePreview message={message} senderName={name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable bits ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function CardEditor({ card, onChange, register }: { card: RcsCard; onChange: (next: RcsCard) => void; register: Register }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { media } = await import('@/lib/api');
      const res = await media.upload(file);
      onChange({ ...card, media: { url: res.url, height: card.media?.height ?? 'medium' } });
    } catch {
      toast.error("Échec de l'upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Media */}
      <div>
        <label className="text-xs text-slate-500">Média (image)</label>
        <div className="flex items-center gap-1.5 mt-1">
          <input
            value={card.media?.url ?? ''}
            onChange={(e) => onChange({ ...card, media: { url: e.target.value, height: card.media?.height ?? 'medium' } })}
            placeholder="https://…"
            className="h-8 flex-1 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
          />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="h-8 px-2.5 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-slate-400">Hauteur</span>
          {(['short', 'medium', 'tall'] as const).map((h) => (
            <button key={h} onClick={() => onChange({ ...card, media: { url: card.media?.url ?? '', height: h } })}
              className={`px-2 h-6 rounded text-[10px] font-medium transition-all ${(card.media?.height ?? 'medium') === h ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {h === 'short' ? 'Petite' : h === 'medium' ? 'Moyenne' : 'Grande'}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-slate-500">Titre</label>
        <input
          value={card.title ?? ''}
          onChange={(e) => onChange({ ...card, title: e.target.value })}
          {...register((v) => onChange({ ...card, title: v }))}
          maxLength={RCS_LIMITS.cardTitle}
          placeholder="Titre de la carte"
          className="h-8 w-full mt-1 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-slate-500">Description</label>
        <textarea
          value={card.description ?? ''}
          onChange={(e) => onChange({ ...card, description: e.target.value })}
          {...register((v) => onChange({ ...card, description: v }))}
          rows={3}
          maxLength={RCS_LIMITS.cardDescription}
          placeholder="Description…"
          className="w-full mt-1 resize-y rounded-md border border-slate-200 p-2 text-xs focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
        />
      </div>

      {/* Card buttons */}
      <SuggestionsEditor
        suggestions={card.suggestions}
        onChange={(next) => onChange({ ...card, suggestions: next })}
        register={register}
        max={RCS_LIMITS.cardSuggestions}
        label="Boutons"
      />
    </div>
  );
}

function SuggestionsEditor({
  suggestions, onChange, register, max, label = 'Suggestions',
}: {
  suggestions: RcsSuggestion[];
  onChange: (next: RcsSuggestion[]) => void;
  register: Register;
  max: number;
  label?: string;
}) {
  const setAt = (i: number, p: Partial<RcsSuggestion>) => onChange(suggestions.map((s, idx) => (idx === i ? { ...s, ...p } : s)));
  const add = () => { if (suggestions.length >= max) return; onChange([...suggestions, defaultSuggestion('reply')]); };
  const remove = (i: number) => onChange(suggestions.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-500">{label} <span className="text-slate-300">({suggestions.length}/{max})</span></span>
        <button onClick={add} disabled={suggestions.length >= max} className="flex items-center gap-1 text-xs text-foreground hover:text-foreground/70 font-medium disabled:opacity-40">
          <Plus size={12} /> Ajouter
        </button>
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <select
                value={s.type}
                onChange={(e) => setAt(i, normalizeSuggestion(e.target.value as RcsSuggestionType, s))}
                className="h-7 rounded-md border border-slate-200 text-xs px-1.5 bg-white focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
              >
                <option value="reply">Réponse</option>
                <option value="openUrl">Ouvrir un lien</option>
                <option value="dial">Appeler</option>
              </select>
              <input
                value={s.text}
                onChange={(e) => setAt(i, { text: e.target.value })}
                {...register((v) => setAt(i, { text: v }))}
                placeholder="Libellé"
                className="h-7 flex-1 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
              />
              <button onClick={() => remove(i)} title="Supprimer" className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                <X size={12} />
              </button>
            </div>
            {s.type === 'openUrl' && (
              <input
                value={s.url ?? ''}
                onChange={(e) => setAt(i, { url: e.target.value })}
                {...register((v) => setAt(i, { url: v }))}
                onBlur={(e) => { const val = e.target.value.trim(); if (val && !/^https?:\/\//.test(val)) setAt(i, { url: `https://${val}` }); }}
                placeholder="https://…"
                className="h-7 w-full rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
              />
            )}
            {s.type === 'dial' && (
              <input
                value={s.phone ?? ''}
                onChange={(e) => setAt(i, { phone: e.target.value })}
                {...register((v) => setAt(i, { phone: v }))}
                placeholder="+216 …"
                className="h-7 w-full rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
              />
            )}
          </div>
        ))}
        {suggestions.length === 0 && (
          <p className="text-[11px] text-slate-400 italic">Aucune — cliquez « Ajouter ».</p>
        )}
      </div>
    </div>
  );
}

// Keep the right fields when switching a suggestion's type.
function normalizeSuggestion(type: RcsSuggestionType, prev: RcsSuggestion): RcsSuggestion {
  return {
    type,
    text: prev.text,
    url: type === 'openUrl' ? prev.url ?? '' : undefined,
    phone: type === 'dial' ? prev.phone ?? '' : undefined,
  };
}

export default function RcsEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RcsEditorContent />
    </Suspense>
  );
}

function SaveStatusIndicator({ status, lastSavedAt }: { readonly status: SaveStatus; readonly lastSavedAt: Date | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== 'saved') return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [status]);

  if (status === 'idle') return null;
  if (status === 'saving') {
    return <span className="flex items-center gap-1 text-[11px] text-slate-500"><Loader2 size={11} className="animate-spin" /> Enregistrement…</span>;
  }
  if (status === 'unsaved') {
    return <span className="text-[11px] text-amber-600">Modifications non enregistrées</span>;
  }
  if (status === 'error') {
    return <span className="flex items-center gap-1 text-[11px] text-red-600"><CloudOff size={11} /> Échec de l’enregistrement</span>;
  }
  return <span className="flex items-center gap-1 text-[11px] text-emerald-600"><Check size={11} /> Enregistré{lastSavedAt ? ` ${formatRelative(lastSavedAt)}` : ''}</span>;
}

function formatRelative(d: Date): string {
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 5) return 'à l’instant';
  if (secs < 60) return `il y a ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `il y a ${hrs} h`;
}
