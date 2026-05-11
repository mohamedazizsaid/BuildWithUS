"use client";

import {
  Undo2,
  Redo2,
  Save,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockData } from "@/lib/editor-types";
import { FormatBar } from "./toolbar/FormatBar";

interface EditorToolbarProps {
  templateName: string;
  activeTab: "canvas" | "code";
  setActiveTab: (tab: "canvas" | "code") => void;
  previewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  previewDevice: "desktop" | "tablet" | "mobile";
  setPreviewDevice: (device: "desktop" | "tablet" | "mobile") => void;
  editDevice: "desktop" | "tablet" | "mobile";
  setEditDevice: (device: "desktop" | "tablet" | "mobile") => void;
  onBack: () => void;
  onCreateTemplate: () => void;
  isSaving: boolean;
  isEditMode?: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Formatting toolbar
  selectedBlock: BlockData | null;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
  // Test email
  onSendTestEmail?: () => void;
  isSendingTest?: boolean;
  // Collaboration
  collaborators?: { userId: string; userName: string; color: string }[];
}

export default function EditorToolbar({
  templateName,
  activeTab,
  setActiveTab,
  previewMode,
  setPreviewMode,
  previewDevice,
  setPreviewDevice,
  editDevice,
  setEditDevice,
  onBack,
  onCreateTemplate,
  isSaving,
  isEditMode,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedBlock,
  onUpdateBlock,
  onSendTestEmail,
  isSendingTest,
  collaborators,
}: EditorToolbarProps) {
  const isTextBlock =
    selectedBlock &&
    (selectedBlock.type === "heading" ||
      selectedBlock.type === "text" ||
      selectedBlock.type === "button" ||
      selectedBlock.type === "table");
  const showFormatBar = isTextBlock && activeTab === "canvas" && !previewMode;

  return (
    <div>
      {/* Main toolbar */}
      <div className="h-12 bg-background border-b border-border flex items-center justify-between px-4">
        {/* Left */}
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

        {/* Center */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground/80">
            {templateName}
          </span>
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              onClick={() => {
                setActiveTab("canvas");
                setPreviewMode(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === "canvas" && !previewMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"}`}
            >
              Canevas
            </button>
            <button
              onClick={() => {
                setActiveTab("code");
                setPreviewMode(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === "code" && !previewMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"}`}
            >
              Code
            </button>
          </div>

          {/* Edit device toggle — only in canvas mode */}
          {activeTab === "canvas" && !previewMode && (
            <div className="flex items-center gap-0.5 ml-2">
              <Button
                variant={editDevice === "desktop" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setEditDevice("desktop")}
                className="h-7 w-7"
                title="Bureau"
              >
                <Monitor size={14} />
              </Button>
              <Button
                variant={editDevice === "tablet" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setEditDevice("tablet")}
                className="h-7 w-7"
                title="Tablette"
              >
                <Tablet size={14} />
              </Button>
              <Button
                variant={editDevice === "mobile" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setEditDevice("mobile")}
                className="h-7 w-7"
                title="Mobile"
              >
                <Smartphone size={14} />
              </Button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode ? "default" : "ghost"}
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
                variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setPreviewDevice("desktop")}
                className="h-7 w-7"
              >
                <Monitor size={14} />
              </Button>
              <Button
                variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setPreviewDevice("tablet")}
                className="h-7 w-7"
              >
                <Tablet size={14} />
              </Button>
              <Button
                variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setPreviewDevice("mobile")}
                className="h-7 w-7"
              >
                <Smartphone size={14} />
              </Button>
            </div>
          )}
          {/* Collaborator presence avatars */}
          {collaborators && collaborators.length > 0 && (
            <div className="flex items-center -space-x-2 mr-1">
              {collaborators.slice(0, 5).map((c) => (
                <div
                  key={c.userId}
                  title={c.userName}
                  className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: c.color }}
                >
                  {c.userName.charAt(0).toUpperCase()}
                </div>
              ))}
              {collaborators.length > 5 && (
                <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shadow-sm">
                  +{collaborators.length - 5}
                </div>
              )}
            </div>
          )}
          {onSendTestEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendTestEmail}
              disabled={isSendingTest}
              className="h-8 px-3 text-xs gap-1.5"
            >
              <Send size={13} />
              {isSendingTest ? "Envoi..." : "Tester l'e-mail"}
            </Button>
          )}
          <Button
            onClick={onCreateTemplate}
            disabled={isSaving}
            className="h-8 px-3 text-xs"
          >
            {isSaving
              ? isEditMode
                ? "Enregistrement..."
                : "Création..."
              : isEditMode
                ? "Enregistrer"
                : "Créer le modèle"}
          </Button>
        </div>
      </div>

      {/* Format bar — appears when a text block is selected */}
      {showFormatBar && selectedBlock && (
        <FormatBar
          block={selectedBlock}
          onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)}
        />
      )}
    </div>
  );
}
