'use client';

// Uses useSearchParams — render on demand instead of static prerender.
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowLeft, Save, MessageSquare, Plus, Loader2, Check, CloudOff, Upload, X, Smartphone, Sparkles } from 'lucide-react';
import toast from '@/lib/toast';

import {
  templates,
  isEmbedMode,
  getEmbedReturnOrigin,
  getBuilderReturnUrl,
  setBuilderReturnUrl,
} from '@/lib/api';
import { countSms, extractSmsVariables } from '@/lib/sms';
import { parseCsv, slugifyHeader } from '../contract-editor/_lib/csv';

// SMS templates are intentionally simple: stored as plain text in `content`
// (type 4 = SMS), with {{variables}} resolved at render time — same convention
// as the other builders. No subject, no HTML.

// Common variables offered for one-click insertion. Users can also type any
// {{name}} directly; whatever they reference is reported by the render endpoint.
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

function SmsEditorContent() {
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
  const name = searchParams.get('name') || 'Nouveau SMS';
  const description = searchParams.get('description') || '';

  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(initialTemplateId);
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialTemplateId ? 'saved' : 'idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Columns imported from a CSV/spreadsheet, offered as insertable variables —
  // same idea as the other builders' CSV palette, adapted to the plain-text editor.
  const [imported, setImported] = useState<{ filename: string; headers: string[] } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedFor = useRef<string | null>(null);

  // ─── Load existing template ────────────────────────────────────────────────
  useEffect(() => {
    if (!initialTemplateId) return;
    if (loadedFor.current === initialTemplateId) return;
    loadedFor.current = initialTemplateId;
    templates.get(initialTemplateId)
      .then((result: unknown) => {
        const r = result as { template?: { content?: string }; content?: string } | null;
        const tmpl = r?.template ?? r;
        setBody(tmpl?.content ?? '');
      })
      .catch(() => toast.error('Erreur chargement du template'));
  }, [initialTemplateId]);

  const sms = useMemo(() => countSms(body), [body]);
  const usedVariables = useMemo(() => extractSmsVariables(body), [body]);

  // Fill of the *current* segment, for the meter bar. The first GSM-7 segment
  // holds 160 chars (70 for UCS-2); each additional concatenated part holds
  // 153 (67) because of the multipart header.
  const meter = useMemo(() => {
    const single = sms.encoding === 'GSM-7' ? 160 : 70;
    const multi = sms.encoding === 'GSM-7' ? 153 : 67;
    const cap = sms.segments <= 1 ? single : multi;
    const inCurrent = sms.segments <= 1 ? sms.characters : sms.characters - (sms.segments - 1) * multi;
    const pct = cap ? Math.min(100, Math.round((inCurrent / cap) * 100)) : 0;
    return { cap, inCurrent, pct };
  }, [sms]);

  // ─── Insert a {{variable}} at the cursor ────────────────────────────────────
  const insertVariable = useCallback((variableName: string) => {
    const token = `{{${variableName}}}`;
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + token);
      setSaveStatus('unsaved');
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    setSaveStatus('unsaved');
    // Restore focus + place the caret right after the inserted token.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }, [body]);

  // Drag source: a textarea natively inserts dropped text/plain at the exact
  // caret under the cursor, and the controlled onChange fires from that drop —
  // so we get precise drag-and-drop without computing the caret ourselves.
  const startVariableDrag = useCallback((e: React.DragEvent, variableName: string) => {
    e.dataTransfer.setData('text/plain', `{{${variableName}}}`);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // ─── Import variables from a CSV / spreadsheet ──────────────────────────────
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

  // ─── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Track the id locally: after a create, the currentTemplateId state hasn't
      // flushed yet, so we can't rely on it for the post-save redirect.
      let resultId: string | null = currentTemplateId;
      if (currentTemplateId) {
        await templates.update(currentTemplateId, { name, description, type: 4, content: body });
      } else {
        const created = await templates.create({ name, description, type: 4, content: body }) as
          { id?: string; template?: { id?: string } };
        resultId = created.id ?? created.template?.id ?? null;
      }
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      toast.success('SMS enregistré');
      postToHost({ event: 'saved', templateId: resultId, name });

      // Embed/integration session: hand the id back to the host tool. Do this
      // BEFORE adopting the new id (which does a router.replace) so the
      // full-page redirect isn't pre-empted by a client-side navigation —
      // this matches what the email/contract/invoice builders do.
      const returnUrl = getBuilderReturnUrl();
      if (returnUrl && resultId) {
        setBuilderReturnUrl(null);
        const sep = returnUrl.includes('?') ? '&' : '?';
        window.location.href = `${returnUrl}${sep}template_id=${encodeURIComponent(resultId)}`;
        return;
      }

      // Not returning to a host: adopt the new id so further edits update in
      // place, and in a normal dashboard session go back to the list.
      if (resultId && !currentTemplateId) adoptNewTemplateId(resultId);
      if (!isEmbed) router.push('/dashboard/templates');
    } catch {
      setSaveStatus('error');
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [currentTemplateId, name, description, body, adoptNewTemplateId, postToHost, isEmbed, router]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header — mirrors the other editors' top bar. */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Redirect (full-page) integration session → return to the host's
              // callback URL, same as save/create. No template_id: this is a cancel.
              const returnUrl = getBuilderReturnUrl();
              if (returnUrl) { setBuilderReturnUrl(null); window.location.href = returnUrl; return; }
              if (isEmbed) postToHost({ event: 'closed' }); else router.back();
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} /> {isEmbed ? 'Fermer' : 'Retour'}
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-violet-50 text-violet-600 border-violet-200">
            <MessageSquare size={12} /> SMS
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

      {/* Body — variables rail + text editor. */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: variable palette (same insert-at-cursor UX as the other builders). */}
        <aside className="w-64 border-r border-border bg-white overflow-y-auto p-4 shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-violet-500" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Variables</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-snug">
            Glissez-déposez ou cliquez pour insérer une variable, ou tapez{' '}
            <code className="text-slate-500">{'{{nom}}'}</code> directement.
          </p>
          <div className="space-y-1.5">
            {COMMON_VARIABLES.map((v) => (
              <button
                key={v.name}
                draggable
                onDragStart={(e) => startVariableDrag(e, v.name)}
                onClick={() => insertVariable(v.name)}
                className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-colors cursor-grab active:cursor-grabbing"
              >
                <span className="truncate font-medium">{v.label}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-violet-500">
                  <code>{`{{${v.name}}}`}</code> <Plus size={11} />
                </span>
              </button>
            ))}
          </div>

          {/* Import variables from a CSV / spreadsheet (firstrow = column names). */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.ods,.tsv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Importer
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
              >
                <Upload size={9} /> Fichier
              </button>
            </div>

            {!imported ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-1.5 py-4 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors"
              >
                <Upload size={16} />
                <span className="text-[10px] leading-snug text-center px-2">
                  Importez un CSV / Excel<br />pour utiliser ses colonnes
                </span>
              </button>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-white overflow-hidden">
                <div className="px-2.5 py-1.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shrink-0">
                    {imported.headers.length}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 truncate flex-1" title={imported.filename}>
                    {imported.filename}
                  </span>
                  <button
                    onClick={() => setImported(null)}
                    title="Retirer le fichier"
                    className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-emerald-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="p-1.5 space-y-0.5">
                  {imported.headers.map((name) => (
                    <button
                      key={name}
                      draggable
                      onDragStart={(e) => startVariableDrag(e, name)}
                      onClick={() => insertVariable(name)}
                      className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {`{{${name}}}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {usedVariables.length > 0 && (
            <div className="mt-5">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                Utilisées ({usedVariables.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {usedVariables.map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center: the plain-text editor + a live phone preview. */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100">
          <div className="mx-auto max-w-4xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
            {/* ── Editor column ───────────────────────────────────────────── */}
            <div className="min-w-0">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                  <label htmlFor="sms-body" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MessageSquare size={14} className="text-violet-500" />
                    Contenu du SMS
                  </label>
                  <span className="text-[10px] font-medium text-slate-400">
                    {sms.characters} caractère{sms.characters > 1 ? 's' : ''}
                  </span>
                </div>
                <textarea
                  id="sms-body"
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setSaveStatus('unsaved'); }}
                  placeholder="Bonjour {{firstName}}, votre code de connexion est {{code}}."
                  rows={9}
                  className="w-full resize-y border-0 bg-white p-4 text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                />
              </div>

              {/* Segment meter — colour shifts to amber once we spill over. */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${sms.segments > 1 ? 'bg-amber-400' : 'bg-violet-500'}`} />
                    Encodage <span className="font-semibold text-slate-700">{sms.encoding}</span>
                  </span>
                  <span className={`font-semibold ${sms.segments > 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {sms.segments} SMS · {sms.remaining} restant{sms.remaining > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${sms.segments > 1 ? 'bg-amber-400' : 'bg-violet-500'}`}
                    style={{ width: `${meter.pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{meter.inCurrent}/{meter.cap} dans ce segment</span>
                  {sms.segments > 1 && (
                    <span className="text-amber-600">
                      Dépasse {sms.encoding === 'GSM-7' ? '160' : '70'} car. — {sms.segments} parties
                    </span>
                  )}
                </div>
              </div>

              {/* Tip */}
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug">
                <Sparkles size={12} className="mt-0.5 shrink-0 text-violet-400" />
                Glissez une variable depuis la gauche, ou tapez <code className="text-slate-500">{'{{nom}}'}</code> —
                les valeurs sont injectées à l’envoi.
              </p>
            </div>

            {/* ── Phone preview column ────────────────────────────────────── */}
            <div className="lg:sticky lg:top-8">
              <PhonePreview body={body} segments={sms.segments} senderName={name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A lightweight phone mockup so the SMS preview reads the way it will on a
// device — bubble, sender, and a segment badge when the message splits.
function PhonePreview({ body, segments, senderName }: { readonly body: string; readonly segments: number; readonly senderName: string }) {
  return (
    <div className="mx-auto w-[260px] rounded-[2.25rem] border-[6px] border-slate-900 bg-slate-900 shadow-xl">
      <div className="relative rounded-[1.75rem] bg-slate-50 overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-24 bg-slate-900 rounded-b-2xl z-10" />
        {/* status / contact bar */}
        <div className="pt-6 pb-3 px-4 bg-white border-b border-slate-100 flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
            <MessageSquare size={15} className="text-violet-600" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[180px]">{senderName}</span>
        </div>
        {/* conversation */}
        <div className="px-3 py-4 min-h-[300px] space-y-2 bg-[radial-gradient(circle_at_top,#ffffff,#f1f5f9)]">
          {body.trim() ? (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-violet-600 px-3.5 py-2 text-[13px] leading-relaxed text-white whitespace-pre-wrap break-words shadow-sm">
                {body}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-300">
              <MessageSquare size={26} />
              <span className="text-[11px]">Votre message apparaîtra ici…</span>
            </div>
          )}
          {segments > 1 && body.trim() && (
            <div className="flex justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-semibold text-amber-600">
                <Smartphone size={9} /> {segments} SMS
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmsEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SmsEditorContent />
    </Suspense>
  );
}

function SaveStatusIndicator({
  status,
  lastSavedAt,
}: {
  readonly status: SaveStatus;
  readonly lastSavedAt: Date | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== 'saved') return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [status]);

  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-slate-500">
        <Loader2 size={11} className="animate-spin" /> Enregistrement…
      </span>
    );
  }
  if (status === 'unsaved') {
    return <span className="text-[11px] text-amber-600">Modifications non enregistrées</span>;
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-red-600">
        <CloudOff size={11} /> Échec de l’enregistrement
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-emerald-600">
      <Check size={11} /> Enregistré{lastSavedAt ? ` ${formatRelative(lastSavedAt)}` : ''}
    </span>
  );
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
