'use client';

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft, Save, Download, RefreshCw, ChevronDown,
  AlertTriangle, FileDown,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { templates, contractVariables } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { VariableNode, extractVariablesFromTiptap, renderTiptapToHtml } from '@/lib/tiptap/variable-node';
import { buildVariableMapping, applyMapping, type MappingSource } from '@/lib/variable-mapper';
import { MappingConfirmModal } from '@/components/contract/MappingConfirmModal';
import { VarLabelsContext } from '@/lib/tiptap/var-labels-context';
import { ContractHeader } from '@/lib/tiptap/contract-header';
import { ALL_CONTRACT_BLOCKS } from '@/lib/tiptap/contract-blocks';
import { CONTRACT_TEMPLATES, VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';

import { CONTRACT_TYPES, type ContractType, type SlashMenuItem, type CsvDataset, type BlockMeta } from './_lib/types';
import { VariablePalette } from './_components/VariablePalette';
import { EditorToolbar } from './_components/EditorToolbar';
import { ContractCanvas } from './_components/Canvas';
import { RightPanel } from './_components/RightPanel';
import { SwitchTypeModal } from './_components/SwitchTypeModal';
import { FillVariablesModal } from './_components/FillVariablesModal';
import { SlashMenu } from './_components/SlashMenu';

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const templateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';
  const isEditMode = !!templateId;

  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [selectedBlock, setSelectedBlock] = useState<BlockMeta | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [version, setVersion] = useState(1);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [modalVars, setModalVars] = useState<string[]>([]);
  const [pendingSwitch, setPendingSwitch] = useState<ContractType | null>(null);

  const [allVars, setAllVars] = useState<Record<string, string[]>>({});
  const [customVarNames, setCustomVarNames] = useState<Set<string>>(new Set());
  const [csvDatasets, setCsvDatasets] = useState<CsvDataset[]>([]);

  const [mappingModal, setMappingModal] = useState<{
    dataset: CsvDataset;
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

  const handleDeleteVar = useCallback((catLabel: string, name: string) => {
    contractVariables.remove(name).catch(console.error);
    setAllVars((prev) => ({ ...prev, [catLabel]: (prev[catLabel] ?? []).filter((n) => n !== name) }));
    setCustomVarNames((prev) => { const s = new Set(prev); s.delete(name); return s; });
  }, []);

  const handleImportCsv = useCallback((filename: string, headers: string[], rows: Record<string, string>[]) => {
    setCsvDatasets((prev) => {
      const filtered = prev.filter((d) => d.filename !== filename);
      return [...filtered, { filename, headers, rows }];
    });
    toast.success(`"${filename}" importé : ${headers.length} colonne(s), ${rows.length} ligne(s)`);
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

  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!templateId || !editor) return;
    if (loadedFor.current === templateId) return;
    loadedFor.current = templateId;
    templates.get(templateId)
      .then((result: unknown) => {
        const r = result as { template?: { content?: string }; content?: string } | null;
        const tmpl = r?.template ?? r;
        try {
          const parsed = JSON.parse(tmpl?.content ?? '');
          if (parsed.contractType) setContractType(parsed.contractType as ContractType);
          if (parsed.version) setVersion(parsed.version);
          if (parsed.doc) {
            editor.commands.setContent(parsed.doc);
            editor.commands.setTextSelection(0);
          }
        } catch { /* keep defaults */ }
      })
      .catch(() => toast.error('Erreur chargement du template'));
  }, [templateId, editor]);

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
    return () => editor.off('update', update);
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

  const persistTemplate = useCallback(async (): Promise<boolean> => {
    if (!editor) return false;
    const newVersion = version + 1;
    const content = JSON.stringify({
      contractType,
      version: newVersion,
      doc: editor.getJSON(),
    });
    try {
      if (isEditMode && templateId) {
        await templates.update(templateId, { name, description, type: 3, content });
      } else {
        await templates.create({ name, description, type: 3, content });
      }
      setVersion(newVersion);
      return true;
    } catch {
      return false;
    }
  }, [editor, version, contractType, isEditMode, templateId, name, description]);

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await persistTemplate();
    setIsSaving(false);
    if (ok) {
      toast.success('Template enregistré');
      router.push('/dashboard/templates');
    } else {
      toast.error("Échec de l'enregistrement");
    }
  };

  const handleDownloadTemplatePdf = useCallback(async () => {
    if (!editor) return;
    setIsGenerating(true);
    const toastId = toast.loading('Génération du PDF…');
    const html = renderTiptapToHtml(editor.getJSON() as Record<string, unknown>, {}, { docName: name });
    try {
      const res = await fetch('http://localhost:3000/templates/render-pdf', {
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
      toast.success('Template téléchargé en PDF', { id: toastId });
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [editor, name]);

  const handleGenerate = useCallback(() => {
    if (!editor) return;
    const vars = extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>);
    setModalVars(vars);
    setShowFillModal(true);
  }, [editor]);

  const confirmGenerate = useCallback(async (values: Record<string, string>) => {
    if (!editor) return;
    setIsGenerating(true);
    const toastId = toast.loading('Génération du PDF…');
    const html = renderTiptapToHtml(editor.getJSON() as Record<string, unknown>, values, { docName: name });
    try {
      const res = await fetch('http://localhost:3000/templates/render-pdf', {
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
        toast.success(isEditMode ? 'Template mis à jour' : 'Template enregistré', { id: toastId });
        setShowFillModal(false);
        router.push('/dashboard/templates');
      } else {
        toast.error("PDF généré, mais l'enregistrement du template a échoué", { id: toastId });
      }
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [editor, name, persistTemplate, isEditMode, router]);

  const handleBatchCsvPdf = useCallback(async () => {
    if (!editor || csvDatasets.length === 0) {
      toast.error('Importez d\'abord un CSV depuis le panneau de gauche');
      return;
    }
    const dataset = csvDatasets[csvDatasets.length - 1];
    if (dataset.rows.length === 0) {
      toast.error('Le CSV ne contient aucune ligne de données');
      return;
    }

    const templateVars = extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>);
    if (templateVars.length === 0) {
      toast.error('Aucune variable détectée dans le template');
      return;
    }

    setIsMappingLoading(true);
    const toastId = toast.loading('Analyse IA des colonnes…');
    try {
      const { mapping, sources } = await buildVariableMapping(
        templateVars,
        dataset.headers,
        dataset.rows[0],
      );
      toast.dismiss(toastId);
      setMappingModal({ dataset, templateVars, mapping, sources });
    } catch {
      toast.error('Échec de l\'analyse IA — assignez manuellement', { id: toastId });
      const emptyMapping: Record<string, string | null> = {};
      const emptySources: Record<string, MappingSource> = {};
      for (const v of templateVars) {
        emptyMapping[v] = null;
        emptySources[v] = 'none';
      }
      setMappingModal({ dataset, templateVars, mapping: emptyMapping, sources: emptySources });
    } finally {
      setIsMappingLoading(false);
    }
  }, [editor, csvDatasets]);

  const confirmAndGenerateBatch = useCallback(async () => {
    if (!editor || !mappingModal) return;
    const { dataset, mapping } = mappingModal;
    const { rows, filename } = dataset;
    const baseName = filename.replace(/\.csv$/i, '');

    setIsGenerating(true);
    const toastId = toast.loading(`Génération de ${rows.length} PDF(s)…`);
    const docJson = editor.getJSON() as Record<string, unknown>;

    let success = 0;
    for (let i = 0; i < rows.length; i++) {
      const mappedValues = applyMapping(rows[i], mapping);
      const html = renderTiptapToHtml(docJson, mappedValues, { docName: `${name}_${i + 1}` });
      try {
        const res = await fetch('http://localhost:3000/templates/render-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ html, name: `${baseName}_${i + 1}` }),
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_${i + 1}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        success++;
        toast.loading(`Génération… ${i + 1}/${rows.length}`, { id: toastId });
        if (i < rows.length - 1) await new Promise((r) => setTimeout(r, 250));
      } catch { /* skip failed row */ }
    }

    setIsGenerating(false);
    setMappingModal(null);
    if (success === rows.length) {
      toast.success(`${success} PDF(s) générés depuis "${filename}"`, { id: toastId });
    } else {
      toast.error(`${success}/${rows.length} PDF(s) générés (échecs sur certaines lignes)`, { id: toastId });
    }
  }, [editor, mappingModal, name]);

  const typeConfig = CONTRACT_TYPES[contractType];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" onClick={() => setShowTypeMenu(false)}>

      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Retour
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
          {csvDatasets.length > 0 && (
            <button
              onClick={handleBatchCsvPdf}
              disabled={isGenerating || isMappingLoading}
              title={`Générer un PDF par ligne de ${csvDatasets[csvDatasets.length - 1].filename} (${csvDatasets[csvDatasets.length - 1].rows.length} lignes)`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
            >
              {isMappingLoading
                ? <><RefreshCw size={13} className="animate-spin" /> Analyse…</>
                : <><FileDown size={13} /> CSV → PDF</>}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-700/40 text-[10px]">
                {csvDatasets[csvDatasets.length - 1].rows.length}
              </span>
            </button>
          )}
          <button onClick={handleDownloadTemplatePdf} disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
            {isGenerating
              ? <><RefreshCw size={13} className="animate-spin" /> Génération…</>
              : <><Download size={13} /> Télécharger template en PDF</>}
          </button>
        </div>
      </div>

      <EditorToolbar editor={editor} selectedBlock={selectedBlock} />

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
        />
        <ContractCanvas editor={editor} onBlockSelect={setSelectedBlock} />
        <RightPanel
          contractType={contractType}
          onSwitchType={requestSwitch}
        />
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
        {mappingModal && (
          <MappingConfirmModal
            templateVars={mappingModal.templateVars}
            fileHeaders={mappingModal.dataset.headers}
            mapping={mappingModal.mapping}
            sources={mappingModal.sources}
            sampleRow={mappingModal.dataset.rows[0]}
            rowCount={mappingModal.dataset.rows.length}
            filename={mappingModal.dataset.filename}
            isGenerating={isGenerating}
            onChange={(templateVar, fileCol) =>
              setMappingModal((prev) =>
                prev ? { ...prev, mapping: { ...prev.mapping, [templateVar]: fileCol } } : prev,
              )
            }
            onConfirm={confirmAndGenerateBatch}
            onCancel={() => setMappingModal(null)}
          />
        )}
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
