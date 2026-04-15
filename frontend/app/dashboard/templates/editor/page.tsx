"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor } from "@/hooks/use-editor";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useAuth } from "@/context/auth";
import EditorToolbar from "@/components/editor/EditorToolbar";
import Canvas from "@/components/editor/Canvas";
import RightPanel from "@/components/editor/RightPanel";
import toast from "react-hot-toast";
import { templates } from "@/lib/api";
import {
  BlockType,
  BlockData,
  TemplateData,
  GlobalStyles,
  Row,
  Column,
} from "@/lib/editor-types";
import { v4 as uuid } from "uuid";
import Editor from "@monaco-editor/react";

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorState = useEditor();
  const { user } = useAuth();

  // Edit mode: ?id=xxx loads existing template
  // Create mode: ?name=xxx&type=1 creates a new one
  const editId = searchParams.get("id");
  const isEditMode = !!editId;

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

  const generateMjml = useCallback(() => {
    const { rows, globalStyles } = editorState.template;
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

  // Sync code ↔ canvas when switching tabs
  const handleTabSwitch = useCallback(
    (tab: "canvas" | "code") => {
      if (tab === "code") {
        // Going to code → generate fresh MJML from canvas state
        setCodeValue(generateMjml());
        setCodeWasEdited(false);
      } else if (tab === "canvas" && codeValue && codeWasEdited) {
        // Going to canvas → only parse if user actually edited the code
        try {
          const parsed = parseMjmlToTemplate(
            codeValue,
            editorState.template.globalStyles,
          );
          if (parsed) {
            editorState.setTemplate({
              ...editorState.template,
              rows: parsed.rows,
              globalStyles: parsed.globalStyles,
            });
          }
        } catch {
          toast.error("Impossible d'analyser le MJML");
        }
        setCodeWasEdited(false);
      }
      setActiveTab(tab);
    },
    [generateMjml, codeValue, codeWasEdited, editorState],
  );

  const handleSave = async () => {
    toast.success("Brouillon enregistré !");
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
    if (editorState.template.rows.length === 0) {
      toast.error("Ajoutez au moins une ligne à votre modèle");
      return;
    }

    setIsSaving(true);
    try {
      const mjml = generateMjml();
      const body = {
        name: templateName,
        description: templateDescription,
        type: templateType,
        subject: templateSubject,
        content: mjml,
      };

      if (isEditMode && editId) {
        await templates.update(editId, body);
        toast.success("Modèle enregistré !");
      } else {
        await templates.create(body);
        toast.success("Modèle créé avec succès !");
      }
      router.push("/dashboard/templates");
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
        onBack={() => router.push(isEditMode ? "/dashboard/templates" : "/dashboard/templates/new")}
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
        {/* Center */}
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
            <div className="h-full">
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
          )}
        </div>

        {/* Right Panel */}
        {!previewMode && (
          <div className="w-[320px] flex-shrink-0">
            <RightPanel
              selectedBlock={editorState.getSelectedBlock()}
              globalStyles={editorState.template.globalStyles}
              onAddRow={editorState.addRow}
              onAddBlock={editorState.addBlock}
              onAddBlockToNewRow={editorState.addBlockToNewRow}
              onAddSection={editorState.addSection}
              onUpdateBlock={editorState.updateBlock}
              onRemoveBlock={editorState.removeBlock}
              onUpdateGlobalStyles={editorState.updateGlobalStyles}
              onDeselectBlock={() => editorState.setSelectedBlockId(null)}
              onAiGenerate={(mjml: string) => {
                try {
                  const parsed = parseMjmlToTemplate(mjml, editorState.template.globalStyles);
                  if (parsed) {
                    editorState.setTemplate({
                      ...editorState.template,
                      rows: [...editorState.template.rows, ...parsed.rows],
                      globalStyles: { ...editorState.template.globalStyles, ...parsed.globalStyles },
                    });
                    toast.success('Modèle IA ajouté au canevas !');
                  } else {
                    toast.error('Impossible de parser le MJML généré');
                  }
                } catch {
                  toast.error('Erreur lors du parsing du MJML');
                }
              }}
              activeColumnId={activeColumnId}
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

// ─── Block to MJML ───

function blockToMjml(block: BlockData, g: GlobalStyles) {
  // Resolve empty block styles to global defaults
  const color = block.styles.color || g.textColor;
  const fontSize = block.styles.fontSize || g.fontSize;
  const fontWeight = block.styles.fontWeight || g.fontWeight;
  const fontFamily = block.styles.fontFamily || g.fontFamily;
  const lineHeight = block.styles.lineHeight || g.lineHeight;
  const letterSpacing = block.styles.letterSpacing || '0px';

  switch (block.type) {
    case "heading":
    case "text": {
      const bg = block.styles.backgroundColor ? ` container-background-color="${block.styles.backgroundColor}"` : '';
      const isItalic = block.styles.fontStyle === 'italic';
      const isUnderline = block.styles.textDecoration === 'underline';
      let textContent = block.content.text as string;
      // Wrap with inline styles for italic/underline since MJML doesn't support these as attributes
      if (isItalic || isUnderline) {
        const inlineStyles: string[] = [];
        if (isItalic) inlineStyles.push('font-style:italic');
        if (isUnderline) inlineStyles.push('text-decoration:underline');
        textContent = `<span style="${inlineStyles.join(';')}">${textContent}</span>`;
      }
      // Store fontStyle and textDecoration as css-class markers for the parser
      const markers: string[] = [];
      if (isItalic) markers.push('italic');
      if (isUnderline) markers.push('underline');
      const cssClass = markers.length > 0 ? ` css-class="${markers.join(' ')}"` : '';
      return `        <mj-text font-size="${fontSize}" font-weight="${fontWeight}" color="${color}" align="${block.styles.textAlign}" padding="${block.styles.padding}" font-family="${fontFamily}" line-height="${lineHeight}" letter-spacing="${letterSpacing}"${bg}${cssClass}>${textContent}</mj-text>\n`;
    }
    case "image": {
      const imgBr = block.styles.borderRadius || '0px';
      const imgBs = block.styles.borderSize || '0px';
      const imgBst = block.styles.borderStyle || 'solid';
      const imgBc = block.styles.borderColor || 'transparent';
      const imgBorder = imgBs !== '0px' ? ` border="${imgBs} ${imgBst} ${imgBc}"` : '';
      const imgAlign = block.styles.textAlign || 'center';
      const imgHref = block.content.href ? ` href="${block.content.href}"` : '';
      const imgHeight = block.styles.height && block.styles.height !== 'auto' ? ` css-class="h:${block.styles.height}"` : '';
      return `        <mj-image src="${block.content.src}" alt="${block.content.alt}" width="${block.styles.width}" height="${block.styles.height || 'auto'}" padding="${block.styles.padding}" border-radius="${imgBr}" align="${imgAlign}"${imgBorder}${imgHref}${imgHeight} />\n`;
    }
    case "button": {
      const btnBg = block.styles.backgroundColor || g.btnBackgroundColor;
      const btnColor = block.styles.color || g.btnFontColor;
      const btnSize = block.styles.fontSize || g.btnFontSize;
      const btnRadius = block.styles.borderRadius || g.btnBorderRadius;
      const btnFamily = block.styles.fontFamily || g.btnFontFamily;
      const btnWeight = block.styles.fontWeight || g.btnFontWeight;
      const btnBorderSize = block.styles.borderSize || g.btnBorderSize || '0px';
      const btnBorderColor = block.styles.borderColor || g.btnBorderColor || 'transparent';
      const btnBorder = btnBorderSize !== '0px' ? ` border="${btnBorderSize} solid ${btnBorderColor}"` : '';
      const btnLh = block.styles.lineHeight || g.lineHeight;
      const btnLs = block.styles.letterSpacing || '0px';
      const btnW = block.styles.btnWidth && block.styles.btnWidth !== 'auto' ? ` width="${block.styles.btnWidth}"` : '';
      return `        <mj-button background-color="${btnBg}" color="${btnColor}" font-size="${btnSize}" font-weight="${btnWeight}" font-family="${btnFamily}" border-radius="${btnRadius}" href="${block.content.href}" padding="${block.styles.padding}" align="${block.styles.textAlign}" line-height="${btnLh}" letter-spacing="${btnLs}"${btnBorder}${btnW}>${block.content.text}</mj-button>\n`;
    }
    case "divider": {
      const divStyle = block.styles.borderStyle || 'solid';
      const divWidth = block.styles.width || '100%';
      const divAlign = block.styles.textAlign || 'center';
      return `        <mj-divider border-color="${block.styles.borderColor || '#e2e8f0'}" border-width="${block.styles.borderWidth || '1px'}" border-style="${divStyle}" width="${divWidth}" align="${divAlign}" padding="${block.styles.padding || '10px 0'}" />\n`;
    }
    case "table": {
      const tHeaders = (block.content.headers || []) as string[];
      const tRows = (block.content.rows || []) as string[][];
      const tBorderColor = block.styles.tableBorderColor || '#dddddd';
      const tHeaderBg = block.styles.headerBg || '#f1f5f9';
      let table = `        <mj-table font-size="${fontSize}" color="${color}" padding="${block.styles.padding}" css-class="tb:${tBorderColor}:${tHeaderBg}">`;
      table += `<tr>${tHeaders.map((h: string) => `<th style="border:1px solid ${tBorderColor};padding:8px;background:${tHeaderBg}">${h}</th>`).join("")}</tr>`;
      for (const row of tRows) {
        table += `<tr>${row.map((c: string) => `<td style="border:1px solid ${tBorderColor};padding:8px">${c}</td>`).join("")}</tr>`;
      }
      table += `</mj-table>\n`;
      return table;
    }
    case "video": {
      const vSrc = block.content.src as string || '';
      const vCover = block.content.cover as string || '';
      const vBr = block.styles.borderRadius || '0px';
      const vW = block.styles.width || '100%';
      const vPad = block.styles.padding || '10px';
      // Use data-video-src and data-video-type as custom attributes to preserve video info
      // mj-image css-class is used as a marker for the parser
      const ytMatch = vSrc.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const ytId = ytMatch ? ytMatch[1] : null;
      if (ytId) {
        return `        <mj-image css-class="video-block" src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="video:youtube:${vSrc}" href="https://www.youtube.com/watch?v=${ytId}" width="${vW}" padding="${vPad}" border-radius="${vBr}" />\n`;
      }
      if (vSrc) {
        const imgSrc = vCover || '';
        return `        <mj-image css-class="video-block" src="${imgSrc}" alt="video:upload:${vSrc}" href="${vSrc}" width="${vW}" padding="${vPad}" border-radius="${vBr}" />\n`;
      }
      return '';
    }
    case "signature": {
      const sigLineColor = block.styles.lineColor || '#000000';
      const sigLineWidth = block.styles.lineWidth || '200px';
      const sigAlign = block.styles.textAlign || 'left';
      const sigEmail = block.content.email ? `<p style="margin:2px 0 0;opacity:0.6;font-size:0.8em">${block.content.email}</p>` : '';
      const sigPhone = block.content.phone ? `<p style="margin:2px 0 0;opacity:0.6;font-size:0.8em">${block.content.phone}</p>` : '';
      const sigTitle = block.content.title ? `<p style="margin:2px 0 0;opacity:0.7;font-size:0.85em">${block.content.title}</p>` : '';
      return `        <mj-text padding="${block.styles.padding}" font-size="${fontSize}" color="${color}" align="${sigAlign}" css-class="sig:${sigLineColor}:${sigLineWidth}"><div style="border-top:1px solid ${sigLineColor};width:${sigLineWidth};margin-bottom:8px;${sigAlign === 'center' ? 'margin-left:auto;margin-right:auto' : sigAlign === 'right' ? 'margin-left:auto' : ''}"></div><p style="margin:0;font-weight:bold">${block.content.name}</p>${sigTitle}${sigEmail}${sigPhone}</mj-text>\n`;
    }
    default:
      return "";
  }
}

// ─── Preview HTML Generator ───
function generatePreviewHtml(template: TemplateData): string {
  const { rows, globalStyles } = template;
  const padding = globalStyles.paddingGroup
    ? globalStyles.paddingTop
    : `${globalStyles.paddingTop} ${globalStyles.paddingRight} ${globalStyles.paddingBottom} ${globalStyles.paddingLeft}`;
  const bgImage = globalStyles.backgroundImage
    ? `background-image:url(${globalStyles.backgroundImage});background-size:${globalStyles.backgroundSize === "repeat" ? "auto" : globalStyles.backgroundSize};background-repeat:${globalStyles.backgroundSize === "repeat" ? "repeat" : "no-repeat"};background-position:center;`
    : "";

  let html = `<div style="background-color:${globalStyles.bodyColor};font-family:${globalStyles.fontFamily};color:${globalStyles.textColor};font-size:${globalStyles.fontSize};font-weight:${globalStyles.fontWeight};line-height:${globalStyles.lineHeight};direction:${globalStyles.textDirection};max-width:${globalStyles.width};margin:0 auto;padding:${padding};${bgImage}">`;

  for (const row of rows) {
    const rowBg =
      row.styles.backgroundColor === "transparent"
        ? ""
        : `background-color:${row.styles.backgroundColor};`;
    html += `<div style="${rowBg}padding:${row.styles.padding};">`;
    html += `<div style="display:flex;">`;
    for (const col of row.columns) {
      html += `<div style="width:${col.width};box-sizing:border-box;">`;
      for (const block of col.blocks) {
        html += blockToHtml(block, globalStyles);
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  }

  html += `</div>`;
  return html;
}

function blockToHtml(block: BlockData, globalStyles: GlobalStyles): string {
  const color = block.styles.color || globalStyles.textColor;
  const fontSize = block.styles.fontSize || globalStyles.fontSize;
  const fontWeight = block.styles.fontWeight || globalStyles.fontWeight;
  const fontFamily = block.styles.fontFamily || globalStyles.fontFamily;
  const lineHeight = block.styles.lineHeight || globalStyles.lineHeight;
  const letterSpacing = block.styles.letterSpacing || "0px";

  switch (block.type) {
    case "heading":
    case "text": {
      const txtBg = block.styles.backgroundColor ? `background-color:${block.styles.backgroundColor};` : '';
      const txtItalic = block.styles.fontStyle === 'italic' ? 'font-style:italic;' : '';
      const txtUnderline = block.styles.textDecoration === 'underline' ? 'text-decoration:underline;' : '';
      return `<div style="${txtBg}${txtItalic}${txtUnderline}font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing}">${block.content.text}</div>`;
    }
    case "image": {
      const pBr = block.styles.borderRadius || '0px';
      const pBs = block.styles.borderSize || '0px';
      const pBst = block.styles.borderStyle || 'solid';
      const pBc = block.styles.borderColor || 'transparent';
      const pBorder = pBs !== '0px' ? `border:${pBs} ${pBst} ${pBc};` : '';
      const pCircle = pBr === '50%' ? 'aspect-ratio:1/1;object-fit:cover;' : '';
      const pAlign = block.styles.textAlign || 'center';
      const pMargin = pAlign === 'center' ? 'margin:0 auto;' : pAlign === 'right' ? 'margin-left:auto;' : '';
      return block.content.src
        ? `<div style="padding:${block.styles.padding}"><img src="${block.content.src}" alt="${block.content.alt}" style="display:block;width:${block.styles.width};max-width:100%;height:${block.styles.height || 'auto'};${block.styles.height && block.styles.height !== 'auto' ? 'object-fit:cover;' : ''}border-radius:${pBr};${pBorder}${pCircle}${pMargin}" /></div>`
        : `<div style="background:#f1f5f9;padding:32px;text-align:center;color:#94a3b8;font-size:12px">Pas d'image</div>`;
    }
    case "button":
      return `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><a href="${block.content.href}" style="display:inline-block;background-color:${block.styles.backgroundColor || globalStyles.btnBackgroundColor};color:${block.styles.color || globalStyles.btnFontColor};font-size:${block.styles.fontSize || globalStyles.btnFontSize};font-family:${block.styles.fontFamily || globalStyles.btnFontFamily};font-weight:${block.styles.fontWeight || globalStyles.btnFontWeight};padding:${block.styles.padding};border-radius:${block.styles.borderRadius || globalStyles.btnBorderRadius};border:${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor};text-decoration:none">${block.content.text}</a></div>`;
    case "divider":
      return `<hr style="border-color:${block.styles.borderColor};border-width:${block.styles.borderWidth};margin:${block.styles.padding} 0" />`;
    case "table": {
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      let t = `<table style="width:100%;border-collapse:collapse;font-size:${fontSize};color:${color};padding:${block.styles.padding}">`;
      t += `<tr>${headers.map((h: string) => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9;text-align:left">${h}</th>`).join("")}</tr>`;
      for (const row of rows) {
        t += `<tr>${row.map((c: string) => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join("")}</tr>`;
      }
      t += `</table>`;
      return t;
    }
    case "video": {
      const vSrc = block.content.src as string || '';
      const vYtMatch = vSrc.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const vYtId = vYtMatch ? vYtMatch[1] : null;
      const vWidth = block.styles.width || '100%';
      const vAlign = block.styles.textAlign || 'center';
      const vRadius = block.styles.borderRadius || '0px';
      if (vYtId) {
        return `<div style="text-align:${vAlign};padding:${block.styles.padding}"><div style="width:${vWidth};max-width:100%;margin:${vAlign === 'center' ? '0 auto' : '0'};border-radius:${vRadius};overflow:hidden;position:relative;padding-bottom:56.25%;height:0"><iframe src="https://www.youtube.com/embed/${vYtId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div>`;
      }
      if (vSrc) {
        const vCover = block.content.cover as string;
        if (vCover) {
          return `<div style="text-align:${vAlign};padding:${block.styles.padding}"><div style="position:relative;width:${vWidth};max-width:100%;margin:${vAlign === 'center' ? '0 auto' : '0'};border-radius:${vRadius};overflow:hidden"><img src="${vCover}" style="width:100%;display:block" /><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)"><div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:14px solid #0f172a;border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:3px"></div></div></div></div></div>`;
        }
        return `<div style="text-align:${vAlign};padding:${block.styles.padding}"><video src="${vSrc}" style="width:${vWidth};max-width:100%;border-radius:${vRadius}" controls></video></div>`;
      }
      return '';
    }
    case "signature":
      return `<div style="padding:${block.styles.padding};font-size:${block.styles.fontSize};color:${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></div>`;
    default:
      return "";
  }
}

// ─── Sanitize MJML for XML parsing ───
// HTML entities like &nbsp; and inline HTML inside mj-text break XML parsing.
// We extract text content, replace it with a safe placeholder, parse XML, then restore.
function sanitizeMjmlForXml(mjml: string): { sanitized: string; textMap: Map<string, string> } {
  const textMap = new Map<string, string>();
  let counter = 0;

  // Extract content between mj-text tags and replace with safe placeholder
  const sanitized = mjml.replace(
    /(<mj-text[^>]*>)([\s\S]*?)(<\/mj-text>)/g,
    (_match, openTag, content, closeTag) => {
      const key = `__MJML_TEXT_${counter++}__`;
      textMap.set(key, content);
      return `${openTag}${key}${closeTag}`;
    }
  );

  return { sanitized, textMap };
}

// ─── MJML → Template Parser ───
function parseMjmlToTemplate(
  mjml: string,
  currentGlobalStyles: GlobalStyles,
): { rows: Row[]; globalStyles: GlobalStyles } | null {
  const { sanitized, textMap } = sanitizeMjmlForXml(mjml);
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, "text/xml");

  // Check for XML parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    console.warn("MJML XML parse error, falling back to regex parser");
    return null;
  }

  const body = doc.querySelector("mj-body");
  if (!body) return null;

  const globalStyles = { ...currentGlobalStyles };
  const bgColor = body.getAttribute("background-color");
  const width = body.getAttribute("width");
  if (bgColor) globalStyles.bodyColor = bgColor;
  if (width) globalStyles.width = width;

  const rows: Row[] = [];
  const sections = body.querySelectorAll("mj-section");

  sections.forEach((section) => {
    const columns: Column[] = [];
    const mjCols = section.querySelectorAll("mj-column");
    const colCount = mjCols.length || 1;

    mjCols.forEach((mjCol) => {
      const blocks: BlockData[] = [];

      for (const child of Array.from(mjCol.children)) {
        const tag = child.tagName.toLowerCase();
        const block = parseBlockFromElement(tag, child, textMap);
        if (block) blocks.push(block);
      }

      columns.push({
        id: uuid(),
        width: mjCol.getAttribute("width") || `${(100 / colCount).toFixed(2)}%`,
        blocks,
      });
    });

    // Determine layout from column count
    let layout = "100";
    if (colCount === 2) layout = "50-50";
    else if (colCount === 3) layout = "33-33-33";
    else if (colCount === 4) layout = "25-25-25-25";

    rows.push({
      id: uuid(),
      layout: layout as Row["layout"],
      columns,
      styles: {
        backgroundColor:
          section.getAttribute("background-color") || "transparent",
        padding: section.getAttribute("padding") || "10px 0",
      },
    });
  });

  return { rows, globalStyles };
}

// Parse MJML border attribute "2px solid #000" into separate style props
function parseBorderAttr(border: string): Record<string, string> {
  if (!border) return {};
  const parts = border.trim().split(/\s+/);
  if (parts.length >= 3) {
    return { borderSize: parts[0], borderStyle: parts[1], borderColor: parts.slice(2).join(' ') };
  }
  if (parts.length === 2) {
    return { borderSize: parts[0], borderStyle: parts[1] };
  }
  if (parts.length === 1 && parts[0] !== '0px' && parts[0] !== '0') {
    return { borderSize: parts[0] };
  }
  return {};
}

function parseBlockFromElement(tag: string, el: Element, textMap?: Map<string, string>): BlockData | null {
  const id = uuid();

  if (tag === "mj-text") {
    const fontSize = el.getAttribute("font-size") || "";
    const fontWeight = el.getAttribute("font-weight") || "";
    const color = el.getAttribute("color") || "";
    const align = el.getAttribute("align") || "left";
    const padding = el.getAttribute("padding") || "10px";
    // Restore original text content from the textMap (was replaced with placeholder for XML safety)
    let rawText = el.textContent || "";
    if (textMap) {
      for (const [key, original] of textMap) {
        if (rawText.includes(key)) {
          rawText = original;
          break;
        }
      }
    }
    const text = rawText;

    // Detect signature by content pattern or css-class marker
    const sigCssClass = el.getAttribute("css-class") || "";
    if (text.includes("border-top:1px solid") || sigCssClass.startsWith("sig:")) {
      const nameMatch = text.match(/font-weight:bold">(.*?)<\/p>/);
      const titleMatch = text.match(/font-size:0\.85em">(.*?)<\/p>/);
      // Extract 0.8em matches for email and phone
      const smallMatches = [...text.matchAll(/font-size:0\.8em">(.*?)<\/p>/g)];
      const sigAlign = el.getAttribute("align") || "left";
      // Parse sig:lineColor:lineWidth from css-class
      const sigMarker = sigCssClass.match(/^sig:(#[0-9a-fA-F]{6}):(.+)$/);
      return {
        id,
        type: "signature",
        content: {
          name: nameMatch?.[1] || "",
          title: titleMatch?.[1] || "",
          email: smallMatches[0]?.[1] || "",
          phone: smallMatches[1]?.[1] || "",
        },
        styles: {
          fontSize, color, padding,
          textAlign: sigAlign,
          lineColor: sigMarker ? sigMarker[1] : "#000000",
          lineWidth: sigMarker ? sigMarker[2] : "200px",
        },
      };
    }

    // Heading = has font-weight bold + larger intent
    const isHeading = fontWeight === "bold" || fontWeight === "700";
    const bgColor = el.getAttribute("container-background-color") || "";
    const cssClass = el.getAttribute("css-class") || "";
    const fontStyle = cssClass.includes("italic") ? "italic" : "normal";
    const textDecoration = cssClass.includes("underline") ? "underline" : "none";
    // Strip only our italic/underline formatting wrapper spans.
    // Keep all other HTML (like background-color spans from the editor).
    let cleanText = text;
    // Remove our formatting wrapper: <span style="font-style:italic">...</span> etc
    cleanText = cleanText.replace(/<span style="(?:font-style:italic|text-decoration:underline|font-style:italic;text-decoration:underline|text-decoration:underline;font-style:italic)">([\s\S]*?)<\/span>/g, '$1');
    return {
      id,
      type: isHeading ? "heading" : "text",
      content: { text: cleanText },
      styles: {
        fontSize, fontWeight, fontStyle, textDecoration, color,
        textAlign: align, padding, backgroundColor: bgColor,
        fontFamily: el.getAttribute("font-family") || "",
        lineHeight: el.getAttribute("line-height") || "",
        letterSpacing: el.getAttribute("letter-spacing") || "",
      },
    };
  }

  if (tag === "mj-image") {
    const alt = el.getAttribute("alt") || "";
    const videoMatch = alt.match(/^video:(youtube|upload):(.+)$/);
    if (videoMatch) {
      const videoType = videoMatch[1];
      const videoSrc = videoMatch[2];
      const cover = el.getAttribute("src") || "";
      return {
        id,
        type: "video",
        content: { src: videoSrc, type: videoType, cover },
        styles: {
          width: el.getAttribute("width") || "100%",
          padding: el.getAttribute("padding") || "10px",
          textAlign: "center",
          borderRadius: el.getAttribute("border-radius") || "0px",
        },
      };
    }
    return {
      id,
      type: "image",
      content: {
        src: el.getAttribute("src") || "",
        alt,
        href: el.getAttribute("href") || "",
      },
      styles: {
        width: el.getAttribute("width") || "100%",
        height: el.getAttribute("height") || "auto",
        padding: el.getAttribute("padding") || "10px",
        textAlign: el.getAttribute("align") || "center",
        borderRadius: el.getAttribute("border-radius") || "0px",
        ...parseBorderAttr(el.getAttribute("border") || ""),
      },
    };
  }

  if (tag === "mj-button") {
    const btnBorderAttr = el.getAttribute("border") || "";
    const btnBorderParts = parseBorderAttr(btnBorderAttr);
    return {
      id,
      type: "button",
      content: {
        text: el.textContent || "Button",
        href: el.getAttribute("href") || "#",
      },
      styles: {
        backgroundColor: el.getAttribute("background-color") || "",
        color: el.getAttribute("color") || "",
        fontSize: el.getAttribute("font-size") || "",
        fontWeight: el.getAttribute("font-weight") || "",
        fontFamily: el.getAttribute("font-family") || "",
        borderRadius: el.getAttribute("border-radius") || "",
        padding: el.getAttribute("padding") || "12px 24px",
        textAlign: el.getAttribute("align") || "center",
        lineHeight: el.getAttribute("line-height") || "",
        letterSpacing: el.getAttribute("letter-spacing") || "",
        btnWidth: el.getAttribute("width") || "auto",
        ...btnBorderParts,
      },
    };
  }

  if (tag === "mj-divider") {
    return {
      id,
      type: "divider",
      content: {},
      styles: {
        borderColor: el.getAttribute("border-color") || "#e2e8f0",
        borderWidth: el.getAttribute("border-width") || "1px",
        borderStyle: el.getAttribute("border-style") || "solid",
        width: el.getAttribute("width") || "100%",
        textAlign: el.getAttribute("align") || "center",
        padding: el.getAttribute("padding") || "10px 0",
      },
    };
  }

  if (tag === "mj-table") {
    const html = el.innerHTML;
    const headerMatch = html.match(/<tr>(.*?)<\/tr>/);
    const headers: string[] = [];
    const rows: string[][] = [];

    if (headerMatch) {
      const thMatches = headerMatch[1].matchAll(/<th[^>]*>(.*?)<\/th>/g);
      for (const m of thMatches) headers.push(m[1]);
    }

    const allRows = html.matchAll(/<tr>(.*?)<\/tr>/g);
    let first = true;
    for (const rowMatch of allRows) {
      if (first) {
        first = false;
        continue;
      } // skip header row
      const cells: string[] = [];
      const tdMatches = rowMatch[1].matchAll(/<td[^>]*>(.*?)<\/td>/g);
      for (const m of tdMatches) cells.push(m[1]);
      if (cells.length) rows.push(cells);
    }

    // Parse table colors from css-class marker "tb:borderColor:headerBg"
    const tbClass = el.getAttribute("css-class") || "";
    const tbMatch = tbClass.match(/^tb:(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6})$/);
    return {
      id,
      type: "table",
      content: { headers, rows },
      styles: {
        fontSize: el.getAttribute("font-size") || "",
        color: el.getAttribute("color") || "",
        padding: el.getAttribute("padding") || "10px",
        tableBorderColor: tbMatch ? tbMatch[1] : "#dddddd",
        headerBg: tbMatch ? tbMatch[2] : "#f1f5f9",
      },
    };
  }

  return null;
}


