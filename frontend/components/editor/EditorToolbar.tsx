'use client';

import { Undo2, Redo2, Save, Eye, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorToolbarProps {
  templateName: string;
  activeTab: 'canvas' | 'code';
  setActiveTab: (tab: 'canvas' | 'code') => void;
  previewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function EditorToolbar({
  templateName,
  activeTab,
  setActiveTab,
  previewMode,
  setPreviewMode,
  previewDevice,
  setPreviewDevice,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: EditorToolbarProps) {
  return (
    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
      {/* Left: Undo / Redo / Save */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 w-8"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 w-8"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </Button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="h-8 gap-1.5 text-xs"
        >
          <Save size={14} />
          Save
        </Button>
      </div>

      {/* Center: Tabs + Template Name */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">{templateName}</span>
        <div className="flex items-center bg-slate-100 rounded-md p-0.5">
          <button
            onClick={() => { setActiveTab('canvas'); setPreviewMode(false); }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'canvas' && !previewMode
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Canvas
          </button>
          <button
            onClick={() => { setActiveTab('code'); setPreviewMode(false); }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'code' && !previewMode
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Right: Preview + Device */}
      <div className="flex items-center gap-1">
        <Button
          variant={previewMode ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setPreviewMode(!previewMode)}
          className="h-8 w-8"
          title="Preview"
        >
          <Eye size={16} />
        </Button>
        {previewMode && (
          <div className="flex items-center gap-0.5 ml-1">
            <Button
              variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setPreviewDevice('desktop')}
              className="h-7 w-7"
            >
              <Monitor size={14} />
            </Button>
            <Button
              variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setPreviewDevice('tablet')}
              className="h-7 w-7"
            >
              <Tablet size={14} />
            </Button>
            <Button
              variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setPreviewDevice('mobile')}
              className="h-7 w-7"
            >
              <Smartphone size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
