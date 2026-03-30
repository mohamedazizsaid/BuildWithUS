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
  onBack: () => void;
  onCreateTemplate: () => void;
  isSaving: boolean;
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
  onBack,
  onCreateTemplate,
  isSaving,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: EditorToolbarProps) {
  return (
    <div className="h-12 bg-background border-b border-border flex items-center justify-between px-4">
      {/* Left: Navigation group */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 gap-1.5 text-xs"
        >
          ← Retour
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 w-8"
          title="Annuler (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 w-8"
          title="Rétablir (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="h-8 gap-1.5 text-xs"
        >
          <Save size={14} />
          Enregistrer
        </Button>
      </div>

      {/* Center: Tabs + Template Name */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground/80">{templateName}</span>
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <button
            onClick={() => { setActiveTab('canvas'); setPreviewMode(false); }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'canvas' && !previewMode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            Canevas
          </button>
          <button
            onClick={() => { setActiveTab('code'); setPreviewMode(false); }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'code' && !previewMode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Right: Action group */}
      <div className="flex items-center gap-2">
        <Button
          variant={previewMode ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setPreviewMode(!previewMode)}
          className="h-8 w-8"
          title="Aperçu"
        >
          <Eye size={16} />
        </Button>
        {previewMode && (
          <div className="flex items-center gap-0.5">
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
        <Button
          onClick={onCreateTemplate}
          disabled={isSaving}
          className="h-8 px-3 text-xs"
        >
          {isSaving ? 'Création...' : 'Créer le modèle'}
        </Button>
      </div>
    </div>
  );
}
