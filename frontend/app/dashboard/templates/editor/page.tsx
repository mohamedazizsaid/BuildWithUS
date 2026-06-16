"use client";

// Uses useSearchParams — render on demand instead of static prerender.
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useLayoutEffect, useRef, Suspense } from "react";
import { flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor } from "@/hooks/use-editor";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useAuth } from "@/context/auth";
import EditorToolbar from "@/components/editor/EditorToolbar";
import Canvas from "@/components/editor/Canvas";
import { LeftPanel, PropertiesPanel } from "@/components/editor/RightPanel";
import { useAiChatState } from "@/components/editor/ai-chat/useAiChatState";
import toast from "react-hot-toast";
import { templates, getBuilderReturnUrl, setBuilderReturnUrl } from "@/lib/api";
import {
  BlockType,
  TemplateData,
} from "@/lib/editor-types";
import { PREDEFINED_TEMPLATES } from "@/lib/predefined-templates";
import Editor from "@monaco-editor/react";
import { blockToMjml, generatePreviewHtml } from "./_lib/mjml-builder";
import { parseMjmlToTemplate } from "./_lib/mjml-parser";

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorState = useEditor();
  const { user } = useAuth();
  // AI chat conversation state — owned here (a stable, always-mounted parent)
  // so the history survives switching to Preview/Code and back to the AI tab.
  const aiChat = useAiChatState();

  // Edit mode: ?id=xxx loads existing template
  // Preset mode: ?preset=newsletter-classique pre-loads a predefined template
  // Create mode: ?name=xxx&type=1 creates a new one
  const editId   = searchParams.get("id");
  const presetId = searchParams.get("preset");
  // Marketing-only: creating a brand-new predefined gallery entry inside a category.
  const predefinedCategory = searchParams.get("predefinedCategory");
  // Start a NEW personal template from an existing one's content (no edit, no flag).
  const cloneFrom = searchParams.get("cloneFrom");
  const isEditMode = !!editId;
  // Tracks the saved template ID — starts from URL param, updated after first silent save
  const [savedId, setSavedId] = useState<string | null>(editId);

  const [templateName, setTemplateName] = useState(searchParams.get("name") || "Sans titre");
  const [templateType, setTemplateType] = useState(parseInt(searchParams.get("type") || "1"));
  const [templateDescription, setTemplateDescription] = useState(searchParams.get("description") || "");
  const [templateSubject, setTemplateSubject] = useState(searchParams.get("subject") || "");
  const [isLoading, setIsLoading] = useState(isEditMode);

  const [activeTab, setActiveTab] = useState<"canvas" | "code">("canvas");
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [editDevice, setEditDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [codeValue, setCodeValue] = useState("");
  const [codeWasEdited, setCodeWasEdited] = useState(false);

  // ── Real-time collaboration
  const { otherUsers, updateCursor } = useCollaboration({
    templateId: editId,
    tenantId: user?.tenant_id ?? '',
    userId: user?.id ?? '',
    userName: user ? `${user.first_name} ${user.last_name}`.trim() : 'Anonyme',
    template: editorState.template,
    onRemoteUpdate: editorState.applyRemoteTemplate,
  });

  // Load existing template in edit mode
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;

    const loadTemplate = async () => {
      try {
        const data = await templates.get(editId);
        if (cancelled) return;
        const tmpl = data.template || data;

        setTemplateName(tmpl.name || "Sans titre");
        setTemplateType(tmpl.type || 1);
        setTemplateDescription(tmpl.description || "");
        setTemplateSubject(tmpl.subject || "");

        // Parse MJML content back into canvas blocks
        if (tmpl.content) {
          const parsed = parseMjmlToTemplate(tmpl.content, editorState.template.globalStyles);
          if (parsed) {
            editorState.setTemplate({
              ...editorState.template,
              rows: parsed.rows,
              globalStyles: parsed.globalStyles,
            });
          }
        }
      } catch {
        toast.error("Échec du chargement du modèle");
        router.push("/dashboard/templates");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadTemplate();
    return () => { cancelled = true; };
  }, [editId]);

  // Preset mode — load predefined template rows directly (no API call needed)
  useEffect(() => {
    if (!presetId) return;
    const preset = PREDEFINED_TEMPLATES.find(t => t.id === presetId);
    if (!preset) return;
    editorState.setTemplate({
      ...editorState.template,
      rows: preset.rows(),
    });
    // Pre-fill name and subject from preset (URL params take precedence if set)
    if (!searchParams.get("name"))    setTemplateName(preset.name);
    if (!searchParams.get("subject")) setTemplateSubject(preset.subject);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  // Clone mode — load an existing template's content into a fresh, unsaved canvas.
  // Used by "Utiliser ce template" on a tenant predefined entry: it spawns a NEW
  // personal model (no edit-in-place, no predefined flag).
  useEffect(() => {
    if (!cloneFrom) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await templates.get(cloneFrom);
        if (cancelled) return;
        const tmpl = data.template || data;
        if (tmpl.content) {
          const parsed = parseMjmlToTemplate(tmpl.content, editorState.template.globalStyles);
          if (parsed) {
            editorState.setTemplate({
              ...editorState.template,
              rows: parsed.rows,
              globalStyles: parsed.globalStyles,
            });
          }
        }
        if (!searchParams.get("name")) setTemplateName(`${tmpl.name || "Modèle"} (copie)`);
        if (!searchParams.get("subject")) setTemplateSubject(tmpl.subject || "");
      } catch {
        toast.error("Échec du chargement du template");
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneFrom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editorState.undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        editorState.redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorState]);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Mirror of editorState.template that's always up-to-date — readable from
  // event handlers whose closure may still hold the previous render's state.
  // Updated via useLayoutEffect so flushSync(...) inside a child's onBlur
  // makes the latest text immediately visible to the very next click handler.
  const templateRef = useRef(editorState.template);
  useLayoutEffect(() => {
    templateRef.current = editorState.template;
  }, [editorState.template]);

  // Force any focused contenteditable to commit its buffered text BEFORE the
  // save reads state. Wrapping blur() in flushSync makes the onBlur handler's
  // setState apply synchronously, so the useLayoutEffect above refreshes
  // templateRef on the same tick — before generateMjml runs.
  const flushPendingEdits = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && (active as HTMLElement & { isContentEditable: boolean }).isContentEditable) {
      flushSync(() => {
        active.blur();
      });
    }
  }, []);

  const generateMjml = useCallback((override?: TemplateData) => {
    const src = override ?? editorState.template;
    const { rows, globalStyles } = src;
    let mjml = `<mjml>\n  <mj-body background-color="${globalStyles.bodyColor}" width="${globalStyles.width}">\n`;

    for (const row of rows) {
      mjml += `    <mj-section background-color="${row.styles.backgroundColor}" padding="${row.styles.padding}">\n`;
      for (const col of row.columns) {
        mjml += `      <mj-column width="${col.width}">\n`;
        for (const block of col.blocks) {
          mjml += blockToMjml(block, globalStyles);
        }
        mjml += `      </mj-column>\n`;
      }
      mjml += `    </mj-section>\n`;
    }

    mjml += `  </mj-body>\n</mjml>`;
    return mjml;
  }, [editorState.template]);

  // Parse the code editor's MJML into the canvas. Returns true on success.
  const applyCodeToCanvas = useCallback((): boolean => {
    if (!codeValue.trim()) {
      toast.error("Le code est vide");
      return false;
    }
    let parsed: ReturnType<typeof parseMjmlToTemplate> = null;
    try {
      parsed = parseMjmlToTemplate(codeValue, editorState.template.globalStyles);
    } catch {
      parsed = null;
    }
    if (parsed && parsed.rows.length > 0) {
      editorState.setTemplate({
        ...editorState.template,
        rows: parsed.rows,
        globalStyles: parsed.globalStyles,
      });
      setCodeWasEdited(false);
      return true;
    }
    toast.error("MJML invalide ou structure non reconnue");
    return false;
  }, [codeValue, editorState]);

  // Sync code ↔ canvas when switching tabs
  const handleTabSwitch = useCallback(
    (tab: "canvas" | "code") => {
      if (tab === "code") {
        // Going to code → regenerate from canvas ONLY if the user hasn't typed/
        // pasted unsaved code (otherwise we'd clobber what they just pasted).
        if (!codeWasEdited) {
          setCodeValue(generateMjml());
        }
      } else if (tab === "canvas" && codeValue && codeWasEdited) {
        // Going to canvas → apply edited code; stay on Code if it can't be parsed
        // so the user doesn't silently lose their work.
        if (!applyCodeToCanvas()) {
          toast.error("Restez en mode Code pour corriger le MJML");
          return;
        }
      }
      setActiveTab(tab);
    },
    [generateMjml, codeValue, codeWasEdited, applyCodeToCanvas],
  );

  const handleSave = async () => {
    if (editorState.template.rows.length === 0 && !(activeTab === "code" && codeValue.trim())) {
      toast.error("Ajoutez au moins une ligne à votre modèle");
      return;
    }
    setIsSaving(true);
    try {
      // Commit any in-flight contenteditable text into React state before reading it.
      flushPendingEdits();
      // If the user edited/pasted MJML in the Code tab, that is the source of truth.
      const mjml = activeTab === "code" && codeWasEdited && codeValue.trim()
        ? codeValue
        : generateMjml(templateRef.current);
      const body = {
        name: templateName,
        description: templateDescription,
        type: templateType,
        // Email templates require a subject. For a predefined entry the user only
        // fills the title, so use it as the subject when none was set.
        subject: templateSubject || (predefinedCategory ? templateName : templateSubject),
        content: mjml,
        ...(predefinedCategory && !savedId ? { isPredefinedOverride: true, predefinedTemplateId: predefinedCategory } : {}),
      };
      let resultId: string | null = savedId;
      if (savedId) {
        await templates.update(savedId, body);
        toast.success("Brouillon enregistré !");
      } else {
        const created = await templates.create(body);
        resultId = created.id ?? created.template?.id ?? null;
        setSavedId(resultId);
        toast.success("Brouillon enregistré !");
      }

      const returnUrl = getBuilderReturnUrl();
      if (returnUrl && resultId) {
        setBuilderReturnUrl(null);
        const sep = returnUrl.includes('?') ? '&' : '?';
        window.location.href = `${returnUrl}${sep}template_id=${encodeURIComponent(resultId)}`;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Échec de l'enregistrement";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestEmail = async () => {
    if (editorState.template.rows.length === 0) {
      toast.error("Ajoutez du contenu avant de tester");
      return;
    }
    setIsSendingTest(true);
    try {
      const html = generatePreviewHtml(editorState.template);
      const result = await templates.sendTestEmail({
        subject: templateSubject || templateName,
        content: html,
      });
      if (result.success) {
        toast.success("E-mail de test envoyé ! Vérifiez MailHog (localhost:8025)");
      } else {
        toast.error(result.message || "Échec de l'envoi");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'envoi";
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveOrCreate = async () => {
    if (editorState.template.rows.length === 0 && !(activeTab === "code" && codeValue.trim())) {
      toast.error("Ajoutez au moins une ligne à votre modèle");
      return;
    }

    setIsSaving(true);
    try {
      flushPendingEdits();
      // If the user edited/pasted MJML in the Code tab, that is the source of truth.
      const mjml = activeTab === "code" && codeWasEdited && codeValue.trim()
        ? codeValue
        : generateMjml(templateRef.current);
      const body = {
        name: templateName,
        description: templateDescription,
        type: templateType,
        // Email templates require a subject. For a predefined entry the user only
        // fills the title, so use it as the subject when none was set.
        subject: templateSubject || (predefinedCategory ? templateName : templateSubject),
        content: mjml,
        ...(predefinedCategory && !isEditMode ? { isPredefinedOverride: true, predefinedTemplateId: predefinedCategory } : {}),
      };

      let resultId: string | null = isEditMode ? editId : null;
      if (isEditMode && editId) {
        await templates.update(editId, body);
        toast.success(predefinedCategory ? "Template prédéfini enregistré !" : "Modèle enregistré !");
      } else {
        const created = await templates.create(body);
        resultId = created.id ?? created.template?.id ?? null;
        toast.success(
          predefinedCategory
            ? "Template prédéfini créé !"
            : presetId
              ? "Nouveau modèle créé à partir du template prédéfini !"
              : "Modèle créé avec succès !",
        );
      }

      const returnUrl = getBuilderReturnUrl();
      if (returnUrl && resultId) {
        setBuilderReturnUrl(null);
        const sep = returnUrl.includes('?') ? '&' : '?';
        window.location.href = `${returnUrl}${sep}template_id=${encodeURIComponent(resultId)}`;
        return;
      }

      // Predefined creation/edit returns to the gallery; personal copies (preset/clone) go to Mes modèles.
      const backToPredefinis = !!predefinedCategory || searchParams.get("from") === "predifinis";
      router.push(backToPredefinis ? "/dashboard/templates?view=predifinis" : "/dashboard/templates");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Échec de l'enregistrement";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Chargement du modèle...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar
        templateName={templateName}
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        previewDevice={previewDevice}
        setPreviewDevice={setPreviewDevice}
        editDevice={editDevice}
        setEditDevice={setEditDevice}
        onBack={() => {
          const fromPredefinis = presetId || predefinedCategory || cloneFrom || searchParams.get("from") === "predifinis";
          router.push(
            fromPredefinis
              ? "/dashboard/templates?view=predifinis"
              : isEditMode
                ? "/dashboard/templates"
                : "/dashboard/templates/new",
          );
        }}
        onCreateTemplate={handleSaveOrCreate}
        isSaving={isSaving}
        isEditMode={isEditMode}
        onSave={handleSave}
        onUndo={editorState.undo}
        onRedo={editorState.redo}
        canUndo={editorState.canUndo}
        canRedo={editorState.canRedo}
        selectedBlock={editorState.getSelectedBlock()}
        onUpdateBlock={editorState.updateBlock}
        onSendTestEmail={handleSendTestEmail}
        isSendingTest={isSendingTest}
        collaborators={otherUsers}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {!previewMode && (
          <div className="shrink-0">
            <LeftPanel
              onAddRow={editorState.addRow}
              onAddBlock={editorState.addBlock}
              onAddBlockToNewRow={editorState.addBlockToNewRow}
              onAddSection={editorState.addSection}
              onAiApply={(mjml: string) => {
                // Chat returns the FULL updated template each turn — replace the
                // canvas rows wholesale (not append) so iterative edits apply cleanly.
                try {
                  const parsed = parseMjmlToTemplate(mjml, editorState.template.globalStyles);
                  if (parsed) {
                    editorState.setTemplate({
                      ...editorState.template,
                      rows: parsed.rows,
                      globalStyles: { ...editorState.template.globalStyles, ...parsed.globalStyles },
                    });
                  } else {
                    toast.error('Impossible de parser le MJML généré');
                  }
                } catch {
                  toast.error('Erreur lors du parsing du MJML');
                }
              }}
              getCurrentMjml={generateMjml}
              activeColumnId={activeColumnId}
              aiChat={aiChat}
            />
          </div>
        )}

        {/* Center — Canvas */}
        <div className="flex-1 min-h-0">
          {previewMode ? (
            <div className="h-full overflow-y-auto flex justify-center items-start p-8 bg-muted/50"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            >
              <div className="flex flex-col items-center">
                {/* Device frame */}
                {previewDevice === 'mobile' ? (
                  <div className="relative">
                    <div className="w-[375px] rounded-[2.5rem] border-[8px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden">
                      {/* Notch */}
                      <div className="flex justify-center pt-2 pb-3 bg-slate-800">
                        <div className="w-28 h-5 bg-slate-900 rounded-full" />
                      </div>
                      {/* Screen */}
                      <div className="bg-white overflow-y-auto" style={{ height: '667px' }}>
                        <div
                          dangerouslySetInnerHTML={{ __html: generatePreviewHtml(editorState.template) }}
                        />
                      </div>
                      {/* Bottom bar */}
                      <div className="flex justify-center py-2 bg-slate-800">
                        <div className="w-32 h-1 bg-slate-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                ) : previewDevice === 'tablet' ? (
                  <div className="relative">
                    <div className="w-[768px] rounded-[1.5rem] border-[6px] border-slate-700 bg-slate-700 shadow-2xl overflow-hidden">
                      {/* Camera dot */}
                      <div className="flex justify-center py-2 bg-slate-700">
                        <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
                      </div>
                      {/* Screen */}
                      <div className="bg-white overflow-y-auto" style={{ height: '900px' }}>
                        <div
                          dangerouslySetInnerHTML={{ __html: generatePreviewHtml(editorState.template) }}
                        />
                      </div>
                      <div className="py-2 bg-slate-700" />
                    </div>
                  </div>
                ) : (
                  /* Desktop */
                  <div className="relative w-full max-w-[900px]">
                    <div className="rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 flex items-center gap-2 px-4 py-2.5">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="bg-white rounded-md px-4 py-1 text-[11px] text-slate-400 border border-slate-200 w-72 text-center truncate">
                          mail.example.com/preview
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-b-xl shadow-lg overflow-y-auto" style={{ maxHeight: '70vh' }}>
                      <div
                        dangerouslySetInnerHTML={{ __html: generatePreviewHtml(editorState.template) }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "canvas" ? (
            <Canvas
              template={editorState.template}
              editDevice={editDevice}
              selectedBlockId={editorState.selectedBlockId}
              selectedRowId={editorState.selectedRowId}
              onSelectBlock={editorState.setSelectedBlockId}
              onSelectRow={editorState.setSelectedRowId}
              onSelectColumn={setActiveColumnId}
              onRemoveRow={editorState.removeRow}
              onRemoveBlock={editorState.removeBlock}
              onDuplicateBlock={editorState.duplicateBlock}
              onUpdateBlock={editorState.updateBlock}
              onAddRow={editorState.addRow}
              onReorderRows={editorState.reorderRows}
              onReorderBlocks={editorState.reorderBlocks}
              onDropBlock={(columnId, blockType) =>
                editorState.addBlock(columnId, blockType as BlockType)
              }
              onDropBlockToCanvas={(blockType) =>
                editorState.addBlockToNewRow(blockType as BlockType)
              }
              onDropSection={(sectionId) => {
                import('@/lib/editor-sections').then(({ SECTIONS }) => {
                  const section = SECTIONS.find((s: { id: string }) => s.id === sectionId);
                  if (section) editorState.addSection(section.rows());
                });
              }}
              onDropStockImage={(url) => editorState.addStockImageToNewRow(url)}
              collaborators={otherUsers}
              onCursorMove={updateCursor}
            />
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 shrink-0">
                <p className="text-xs text-muted-foreground">
                  Collez votre MJML puis cliquez sur <span className="font-medium text-foreground">Appliquer</span> pour le voir dans le canvas.
                </p>
                <button
                  onClick={applyCodeToCanvas}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Appliquer au canvas
                </button>
              </div>
              <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language="html"
                theme={isDark ? "vs-dark" : "vs-light"}
                value={codeValue}
                onChange={(val) => { setCodeValue(val || ""); setCodeWasEdited(true); }}
                onMount={(editor) => {
                  // Suppress Firefox Monaco hit-test bug
                  const origError = console.error;
                  console.error = (...args) => {
                    if (typeof args[0] === 'string' && args[0].includes('offsetNode')) return;
                    origError.apply(console, args);
                  };
                  editor.onDidDispose(() => { console.error = origError; });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                }}
              />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Properties */}
        {!previewMode && (
          <div className="shrink-0">
            <PropertiesPanel
              selectedBlock={editorState.getSelectedBlock()}
              selectedRow={editorState.template.rows.find((r) => r.id === editorState.selectedRowId) ?? null}
              globalStyles={editorState.template.globalStyles}
              onUpdateBlock={editorState.updateBlock}
              onRemoveBlock={editorState.removeBlock}
              onUpdateGlobalStyles={editorState.updateGlobalStyles}
              onUpdateRowStyles={editorState.updateRowStyles}
              onDeselectBlock={() => editorState.setSelectedBlockId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Chargement de l&apos;éditeur...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
