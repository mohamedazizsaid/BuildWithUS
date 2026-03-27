'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor } from '@/hooks/use-editor';
import EditorToolbar from '@/components/editor/EditorToolbar';
import Canvas from '@/components/editor/Canvas';
import RightPanel from '@/components/editor/RightPanel';
import toast from 'react-hot-toast';
import { templates } from '@/lib/api';
import { BlockType } from '@/lib/editor-types';
import Editor from '@monaco-editor/react';

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorState = useEditor();

  const templateName = searchParams.get('name') || 'Untitled Template';
  const templateType = parseInt(searchParams.get('type') || '1');
  const templateDescription = searchParams.get('description') || '';
  const templateSubject = searchParams.get('subject') || templateName;

  const [activeTab, setActiveTab] = useState<'canvas' | 'code'>('canvas');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editorState.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        editorState.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState]);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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

  const handleSave = async () => {
    toast.success('Template draft saved!');
  };

  const handleCreateTemplate = async () => {
    if (editorState.template.rows.length === 0) {
      toast.error('Add at least one row to your template');
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
      toast.success('Template created successfully!');
      router.push('/dashboard/templates');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create template';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deviceWidth = previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar
        templateName={templateName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        previewDevice={previewDevice}
        setPreviewDevice={setPreviewDevice}
        onBack={() => router.push('/dashboard/templates/new')}
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
                style={{ width: deviceWidth, maxWidth: '100%' }}
                dangerouslySetInnerHTML={{
                  __html: generatePreviewHtml(editorState.template),
                }}
              />
            </div>
          ) : activeTab === 'canvas' ? (
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
              onDropBlock={(columnId, blockType) => editorState.addBlock(columnId, blockType as BlockType)}
              onDropBlockToCanvas={(blockType) => editorState.addBlockToNewRow(blockType as BlockType)}
              activeColumnId={activeColumnId}
            />
          ) : (
            <div className="h-full">
              <Editor
                height="100%"
                language="html"
                theme={isDark ? 'vs-dark' : 'vs-light'}
                value={generateMjml()}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  readOnly: true,
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}

// ─── Block to MJML ───
import { BlockData, TemplateData, GlobalStyles } from '@/lib/editor-types';

function blockToMjml(block: BlockData, globalStyles: { textColor: string; fontFamily: string }) {
  switch (block.type) {
    case 'heading':
      return `        <mj-text font-size="${block.styles.fontSize}" font-weight="${block.styles.fontWeight}" color="${block.styles.color || globalStyles.textColor}" align="${block.styles.textAlign}" padding="${block.styles.padding}" font-family="${globalStyles.fontFamily}">${block.content.text}</mj-text>\n`;
    case 'text':
      return `        <mj-text font-size="${block.styles.fontSize}" color="${block.styles.color || globalStyles.textColor}" align="${block.styles.textAlign}" padding="${block.styles.padding}" font-family="${globalStyles.fontFamily}">${block.content.text}</mj-text>\n`;
    case 'image':
      return `        <mj-image src="${block.content.src}" alt="${block.content.alt}" width="${block.styles.width}" padding="${block.styles.padding}" />\n`;
    case 'button':
      return `        <mj-button background-color="${block.styles.backgroundColor}" color="${block.styles.color}" font-size="${block.styles.fontSize}" border-radius="${block.styles.borderRadius}" href="${block.content.href}" padding="${block.styles.padding}" align="${block.styles.textAlign}">${block.content.text}</mj-button>\n`;
    case 'divider':
      return `        <mj-divider border-color="${block.styles.borderColor}" border-width="${block.styles.borderWidth}" padding="${block.styles.padding}" />\n`;
    case 'table': {
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      let table = `        <mj-table font-size="${block.styles.fontSize}" color="${block.styles.color}" padding="${block.styles.padding}">`;
      table += `<tr>${headers.map((h: string) => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9">${h}</th>`).join('')}</tr>`;
      for (const row of rows) {
        table += `<tr>${row.map((c: string) => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join('')}</tr>`;
      }
      table += `</mj-table>\n`;
      return table;
    }
    case 'signature':
      return `        <mj-text padding="${block.styles.padding}" font-size="${block.styles.fontSize}" color="${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></mj-text>\n`;
    default:
      return '';
  }
}

// ─── Preview HTML Generator ───
function generatePreviewHtml(template: TemplateData): string {
  const { rows, globalStyles } = template;
  const padding = globalStyles.paddingGroup
    ? globalStyles.paddingTop
    : `${globalStyles.paddingTop} ${globalStyles.paddingRight} ${globalStyles.paddingBottom} ${globalStyles.paddingLeft}`;
  const bgImage = globalStyles.backgroundImage
    ? `background-image:url(${globalStyles.backgroundImage});background-size:${globalStyles.backgroundSize === 'repeat' ? 'auto' : globalStyles.backgroundSize};background-repeat:${globalStyles.backgroundSize === 'repeat' ? 'repeat' : 'no-repeat'};background-position:center;`
    : '';

  let html = `<div style="background-color:${globalStyles.bodyColor};font-family:${globalStyles.fontFamily};color:${globalStyles.textColor};font-size:${globalStyles.fontSize};font-weight:${globalStyles.fontWeight};line-height:${globalStyles.lineHeight};direction:${globalStyles.textDirection};max-width:${globalStyles.width};margin:0 auto;padding:${padding};${bgImage}">`;

  for (const row of rows) {
    const rowBg = row.styles.backgroundColor === 'transparent' ? '' : `background-color:${row.styles.backgroundColor};`;
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
  const color = block.styles.color || 'inherit';
  const fontSize = block.styles.fontSize || 'inherit';
  const fontWeight = block.styles.fontWeight || 'inherit';
  const fontFamily = block.styles.fontFamily || 'inherit';
  const lineHeight = block.styles.lineHeight || 'inherit';
  const letterSpacing = block.styles.letterSpacing || 'inherit';

  switch (block.type) {
    case 'heading':
      return `<div style="font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing}">${block.content.text}</div>`;
    case 'text':
      return `<div style="font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing}">${block.content.text}</div>`;
    case 'image':
      return block.content.src
        ? `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><img src="${block.content.src}" alt="${block.content.alt}" style="width:${block.styles.width};max-width:100%" /></div>`
        : `<div style="background:#f1f5f9;padding:32px;text-align:center;color:#94a3b8;font-size:12px">No image</div>`;
    case 'button':
      return `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><a href="${block.content.href}" style="display:inline-block;background-color:${block.styles.backgroundColor || globalStyles.btnBackgroundColor};color:${block.styles.color || globalStyles.btnFontColor};font-size:${block.styles.fontSize || globalStyles.btnFontSize};font-family:${block.styles.fontFamily || globalStyles.btnFontFamily};font-weight:${block.styles.fontWeight || globalStyles.btnFontWeight};padding:${block.styles.padding};border-radius:${block.styles.borderRadius || globalStyles.btnBorderRadius};border:${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor};text-decoration:none">${block.content.text}</a></div>`;
    case 'divider':
      return `<hr style="border-color:${block.styles.borderColor};border-width:${block.styles.borderWidth};margin:${block.styles.padding} 0" />`;
    case 'table': {
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      let t = `<table style="width:100%;border-collapse:collapse;font-size:${fontSize};color:${color};padding:${block.styles.padding}">`;
      t += `<tr>${headers.map((h: string) => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9;text-align:left">${h}</th>`).join('')}</tr>`;
      for (const row of rows) {
        t += `<tr>${row.map((c: string) => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join('')}</tr>`;
      }
      t += `</table>`;
      return t;
    }
    case 'signature':
      return `<div style="padding:${block.styles.padding};font-size:${block.styles.fontSize};color:${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></div>`;
    default:
      return '';
  }
}


