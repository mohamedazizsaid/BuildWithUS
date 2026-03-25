'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor } from '@/hooks/use-editor';
import EditorToolbar from '@/components/editor/EditorToolbar';
import Canvas from '@/components/editor/Canvas';
import RightPanel from '@/components/editor/RightPanel';
import toast from 'react-hot-toast';
import { templates } from '@/lib/api';
import Editor from '@monaco-editor/react';

export default function NewTemplatePage() {
  const router = useRouter();
  const editor = useEditor();
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [activeTab, setActiveTab] = useState<'canvas' | 'code'>('canvas');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  // Generate MJML from template data
  const generateMjml = useCallback(() => {
    const { rows, globalStyles } = editor.template;
    let mjml = `<mjml>\n  <mj-body background-color="${globalStyles.backgroundColor}" width="${globalStyles.width}">\n`;

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
  }, [editor.template]);

  const handleSave = async () => {
    try {
      const mjml = generateMjml();
      await templates.create({
        name: templateName,
        description: '',
        type: 1,
        subject: templateName,
        content: mjml,
      });
      toast.success('Template saved!');
      router.push('/dashboard/templates');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    }
  };

  const deviceWidth = previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Toolbar */}
      <EditorToolbar
        templateName={templateName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        previewDevice={previewDevice}
        setPreviewDevice={setPreviewDevice}
        onSave={handleSave}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Center: Canvas / Code / Preview */}
        <div className="flex-1 overflow-hidden">
          {previewMode ? (
            // Preview Mode
            <div
              className="h-full overflow-y-auto flex justify-center p-8"
              style={{ backgroundColor: '#e2e8f0' }}
            >
              <div
                className="bg-white shadow-lg rounded-sm h-fit"
                style={{ width: deviceWidth, maxWidth: '100%' }}
                dangerouslySetInnerHTML={{
                  __html: generatePreviewHtml(editor.template),
                }}
              />
            </div>
          ) : activeTab === 'canvas' ? (
            // Canvas Mode
            <Canvas
              template={editor.template}
              selectedBlockId={editor.selectedBlockId}
              selectedRowId={editor.selectedRowId}
              onSelectBlock={editor.setSelectedBlockId}
              onSelectRow={editor.setSelectedRowId}
              onSelectColumn={setActiveColumnId}
              onRemoveRow={editor.removeRow}
              onRemoveBlock={editor.removeBlock}
              onUpdateBlock={editor.updateBlock}
              onAddRow={editor.addRow}
              onReorderRows={editor.reorderRows}
              activeColumnId={activeColumnId}
            />
          ) : (
            // Code Mode (Monaco)
            <div className="h-full">
              <Editor
                height="100%"
                language="html"
                theme="vs-light"
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
              selectedBlock={editor.getSelectedBlock()}
              globalStyles={editor.template.globalStyles}
              onAddRow={editor.addRow}
              onAddBlock={editor.addBlock}
              onUpdateBlock={editor.updateBlock}
              onRemoveBlock={editor.removeBlock}
              onUpdateGlobalStyles={editor.updateGlobalStyles}
              onDeselectBlock={() => editor.setSelectedBlockId(null)}
              activeColumnId={activeColumnId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Block to MJML ───
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
    case 'table':
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      let table = `        <mj-table font-size="${block.styles.fontSize}" color="${block.styles.color}" padding="${block.styles.padding}">`;
      table += `<tr>${headers.map((h: string) => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9">${h}</th>`).join('')}</tr>`;
      for (const row of rows) {
        table += `<tr>${row.map((c: string) => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join('')}</tr>`;
      }
      table += `</mj-table>\n`;
      return table;
    case 'signature':
      return `        <mj-text padding="${block.styles.padding}" font-size="${block.styles.fontSize}" color="${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></mj-text>\n`;
    default:
      return '';
  }
}

// ─── Preview HTML Generator ───
function generatePreviewHtml(template: TemplateData): string {
  const { rows, globalStyles } = template;
  let html = `<div style="background-color:${globalStyles.backgroundColor};font-family:${globalStyles.fontFamily};color:${globalStyles.textColor};max-width:${globalStyles.width};margin:0 auto;">`;

  for (const row of rows) {
    html += `<div style="background-color:${row.styles.backgroundColor};padding:${row.styles.padding};">`;
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

function blockToHtml(block: BlockData, globalStyles: { textColor: string; fontFamily: string }): string {
  switch (block.type) {
    case 'heading':
      return `<div style="font-size:${block.styles.fontSize};font-weight:${block.styles.fontWeight};color:${block.styles.color || globalStyles.textColor};text-align:${block.styles.textAlign};padding:${block.styles.padding}">${block.content.text}</div>`;
    case 'text':
      return `<div style="font-size:${block.styles.fontSize};color:${block.styles.color || globalStyles.textColor};text-align:${block.styles.textAlign};padding:${block.styles.padding}">${block.content.text}</div>`;
    case 'image':
      return block.content.src
        ? `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><img src="${block.content.src}" alt="${block.content.alt}" style="width:${block.styles.width};max-width:100%" /></div>`
        : `<div style="background:#f1f5f9;padding:32px;text-align:center;color:#94a3b8;font-size:12px">No image</div>`;
    case 'button':
      return `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><a href="${block.content.href}" style="display:inline-block;background-color:${block.styles.backgroundColor};color:${block.styles.color};font-size:${block.styles.fontSize};padding:${block.styles.padding};border-radius:${block.styles.borderRadius};text-decoration:none">${block.content.text}</a></div>`;
    case 'divider':
      return `<hr style="border-color:${block.styles.borderColor};border-width:${block.styles.borderWidth};margin:${block.styles.padding} 0" />`;
    case 'table':
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      let t = `<table style="width:100%;border-collapse:collapse;font-size:${block.styles.fontSize};color:${block.styles.color};padding:${block.styles.padding}">`;
      t += `<tr>${headers.map((h: string) => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9;text-align:left">${h}</th>`).join('')}</tr>`;
      for (const row of rows) {
        t += `<tr>${row.map((c: string) => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join('')}</tr>`;
      }
      t += `</table>`;
      return t;
    case 'signature':
      return `<div style="padding:${block.styles.padding};font-size:${block.styles.fontSize};color:${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></div>`;
    default:
      return '';
  }
}
