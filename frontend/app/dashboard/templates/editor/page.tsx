"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor } from "@/hooks/use-editor";
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

  const templateName = searchParams.get("name") || "Untitled Template";
  const templateType = parseInt(searchParams.get("type") || "1");
  const templateDescription = searchParams.get("description") || "";
  const templateSubject = searchParams.get("subject") || templateName;

  const [activeTab, setActiveTab] = useState<"canvas" | "code">("canvas");
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [codeValue, setCodeValue] = useState("");
  const [codeWasEdited, setCodeWasEdited] = useState(false);

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

  const handleCreateTemplate = async () => {
    if (editorState.template.rows.length === 0) {
      toast.error("Ajoutez au moins une ligne à votre modèle");
      return;
    }

    setIsSaving(true);
    try {
      const mjml = generateMjml();
      await templates.create({
        name: templateName,
        description: templateDescription,
        type: templateType,
        subject: templateSubject,
        content: mjml,
      });
      toast.success("Modèle créé avec succès !");
      router.push("/dashboard/templates");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Échec de la création du modèle";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deviceWidth =
    previewDevice === "desktop"
      ? "100%"
      : previewDevice === "tablet"
        ? "768px"
        : "375px";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar
        templateName={templateName}
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        previewDevice={previewDevice}
        setPreviewDevice={setPreviewDevice}
        onBack={() => router.push("/dashboard/templates/new")}
        onCreateTemplate={handleCreateTemplate}
        isSaving={isSaving}
        onSave={handleSave}
        onUndo={editorState.undo}
        onRedo={editorState.redo}
        canUndo={editorState.canUndo}
        canRedo={editorState.canRedo}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Center */}
        <div className="flex-1 min-h-0">
          {previewMode ? (
            <div className="h-full overflow-y-auto flex justify-center p-8 bg-muted">
              <div
                className="bg-card shadow-lg rounded-sm h-fit border border-border"
                style={{ width: deviceWidth, maxWidth: "100%" }}
                dangerouslySetInnerHTML={{
                  __html: generatePreviewHtml(editorState.template),
                }}
              />
            </div>
          ) : activeTab === "canvas" ? (
            <Canvas
              template={editorState.template}
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
            />
          ) : (
            <div className="h-full">
              <Editor
                height="100%"
                language="html"
                theme={isDark ? "vs-dark" : "vs-light"}
                value={codeValue}
                onChange={(val) => { setCodeValue(val || ""); setCodeWasEdited(true); }}
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
              onUpdateBlock={editorState.updateBlock}
              onRemoveBlock={editorState.removeBlock}
              onUpdateGlobalStyles={editorState.updateGlobalStyles}
              onDeselectBlock={() => editorState.setSelectedBlockId(null)}
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
    case "heading": {
      const hBg = block.styles.backgroundColor ? ` container-background-color="${block.styles.backgroundColor}"` : '';
      return `        <mj-text font-size="${fontSize}" font-weight="${fontWeight}" color="${color}" align="${block.styles.textAlign}" padding="${block.styles.padding}" font-family="${fontFamily}" line-height="${lineHeight}" letter-spacing="${letterSpacing}"${hBg}>${block.content.text}</mj-text>\n`;
    }
    case "text": {
      const tBg = block.styles.backgroundColor ? ` container-background-color="${block.styles.backgroundColor}"` : '';
      return `        <mj-text font-size="${fontSize}" font-weight="${fontWeight}" color="${color}" align="${block.styles.textAlign}" padding="${block.styles.padding}" font-family="${fontFamily}" line-height="${lineHeight}" letter-spacing="${letterSpacing}"${tBg}>${block.content.text}</mj-text>\n`;
    }
    case "image":
      return `        <mj-image src="${block.content.src}" alt="${block.content.alt}" width="${block.styles.width}" padding="${block.styles.padding}" />\n`;
    case "button": {
      const btnBg = block.styles.backgroundColor || g.btnBackgroundColor;
      const btnColor = block.styles.color || g.btnFontColor;
      const btnSize = block.styles.fontSize || g.btnFontSize;
      const btnRadius = block.styles.borderRadius || g.btnBorderRadius;
      const btnFamily = block.styles.fontFamily || g.btnFontFamily;
      const btnWeight = block.styles.fontWeight || g.btnFontWeight;
      return `        <mj-button background-color="${btnBg}" color="${btnColor}" font-size="${btnSize}" font-weight="${btnWeight}" font-family="${btnFamily}" border-radius="${btnRadius}" href="${block.content.href}" padding="${block.styles.padding}" align="${block.styles.textAlign}">${block.content.text}</mj-button>\n`;
    }
    case "divider":
      return `        <mj-divider border-color="${block.styles.borderColor}" border-width="${block.styles.borderWidth}" padding="${block.styles.padding}" />\n`;
    case "table": {
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      let table = `        <mj-table font-size="${fontSize}" color="${color}" padding="${block.styles.padding}">`;
      table += `<tr>${headers.map((h: string) => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9">${h}</th>`).join("")}</tr>`;
      for (const row of rows) {
        table += `<tr>${row.map((c: string) => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join("")}</tr>`;
      }
      table += `</mj-table>\n`;
      return table;
    }
    case "signature":
      return `        <mj-text padding="${block.styles.padding}" font-size="${fontSize}" color="${color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></mj-text>\n`;
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
    case "heading": {
      const hBg = block.styles.backgroundColor ? `background-color:${block.styles.backgroundColor};` : '';
      return `<div style="${hBg}font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing}">${block.content.text}</div>`;
    }
    case "text": {
      const tBg = block.styles.backgroundColor ? `background-color:${block.styles.backgroundColor};` : '';
      return `<div style="${tBg}font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing}">${block.content.text}</div>`;
    }
    case "image":
      return block.content.src
        ? `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><img src="${block.content.src}" alt="${block.content.alt}" style="width:${block.styles.width};max-width:100%" /></div>`
        : `<div style="background:#f1f5f9;padding:32px;text-align:center;color:#94a3b8;font-size:12px">Pas d'image</div>`;
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
    case "signature":
      return `<div style="padding:${block.styles.padding};font-size:${block.styles.fontSize};color:${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></div>`;
    default:
      return "";
  }
}

// ─── MJML → Template Parser ───
function parseMjmlToTemplate(
  mjml: string,
  currentGlobalStyles: GlobalStyles,
): { rows: Row[]; globalStyles: GlobalStyles } | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mjml, "text/xml");

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
        const block = parseBlockFromElement(tag, child);
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

function parseBlockFromElement(tag: string, el: Element): BlockData | null {
  const id = uuid();

  if (tag === "mj-text") {
    const fontSize = el.getAttribute("font-size") || "";
    const fontWeight = el.getAttribute("font-weight") || "";
    const color = el.getAttribute("color") || "";
    const align = el.getAttribute("align") || "left";
    const padding = el.getAttribute("padding") || "10px";
    const text = el.textContent || "";

    // Detect signature by content pattern
    if (el.innerHTML.includes("border-top:1px solid")) {
      const nameMatch = el.innerHTML.match(/font-weight:bold">(.*?)<\/p>/);
      const titleMatch = el.innerHTML.match(/color:#64748b">(.*?)<\/p>/);
      return {
        id,
        type: "signature",
        content: { name: nameMatch?.[1] || "", title: titleMatch?.[1] || "" },
        styles: { fontSize, color, padding },
      };
    }

    // Heading = has font-weight bold + larger intent
    const isHeading = fontWeight === "bold" || fontWeight === "700";
    const bgColor = el.getAttribute("container-background-color") || "";
    return {
      id,
      type: isHeading ? "heading" : "text",
      content: { text },
      styles: { fontSize, fontWeight, color, textAlign: align, padding, backgroundColor: bgColor },
    };
  }

  if (tag === "mj-image") {
    return {
      id,
      type: "image",
      content: {
        src: el.getAttribute("src") || "",
        alt: el.getAttribute("alt") || "Image",
      },
      styles: {
        width: el.getAttribute("width") || "100%",
        padding: el.getAttribute("padding") || "10px",
        textAlign: "center",
      },
    };
  }

  if (tag === "mj-button") {
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
        borderRadius: el.getAttribute("border-radius") || "",
        padding: el.getAttribute("padding") || "12px 24px",
        textAlign: el.getAttribute("align") || "center",
        fontFamily: "",
        fontWeight: "",
        borderSize: "",
        borderColor: "",
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

    return {
      id,
      type: "table",
      content: { headers, rows },
      styles: {
        fontSize: el.getAttribute("font-size") || "",
        color: el.getAttribute("color") || "",
        padding: el.getAttribute("padding") || "10px",
      },
    };
  }

  return null;
}
