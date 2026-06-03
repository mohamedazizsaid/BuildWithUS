'use client';

// Uses useSearchParams — render on demand instead of static prerender.
export const dynamic = 'force-dynamic';

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft, Save, Download, RefreshCw, ChevronDown,
  AlertTriangle, FileText, FilePlus, Upload, Check, CloudOff, Loader2, Type,
  Square, Circle, Minus,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { templates, contractVariables, media, getEmbedReturnOrigin, isEmbedMode, getBuilderReturnUrl, setBuilderReturnUrl } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { VariableNode, extractVariablesFromTiptap, renderTiptapToHtml } from '@/lib/tiptap/variable-node';
import { buildVariableMapping, type MappingSource } from '@/lib/variable-mapper';
import { MappingConfirmModal } from '@/components/contract/MappingConfirmModal';
import { VarLabelsContext } from '@/lib/tiptap/var-labels-context';
import { ContractHeader } from '@/lib/tiptap/contract-header';
import { ALL_CONTRACT_BLOCKS } from '@/lib/tiptap/contract-blocks';
import { CONTRACT_TEMPLATES, VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';

import { FontSize } from './_lib/font-size';
import { TextColor } from './_lib/text-color';
import { CONTRACT_TYPES, type ContractType, type SlashMenuItem, type CsvDataset, type BlockMeta, type FloatingImage, type FloatingSignature } from './_lib/types';
import { VariablePalette } from './_components/VariablePalette';
import { EditorToolbar } from './_components/EditorToolbar';
import { ContractCanvas } from './_components/Canvas';
import { PdfCanvas, PdfPlacementInspector } from './_components/PdfCanvas';
import { type PdfTemplate, tryParsePdfTemplate, serializePdfTemplate, emptyPdfTemplate, makeTextPlacement, makeShapePlacement, reorderPlacement } from './_lib/pdf-template';
import { exportPdfTemplateWithValues } from './_lib/pdf-export';
import { RightPanel } from './_components/RightPanel';
import { SwitchTypeModal } from './_components/SwitchTypeModal';
import { FillVariablesModal } from './_components/FillVariablesModal';
import { SlashMenu } from './_components/SlashMenu';

export function ContractEditorContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  // True for /embed/* routes AND for /dashboard/* routes loaded inside the
  // iframe (the user navigated via the sidebar after landing on /dashboard).
  const isEmbed = (pathname?.startsWith('/embed') ?? false) || isEmbedMode();
  const postToHost = useCallback((msg: Record<string, unknown>) => {
    if (!isEmbed || typeof window === 'undefined' || window.parent === window) return;
    const origin = getEmbedReturnOrigin();
    if (!origin) return;
    try { window.parent.postMessage(msg, origin); } catch { /* ignore */ }
  }, [isEmbed]);
  const initialTemplateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';

  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(initialTemplateId);
  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [docBgColor, setDocBgColor] = useState<string>('#ffffff');
  const [floatingImages, setFloatingImages] = useState<FloatingImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [floatingSignatures, setFloatingSignatures] = useState<FloatingSignature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockMeta | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [version, setVersion] = useState(1);

  type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialTemplateId ? 'saved' : 'idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveReadyRef = useRef(false);
  const stateMountedRef = useRef(false);
  const savingRef = useRef(false);
  const pendingAfterSaveRef = useRef(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [modalVars, setModalVars] = useState<string[]>([]);
  const [pendingSwitch, setPendingSwitch] = useState<ContractType | null>(null);

  const [allVars, setAllVars] = useState<Record<string, string[]>>({});
  const [customVarNames, setCustomVarNames] = useState<Set<string>>(new Set());
  const [csvDatasets, setCsvDatasets] = useState<CsvDataset[]>([]);

  // PDF-template mode. When `pdfTemplate` is non-null the editor renders the
  // PDF canvas instead of TipTap and saves a `PdfTemplate` JSON to `content`.
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const isPdfMode = pdfTemplate !== null;

  const [mappingModal, setMappingModal] = useState<{
    filename: string;
    templateVars: string[];
    mapping: Record<string, string | null>;
    sources: Record<string, MappingSource>;
  } | null>(null);
  const [isMappingLoading, setIsMappingLoading] = useState(false);

  const varLabels = useMemo<Record<string, string>>(() => {
    const labels: Record<string, string> = {};
    for (const cat of VARIABLE_PALETTE) {
      for (const v of cat.vars) labels[v.name] = v.label;
    }
    for (const names of Object.values(allVars)) {
      for (const name of names) {
        if (!labels[name]) labels[name] = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    for (const ds of csvDatasets) {
      for (const name of ds.headers) {
        if (!labels[name]) labels[name] = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    return labels;
  }, [allVars, csvDatasets]);

  useEffect(() => {
    if (!user?.tenant_id) return;

    const paletteDefaults = (): Record<string, string[]> => {
      const fb: Record<string, string[]> = {};
      VARIABLE_PALETTE.forEach((c) => { fb[c.label] = c.vars.map((v) => v.name); });
      return fb;
    };

    const merge = (saved: Record<string, string[]>): Record<string, string[]> => {
      const result = paletteDefaults();
      for (const [cat, names] of Object.entries(saved)) {
        if (result[cat]) {
          const existing = new Set(result[cat]);
          const extras = (names as string[]).filter((n) => !existing.has(n));
          if (extras.length) result[cat] = [...result[cat], ...extras];
        } else {
          result[cat] = names as string[];
        }
      }
      return result;
    };

    contractVariables.get()
      .then((data) => {
        if (!data?.variables || Object.keys(data.variables).length === 0) {
          setAllVars(paletteDefaults());
          setCustomVarNames(new Set());
        } else {
          setAllVars(merge(data.variables));
          setCustomVarNames(new Set(data.customNames ?? []));
        }
      })
      .catch(() => {
        setAllVars(paletteDefaults());
        setCustomVarNames(new Set());
      });
  }, [user?.tenant_id]);

  const handleAddVar = useCallback((catLabel: string, name: string) => {
    contractVariables.add({ category: catLabel, name }).catch(console.error);
    setAllVars((prev) => ({ ...prev, [catLabel]: [...(prev[catLabel] ?? []), name] }));
    setCustomVarNames((prev) => new Set([...prev, name]));
  }, []);

  const handleAddImage = useCallback((src: string, naturalW: number, naturalH: number) => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const MM_PER_PX = 25.4 / 96;
    let widthMm = Math.min(naturalW * MM_PER_PX, pageWidthMm * 0.45);
    if (widthMm < 20) widthMm = Math.min(60, pageWidthMm * 0.3);
    const ratio = naturalH > 0 ? naturalH / naturalW : 1;
    const heightMm = widthMm * ratio;
    const x = Math.max(0, (pageWidthMm - widthMm) / 2);
    const y = Math.max(0, Math.min(40, pageHeightMm - heightMm - 10));
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setFloatingImages((prev) => [...prev, { id, src, x, y, width: widthMm, height: heightMm }]);
    setSelectedImageId(id);
  }, []);

  const handleUpdateImage = useCallback((id: string, patch: Partial<FloatingImage>) => {
    setFloatingImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setFloatingImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedImageId((prev) => (prev === id ? null : prev));
  }, []);

  const newSignatureId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddSignedSignature = useCallback((src: string, naturalW: number, naturalH: number) => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const MM_PER_PX = 25.4 / 96;
    let widthMm = Math.min(naturalW * MM_PER_PX, 60);
    if (widthMm < 25) widthMm = 50;
    const ratio = naturalH > 0 ? naturalH / naturalW : 0.5;
    const heightMm = widthMm * ratio;
    const x = Math.max(0, (pageWidthMm - widthMm) / 2);
    const y = Math.max(0, pageHeightMm - heightMm - 40);
    const sig: FloatingSignature = {
      id: newSignatureId(),
      kind: 'signed',
      src,
      x, y, width: widthMm, height: heightMm,
    };
    setFloatingSignatures((prev) => [...prev, sig]);
    setSelectedSignatureId(sig.id);
  }, []);

  const handleAddSignatureField = useCallback((role: string) => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const widthMm = 65;
    const heightMm = 22;
    const x = Math.max(0, (pageWidthMm - widthMm) / 2);
    const y = Math.max(0, pageHeightMm - heightMm - 30);
    const sig: FloatingSignature = {
      id: newSignatureId(),
      kind: 'field',
      role,
      x, y, width: widthMm, height: heightMm,
    };
    setFloatingSignatures((prev) => [...prev, sig]);
    setSelectedSignatureId(sig.id);
  }, []);

  const handleUpdateSignature = useCallback((id: string, patch: Partial<FloatingSignature>) => {
    setFloatingSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const handleRemoveSignature = useCallback((id: string) => {
    setFloatingSignatures((prev) => prev.filter((s) => s.id !== id));
    setSelectedSignatureId((prev) => (prev === id ? null : prev));
  }, []);

  const handleDeleteVar = useCallback((catLabel: string, name: string) => {
    contractVariables.remove(name).catch(console.error);
    setAllVars((prev) => ({ ...prev, [catLabel]: (prev[catLabel] ?? []).filter((n) => n !== name) }));
    setCustomVarNames((prev) => { const s = new Set(prev); s.delete(name); return s; });
  }, []);

  const [slashMenu, setSlashMenu] = useState<{
    query: string; from: number; coords: { top: number; bottom: number; left: number };
  } | null>(null);
  const [usedVars, setUsedVars] = useState<string[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      VariableNode,
      ContractHeader,
      ...ALL_CONTRACT_BLOCKS,
      Underline,
      FontSize,
      TextColor,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Commencez à rédiger votre contrat…' }),
    ],
    content: CONTRACT_TEMPLATES.b2c,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[250mm]',
        spellcheck: 'false',
      },
    },
  });

  const runAiMappingForDataset = useCallback(async (dataset: CsvDataset) => {
    // PDF-template mode keeps its variables in pdfTemplate.placements (the
    // TipTap doc stays empty), so extract from there; otherwise read the doc.
    const templateVars = pdfTemplate
      ? Array.from(new Set(
          pdfTemplate.placements.filter((p) => p.type !== 'text' && p.variableName).map((p) => p.variableName),
        )).sort()
      : editor
        ? extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>)
        : [];
    if (templateVars.length === 0) {
      toast('Aucune variable dans le template — ajoutez-en pour mapper le CSV', { icon: 'ℹ️' });
      return;
    }

    if (dataset.mapping && dataset.mappingSources) {
      setMappingModal({
        filename: dataset.filename,
        templateVars,
        mapping: { ...dataset.mapping },
        sources: { ...dataset.mappingSources },
      });
      return;
    }

    setIsMappingLoading(true);
    const toastId = toast.loading('Analyse IA des colonnes…');
    try {
      const { mapping, sources } = await buildVariableMapping(templateVars, dataset.headers, dataset.rows[0]);
      toast.dismiss(toastId);
      setMappingModal({ filename: dataset.filename, templateVars, mapping, sources });
    } catch {
      toast.error('Échec de l\'analyse IA — assignez manuellement', { id: toastId });
      const emptyMapping: Record<string, string | null> = {};
      const emptySources: Record<string, MappingSource> = {};
      for (const v of templateVars) { emptyMapping[v] = null; emptySources[v] = 'none'; }
      setMappingModal({ filename: dataset.filename, templateVars, mapping: emptyMapping, sources: emptySources });
    } finally {
      setIsMappingLoading(false);
    }
  }, [editor, pdfTemplate]);

  const handleImportCsv = useCallback((filename: string, headers: string[], rows: Record<string, string>[]) => {
    const dataset: CsvDataset = { filename, headers, rows };
    setCsvDatasets((prev) => {
      const filtered = prev.filter((d) => d.filename !== filename);
      return [...filtered, dataset];
    });
    toast.success(`"${filename}" importé : ${headers.length} colonne(s), ${rows.length} ligne(s)`);
    void runAiMappingForDataset(dataset);
  }, [runAiMappingForDataset]);

  const handleEditMapping = useCallback((filename: string) => {
    const ds = csvDatasets.find((d) => d.filename === filename);
    if (ds) void runAiMappingForDataset(ds);
  }, [csvDatasets, runAiMappingForDataset]);

  const confirmMapping = useCallback(() => {
    if (!mappingModal) return;
    const { filename, mapping, sources } = mappingModal;
    setCsvDatasets((prev) => prev.map((d) =>
      d.filename === filename
        ? { ...d, mapping: { ...mapping }, mappingSources: { ...sources } }
        : d,
    ));
    setMappingModal(null);
    toast.success('Mapping enregistré');
  }, [mappingModal]);

  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!initialTemplateId || !editor) return;
    if (loadedFor.current === initialTemplateId) return;
    loadedFor.current = initialTemplateId;
    templates.get(initialTemplateId)
      .then((result: unknown) => {
        const r = result as { template?: { content?: string }; content?: string } | null;
        const tmpl = r?.template ?? r;
        const raw = tmpl?.content ?? '';
        // First branch: is this a PDF template? (kind === 'pdf-template')
        const pdfTpl = tryParsePdfTemplate(raw);
        if (pdfTpl) {
          setPdfTemplate(pdfTpl);
          // Restore the CSV datasets/mappings persisted alongside the PDF template.
          try {
            const parsedPdf = JSON.parse(raw);
            if (Array.isArray(parsedPdf.csvDatasets)) setCsvDatasets(parsedPdf.csvDatasets as CsvDataset[]);
          } catch { /* no datasets */ }
          return;
        }
        // Otherwise: legacy / current TipTap-based contract.
        try {
          const parsed = JSON.parse(raw);
          if (parsed.contractType) setContractType(parsed.contractType as ContractType);
          if (parsed.version) setVersion(parsed.version);
          if (typeof parsed.docBgColor === 'string') setDocBgColor(parsed.docBgColor);
          if (Array.isArray(parsed.floatingImages)) setFloatingImages(parsed.floatingImages as FloatingImage[]);
          if (Array.isArray(parsed.floatingSignatures)) setFloatingSignatures(parsed.floatingSignatures as FloatingSignature[]);
          if (Array.isArray(parsed.csvDatasets)) setCsvDatasets(parsed.csvDatasets as CsvDataset[]);
          if (parsed.doc) {
            editor.commands.setContent(parsed.doc);
            editor.commands.setTextSelection(0);
          }
        } catch { /* keep defaults */ }
      })
      .catch(() => toast.error('Erreur chargement du template'))
      .finally(() => {
        // Defer past React's commit so the setContent-triggered 'update' isn't
        // mistaken for a user edit.
        setTimeout(() => { autosaveReadyRef.current = true; }, 150);
      });
  }, [initialTemplateId, editor]);

  // For brand-new templates (no id in URL), arm autosave shortly after the
  // editor mounts so the very first user keystroke triggers a save.
  useEffect(() => {
    if (!editor || initialTemplateId) return;
    const t = setTimeout(() => { autosaveReadyRef.current = true; }, 250);
    return () => clearTimeout(t);
  }, [editor, initialTemplateId]);

  const loadTemplate = useCallback((type: ContractType) => {
    if (!editor) return;
    if (type === 'blank') {
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
      editor.commands.setTextSelection(0);
      setContractType(type);
      return;
    }
    const tpl = CONTRACT_TEMPLATES[type];
    if (!tpl) return;
    editor.commands.setContent(tpl);
    editor.commands.setTextSelection(0);
    setContractType(type);
  }, [editor]);

  const handleRemoveCsv = useCallback((filename: string) => {
    const ds = csvDatasets.find((d) => d.filename === filename);
    if (!ds) return;

    const headerSet = new Set(ds.headers);

    if (editor) {
      const { state } = editor;
      const varType = state.schema.nodes.variable;
      const toDelete: Array<{ from: number; to: number }> = [];
      const attrsToClear: Array<{ pos: number; newAttrs: Record<string, unknown> }> = [];

      state.doc.descendants((node, pos) => {
        if (varType && node.type === varType && headerSet.has(node.attrs.name)) {
          toDelete.push({ from: pos, to: pos + node.nodeSize });
          return false;
        }
        const attrs = node.attrs as Record<string, unknown>;
        const updated: Record<string, unknown> = {};
        let changed = false;
        for (const [key, val] of Object.entries(attrs)) {
          if (typeof val === 'string' && headerSet.has(val)) { updated[key] = ''; changed = true; }
        }
        if (changed) attrsToClear.push({ pos, newAttrs: { ...attrs, ...updated } });
      });

      if (toDelete.length > 0 || attrsToClear.length > 0) {
        let tr = state.tr;
        for (const { pos, newAttrs } of attrsToClear) {
          tr = tr.setNodeMarkup(pos, undefined, newAttrs);
        }
        for (const { from, to } of [...toDelete].reverse()) {
          tr = tr.delete(tr.mapping.map(from), tr.mapping.map(to));
        }
        editor.view.dispatch(tr);
        toast.success(`"${filename}" supprimé — ${toDelete.length + attrsToClear.length} variable(s) retirée(s) du document`);
      } else {
        toast.success(`"${filename}" supprimé`);
      }
    } else {
      toast.success(`"${filename}" supprimé`);
    }

    setCsvDatasets((prev) => prev.filter((d) => d.filename !== filename));
  }, [csvDatasets, editor]);

  useEffect(() => {
    if (!editor) return;
    const detect = () => {
      const { $from } = editor.state.selection;
      const text = $from.parent.textBetween(0, $from.parentOffset);
      const match = text.match(/\/([^/\n]*)$/);
      if (match) {
        const from = $from.pos - match[0].length;
        try {
          const c = editor.view.coordsAtPos($from.pos);
          setSlashMenu({ query: match[1].toLowerCase(), from, coords: { top: c.top, bottom: c.bottom, left: c.left } });
        } catch { setSlashMenu(null); }
      } else {
        setSlashMenu(null);
      }
    };
    editor.on('update', detect);
    editor.on('selectionUpdate', detect);
    return () => { editor.off('update', detect); editor.off('selectionUpdate', detect); };
  }, [editor]);

  const executeSlashItem = useCallback((item: SlashMenuItem) => {
    if (!editor || !slashMenu) return;
    const to = editor.state.selection.from;
    editor.chain().focus().deleteRange({ from: slashMenu.from, to }).run();
    if (item.type === 'variable') {
      editor.chain().focus().insertContent({ type: 'variable', attrs: { name: item.name, label: varLabels[item.name] ?? null } }).run();
    } else {
      editor.chain().focus().insertContent(item.build()).run();
    }
    setSlashMenu(null);
  }, [editor, slashMenu, varLabels]);

  useEffect(() => {
    if (!editor) return;
    const update = () => setUsedVars(extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>));
    editor.on('update', update);
    update();
    // Wrap in braces so the cleanup returns void (editor.off returns the Editor).
    return () => { editor.off('update', update); };
  }, [editor]);

  const allKnownVarNames = useMemo(() => {
    const s = new Set(Object.values(allVars).flat());
    csvDatasets.forEach((d) => d.headers.forEach((h) => s.add(h)));
    return s;
  }, [allVars, csvDatasets]);
  const undefinedVars = useMemo(() => usedVars.filter((v) => !allKnownVarNames.has(v)), [usedVars, allKnownVarNames]);

  const requestSwitch = useCallback((type: ContractType) => {
    if (type === contractType) return;
    setPendingSwitch(type);
  }, [contractType]);

  const confirmSwitch = useCallback(() => {
    if (!pendingSwitch) return;
    loadTemplate(pendingSwitch);
    setPendingSwitch(null);
    toast.success(`Modèle ${CONTRACT_TYPES[pendingSwitch].label} chargé`);
  }, [pendingSwitch, loadTemplate]);

  const adoptNewTemplateId = useCallback((newId: string) => {
    // Mark this id as already loaded so the URL change below doesn't re-trigger
    // the load effect and clobber edits made while the autosave was in flight.
    loadedFor.current = newId;
    setCurrentTemplateId(newId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', newId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const persistTemplate = useCallback(async (): Promise<boolean> => {
    // PDF mode: payload is the PdfTemplate JSON. Skip the TipTap branch
    // entirely so empty editors don't blow away the saved PDF.
    if (pdfTemplate) {
      // Carry the CSV column→variable mappings alongside the PDF template so
      // the generate page can reuse them (kind stays 'pdf-template', so the
      // parser still recognizes it; the extra field is ignored by PDF consumers).
      const content = JSON.stringify({ ...JSON.parse(serializePdfTemplate(pdfTemplate)), csvDatasets });
      try {
        if (currentTemplateId) {
          await templates.update(currentTemplateId, { name, description, type: 3, content });
        } else {
          const created = await templates.create({ name, description, type: 3, content }) as { id?: string; template?: { id?: string } };
          const newId = created.id ?? created.template?.id ?? null;
          if (newId) adoptNewTemplateId(newId);
        }
        return true;
      } catch {
        return false;
      }
    }

    if (!editor) return false;
    const content = JSON.stringify({
      contractType,
      version,
      docBgColor,
      floatingImages,
      floatingSignatures,
      csvDatasets,
      doc: editor.getJSON(),
    });
    try {
      if (currentTemplateId) {
        await templates.update(currentTemplateId, { name, description, type: 3, content });
      } else {
        const created = await templates.create({ name, description, type: 3, content }) as { id?: string; template?: { id?: string } };
        const newId = created.id ?? created.template?.id ?? null;
        if (newId) adoptNewTemplateId(newId);
      }
      return true;
    } catch {
      return false;
    }
  }, [pdfTemplate, editor, version, contractType, docBgColor, floatingImages, floatingSignatures, csvDatasets, currentTemplateId, name, description, adoptNewTemplateId]);

  // ─── Autosave ─────────────────────────────────────────────────────────────

  const runAutosave = useCallback(async () => {
    if (savingRef.current) { pendingAfterSaveRef.current = true; return; }
    savingRef.current = true;
    setSaveStatus('saving');
    let ok = false;
    try {
      ok = await persistTemplate();
    } finally {
      savingRef.current = false;
    }
    if (ok) {
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      postToHost({ event: 'saved', templateId: currentTemplateId, name });
    } else {
      setSaveStatus('error');
    }
    if (pendingAfterSaveRef.current) {
      pendingAfterSaveRef.current = false;
      // Re-run if more edits arrived during the save.
      void runAutosave();
    }
  }, [persistTemplate, postToHost, currentTemplateId, name]);

  const scheduleAutosave = useCallback(() => {
    if (!autosaveReadyRef.current) return;
    setSaveStatus((s) => (s === 'saving' ? s : 'unsaved'));
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void runAutosave();
    }, 1500);
  }, [runAutosave]);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', scheduleAutosave);
    return () => { editor.off('update', scheduleAutosave); };
  }, [editor, scheduleAutosave]);

  useEffect(() => {
    if (!stateMountedRef.current) { stateMountedRef.current = true; return; }
    scheduleAutosave();
  }, [contractType, docBgColor, floatingImages, floatingSignatures, pdfTemplate, csvDatasets, scheduleAutosave]);

  // Warn before leaving with unsaved changes (debounce timer still pending or save failed).
  useEffect(() => {
    const shouldWarn = () => autosaveTimerRef.current !== null || savingRef.current || saveStatus === 'error' || saveStatus === 'unsaved';
    const handler = (e: BeforeUnloadEvent) => {
      if (!shouldWarn()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  // ─── PDF mode handlers ───────────────────────────────────────────────────

  const handleUploadPdfClick = useCallback(() => {
    pdfFileInputRef.current?.click();
  }, []);

  const handleUploadPdfFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Sélectionnez un fichier PDF');
      return;
    }
    setIsUploadingPdf(true);
    const toastId = toast.loading('Upload du PDF…');
    try {
      const { url } = await media.upload(file);
      setPdfTemplate(emptyPdfTemplate(url, file.name));
      setSelectedPlacementId(null);
      toast.success('PDF chargé', { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec upload PDF', { id: toastId });
    } finally {
      setIsUploadingPdf(false);
    }
  }, []);

  const enterPdfMode = useCallback(() => {
    if (pdfTemplate) return;
    handleUploadPdfClick();
  }, [pdfTemplate, handleUploadPdfClick]);

  const exitPdfMode = useCallback(() => {
    setPdfTemplate(null);
    setSelectedPlacementId(null);
  }, []);

  const handleSave = async () => {
    // Cancel any pending autosave and persist immediately.
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setIsSaving(true);
    setSaveStatus('saving');
    const ok = await persistTemplate();
    setIsSaving(false);
    if (ok) {
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      toast.success('Template enregistré');
      postToHost({ event: 'saved', templateId: currentTemplateId, name });

      const returnUrl = getBuilderReturnUrl();
      if (returnUrl && currentTemplateId) {
        setBuilderReturnUrl(null);
        const sep = returnUrl.includes('?') ? '&' : '?';
        window.location.href = `${returnUrl}${sep}template_id=${encodeURIComponent(currentTemplateId)}`;
      }
    } else {
      setSaveStatus('error');
      toast.error("Échec de l'enregistrement");
    }
  };

  const handleDownloadTemplatePdf = useCallback(async () => {
    // PDF mode: stamp the unsubstituted tokens on a copy of the source PDF so
    // the user gets a "blank template" file showing all the variable slots.
    if (pdfTemplate) {
      setIsGenerating(true);
      const toastId = toast.loading('Génération du PDF…');
      try {
        const values: Record<string, string> = {};
        for (const p of pdfTemplate.placements) values[p.variableName] = `{{${p.variableName}}}`;
        const blob = await exportPdfTemplateWithValues(pdfTemplate, { values });
        triggerDownload(blob, `${name}.pdf`);
        toast.success('Template téléchargé en PDF', { id: toastId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur génération PDF', { id: toastId });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    if (!editor) return;
    setIsGenerating(true);
    const toastId = toast.loading('Génération du PDF…');
    const html = renderTiptapToHtml(editor.getJSON() as Record<string, unknown>, {}, { docName: name, bgColor: docBgColor, floatingImages, floatingSignatures });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/templates/render-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ html, name }),
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      triggerDownload(blob, `${name}.pdf`);
      toast.success('Template téléchargé en PDF', { id: toastId });
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [pdfTemplate, editor, name, docBgColor, floatingImages]);

  const handleGenerate = useCallback(() => {
    if (pdfTemplate) {
      // Static-text placements carry no variable — exclude them from the fill modal.
      const vars = Array.from(new Set(
        pdfTemplate.placements.filter((p) => p.type !== 'text' && p.variableName).map((p) => p.variableName),
      )).sort();
      setModalVars(vars);
      setShowFillModal(true);
      return;
    }
    if (!editor) return;
    const vars = extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>);
    setModalVars(vars);
    setShowFillModal(true);
  }, [pdfTemplate, editor]);

  const confirmGenerate = useCallback(async (values: Record<string, string>) => {
    if (pdfTemplate) {
      setIsGenerating(true);
      const toastId = toast.loading('Génération du PDF…');
      try {
        const blob = await exportPdfTemplateWithValues(pdfTemplate, { values });
        triggerDownload(blob, `${name}.pdf`);
        toast.success('PDF téléchargé', { id: toastId });
        toast.loading('Enregistrement du template…', { id: toastId });
        const saved = await persistTemplate();
        if (saved) {
          toast.success(currentTemplateId ? 'Template mis à jour' : 'Template enregistré', { id: toastId });
          setShowFillModal(false);
          postToHost({ event: 'saved', templateId: currentTemplateId, name });
          if (!isEmbed) router.push('/dashboard/templates');
        } else {
          toast.error("PDF généré, mais l'enregistrement du template a échoué", { id: toastId });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur génération PDF', { id: toastId });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    if (!editor) return;
    setIsGenerating(true);
    const toastId = toast.loading('Génération du PDF…');
    const html = renderTiptapToHtml(editor.getJSON() as Record<string, unknown>, values, { docName: name, bgColor: docBgColor, floatingImages, floatingSignatures });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/templates/render-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ html, name }),
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé', { id: toastId });

      toast.loading('Enregistrement du template…', { id: toastId });
      const saved = await persistTemplate();
      if (saved) {
        toast.success(currentTemplateId ? 'Template mis à jour' : 'Template enregistré', { id: toastId });
        setShowFillModal(false);
        postToHost({ event: 'saved', templateId: currentTemplateId, name });
        if (!isEmbed) router.push('/dashboard/templates');
      } else {
        toast.error("PDF généré, mais l'enregistrement du template a échoué", { id: toastId });
      }
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [pdfTemplate, editor, name, docBgColor, floatingImages, persistTemplate, currentTemplateId, router, isEmbed, postToHost]);

  const typeConfig = CONTRACT_TYPES[contractType];

  const selectedPlacement = useMemo(
    () => pdfTemplate?.placements.find((p) => p.id === selectedPlacementId) ?? null,
    [pdfTemplate, selectedPlacementId],
  );

  const addPdfPlacement = useCallback((placement: PdfTemplate['placements'][number]) => {
    setPdfTemplate((prev) => prev && { ...prev, placements: [...prev.placements, placement] });
    setSelectedPlacementId(placement.id);
  }, []);

  const reorderSelectedPlacement = useCallback((dir: 'front' | 'back' | 'forward' | 'backward') => {
    if (!selectedPlacementId) return;
    setPdfTemplate((prev) => prev && { ...prev, placements: reorderPlacement(prev.placements, selectedPlacementId, dir) });
  }, [selectedPlacementId]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" onClick={() => setShowTypeMenu(false)}>

      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isEmbed) postToHost({ event: 'closed' });
              else router.back();
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} /> {isEmbed ? 'Fermer' : 'Retour'}
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${typeConfig.color}`}
            >
              {typeConfig.label} <ChevronDown size={11} />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((t) => (
                  <button key={t} onClick={() => { requestSwitch(t); setShowTypeMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 ${contractType === t ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {CONTRACT_TYPES[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">v{version}</span>
          <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />

          {/* Mode toggle — switch between TipTap rich-text and PDF overlay. */}
          <div className="ml-2 flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={exitPdfMode}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors ${!isPdfMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              title="Construire depuis zéro"
            >
              <FilePlus size={11} /> Build
            </button>
            <button
              onClick={enterPdfMode}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors border-l border-border ${isPdfMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              title="Importer un PDF et y mapper des variables"
            >
              <FileText size={11} /> PDF
            </button>
          </div>

          <input
            ref={pdfFileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUploadPdfFile}
          />
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <div className="flex items-center gap-2">
          {undefinedVars.length > 0 && (
            <div
              title={`Variables inconnues : ${undefinedVars.join(', ')}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium cursor-default"
            >
              <AlertTriangle size={11} />
              <span>⚠ {undefinedVars.length} variable{undefinedVars.length > 1 ? 's' : ''} non définie{undefinedVars.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50">
            <Save size={13} /> {isSaving ? 'Enregistrement…' : 'Enregistrer template'}
          </button>
          <button onClick={handleDownloadTemplatePdf} disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
            {isGenerating
              ? <><RefreshCw size={13} className="animate-spin" /> Génération…</>
              : <><Download size={13} /> Télécharger template en PDF</>}
          </button>
        </div>
      </div>

      {!isPdfMode && <EditorToolbar editor={editor} selectedBlock={selectedBlock} />}

      <VarLabelsContext.Provider value={varLabels}>
      <div className="flex flex-1 overflow-hidden" onClick={() => setSlashMenu(null)}>
        <VariablePalette
          editor={editor}
          allVars={allVars}
          customVarNames={customVarNames}
          varLabels={varLabels}
          csvDatasets={csvDatasets}
          onAddVar={handleAddVar}
          onDeleteVar={handleDeleteVar}
          onImportCsv={handleImportCsv}
          onRemoveCsv={handleRemoveCsv}
          onEditMapping={handleEditMapping}
          isMappingLoading={isMappingLoading}
        />
        {isPdfMode && pdfTemplate ? (
          <div className="flex-1 overflow-y-auto bg-slate-100">
            <PdfCanvas
              template={pdfTemplate}
              onChange={setPdfTemplate}
              selectedId={selectedPlacementId}
              onSelect={setSelectedPlacementId}
            />
          </div>
        ) : (
          <ContractCanvas
            editor={editor}
            onBlockSelect={setSelectedBlock}
            bgColor={docBgColor}
            floatingImages={floatingImages}
            selectedImageId={selectedImageId}
            onSelectImage={setSelectedImageId}
            onUpdateImage={handleUpdateImage}
            onRemoveImage={handleRemoveImage}
            floatingSignatures={floatingSignatures}
            selectedSignatureId={selectedSignatureId}
            onSelectSignature={setSelectedSignatureId}
            onUpdateSignature={handleUpdateSignature}
            onRemoveSignature={handleRemoveSignature}
          />
        )}
        {isPdfMode ? (
          <div className="w-72 border-l border-border bg-white overflow-y-auto">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">PDF source</div>
              <div className="text-xs text-slate-600 truncate" title={pdfTemplate?.pdfFileName}>
                {pdfTemplate?.pdfFileName || pdfTemplate?.pdfUrl.split('/').pop()}
              </div>
              <button
                onClick={handleUploadPdfClick}
                disabled={isUploadingPdf}
                className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors"
              >
                <Upload size={11} /> {isUploadingPdf ? 'Upload…' : 'Remplacer le PDF'}
              </button>
            </div>
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                Placements ({pdfTemplate?.placements.length ?? 0})
              </div>
              <button
                onClick={() => addPdfPlacement(makeTextPlacement(1))}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-colors"
              >
                <Type size={11} /> Ajouter une zone de texte
              </button>
              <div className="grid grid-cols-3 gap-1 mt-1.5">
                <button
                  onClick={() => addPdfPlacement(makeShapePlacement(1, 'rect'))}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border border-slate-200 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-colors"
                  title="Rectangle"
                >
                  <Square size={12} /> Rect
                </button>
                <button
                  onClick={() => addPdfPlacement(makeShapePlacement(1, 'ellipse'))}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border border-slate-200 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-colors"
                  title="Ellipse"
                >
                  <Circle size={12} /> Ellipse
                </button>
                <button
                  onClick={() => addPdfPlacement(makeShapePlacement(1, 'line'))}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border border-slate-200 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-colors"
                  title="Ligne"
                >
                  <Minus size={12} /> Ligne
                </button>
              </div>
              {(!pdfTemplate || pdfTemplate.placements.length === 0) && (
                <p className="text-[11px] text-slate-400 italic mt-2">
                  Glissez une variable depuis le panneau de gauche, ou ajoutez une zone de texte / forme pour recouvrir le PDF.
                </p>
              )}
            </div>
            {selectedPlacement && pdfTemplate && (
              <div className="px-4 py-3">
                <PdfPlacementInspector
                  placement={selectedPlacement}
                  onChange={(patch) => setPdfTemplate({
                    ...pdfTemplate,
                    placements: pdfTemplate.placements.map((p) =>
                      p.id === selectedPlacement.id ? { ...p, ...patch } : p,
                    ),
                  })}
                  onReorder={reorderSelectedPlacement}
                />
              </div>
            )}
          </div>
        ) : (
          <RightPanel
            docBgColor={docBgColor}
            onChangeDocBgColor={setDocBgColor}
            floatingImages={floatingImages}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onSelectImage={setSelectedImageId}
            selectedImageId={selectedImageId}
            floatingSignatures={floatingSignatures}
            onAddSignedSignature={handleAddSignedSignature}
            onAddSignatureField={handleAddSignatureField}
            onRemoveSignature={handleRemoveSignature}
            onSelectSignature={setSelectedSignatureId}
            selectedSignatureId={selectedSignatureId}
          />
        )}
      </div>
      </VarLabelsContext.Provider>

      {slashMenu && (
        <SlashMenu
          query={slashMenu.query}
          coords={slashMenu.coords}
          allVars={allVars}
          varLabels={varLabels}
          onSelect={executeSlashItem}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {pendingSwitch && (
        <SwitchTypeModal
          fromType={contractType}
          toType={pendingSwitch}
          onConfirm={confirmSwitch}
          onClose={() => setPendingSwitch(null)}
        />
      )}

      {showFillModal && (
        <FillVariablesModal
          variables={modalVars}
          onConfirm={confirmGenerate}
          onClose={() => setShowFillModal(false)}
          isGenerating={isGenerating}
        />
      )}

      <AnimatePresence>
        {mappingModal && (() => {
          const ds = csvDatasets.find((d) => d.filename === mappingModal.filename);
          return (
            <MappingConfirmModal
              templateVars={mappingModal.templateVars}
              fileHeaders={ds?.headers ?? []}
              mapping={mappingModal.mapping}
              sources={mappingModal.sources}
              sampleRow={ds?.rows[0]}
              rowCount={ds?.rows.length ?? 0}
              filename={mappingModal.filename}
              isGenerating={false}
              title="Mapping CSV → Variables du template"
              confirmLabel="Enregistrer le mapping"
              onChange={(templateVar, fileCol) =>
                setMappingModal((prev) =>
                  prev
                    ? {
                        ...prev,
                        mapping: { ...prev.mapping, [templateVar]: fileCol },
                        sources: { ...prev.sources, [templateVar]: fileCol ? prev.sources[templateVar] ?? 'none' : 'none' },
                      }
                    : prev,
                )
              }
              onConfirm={confirmMapping}
              onCancel={() => setMappingModal(null)}
            />
          );
        })()}
      </AnimatePresence>

      <style>{`
        .contract-canvas .tiptap {
          min-height: 250mm;
          outline: none;
        }
        .contract-canvas .tiptap h1 {
          font-size: 14pt; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.5px; margin: 0 0 16px; color: #0f172a;
        }
        .contract-canvas .tiptap h2 {
          font-size: 11pt; font-weight: 700; margin: 20px 0 8px; color: #0f172a;
        }
        .contract-canvas .tiptap h3 {
          font-size: 10.5pt; font-weight: 600; margin: 14px 0 6px; color: #1e293b;
        }
        .contract-canvas .tiptap p {
          font-size: 10pt; line-height: 1.75; margin: 0 0 8px;
        }
        .contract-canvas .tiptap p[style*="text-align: justify"],
        .contract-canvas .tiptap [style*="text-align: justify"] {
          text-align: justify; hyphens: auto;
        }
        .contract-canvas .tiptap ul, .contract-canvas .tiptap ol {
          padding-left: 20px; margin: 4px 0 10px;
        }
        .contract-canvas .tiptap li { line-height: 1.75; margin-bottom: 2px; }
        .contract-canvas .tiptap blockquote {
          border-left: 3px solid #0f172a; padding: 6px 14px;
          margin: 10px 0; background: #f8fafc;
        }
        .contract-canvas .tiptap hr {
          border: none; margin: 4px 0; height: 13px; display: block;
          background: linear-gradient(to bottom, transparent 46%, #e2e8f0 46%, #e2e8f0 54%, transparent 54%);
        }
        .contract-canvas .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; color: #adb5bd; pointer-events: none; height: 0;
        }
        .dragging-variable .contract-canvas [data-variable] {
          outline: 2px dashed #f59e0b;
          outline-offset: 2px;
          cursor: copy;
        }
        .dragging-variable .contract-canvas [data-variable]:hover {
          outline: 2px solid #f59e0b;
          background: #fef3c7 !important;
          color: #92400e !important;
        }
      `}</style>
    </div>
  );
}

export default function ContractEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ContractEditorContent />
    </Suspense>
  );
}

function SaveStatusIndicator({
  status,
  lastSavedAt,
}: {
  readonly status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
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
  // saved
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
