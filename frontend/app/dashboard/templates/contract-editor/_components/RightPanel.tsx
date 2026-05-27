'use client';

import { useRef } from 'react';
import { ImagePlus, Trash2, PenLine, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import type { FloatingImage, FloatingSignature } from '../_lib/types';

const SIGNATURE_ROLES = ['Client', 'Prestataire', 'Témoin', 'Représentant'] as const;

const PRESET_COLORS = [
  { value: '#ffffff', label: 'Blanc' },
  { value: '#fafafa', label: 'Gris très clair' },
  { value: '#f8fafc', label: 'Ardoise 50' },
  { value: '#fef3c7', label: 'Crème' },
  { value: '#ecfeff', label: 'Cyan pâle' },
  { value: '#f0fdf4', label: 'Vert pâle' },
  { value: '#fdf2f8', label: 'Rose pâle' },
  { value: '#eef2ff', label: 'Indigo pâle' },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function RightPanel({
  docBgColor,
  onChangeDocBgColor,
  floatingImages,
  onAddImage,
  onRemoveImage,
  onSelectImage,
  selectedImageId,
  floatingSignatures,
  onAddSignedSignature,
  onAddSignatureField,
  onRemoveSignature,
  onSelectSignature,
  selectedSignatureId,
}: {
  readonly docBgColor: string;
  readonly onChangeDocBgColor: (color: string) => void;
  readonly floatingImages: FloatingImage[];
  readonly onAddImage: (src: string, naturalW: number, naturalH: number) => void;
  readonly onRemoveImage: (id: string) => void;
  readonly onSelectImage: (id: string | null) => void;
  readonly selectedImageId: string | null;
  readonly floatingSignatures: FloatingSignature[];
  readonly onAddSignedSignature: (src: string, naturalW: number, naturalH: number) => void;
  readonly onAddSignatureField: (role: string) => void;
  readonly onRemoveSignature: (id: string) => void;
  readonly onSelectSignature: (id: string | null) => void;
  readonly selectedSignatureId: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const readImageFile = (
    file: File,
    onReady: (src: string, w: number, h: number) => void,
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error(`"${file.name}" n'est pas une image`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`"${file.name}" dépasse 5 Mo`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? '');
      if (!src) return;
      const probe = new Image();
      probe.onload = () => onReady(src, probe.naturalWidth, probe.naturalHeight);
      probe.onerror = () => onReady(src, 200, 200);
      probe.src = src;
    };
    reader.onerror = () => toast.error(`Erreur lecture "${file.name}"`);
    reader.readAsDataURL(file);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => readImageFile(file, onAddImage));
  };

  const handleSignatureFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    readImageFile(files[0], onAddSignedSignature);
  };

  return (
    <div className="w-56 border-l border-border bg-white flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Document</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Couleur de fond</p>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {PRESET_COLORS.map((c) => {
              const isActive = c.value.toLowerCase() === docBgColor.toLowerCase();
              return (
                <button
                  key={c.value}
                  onClick={() => onChangeDocBgColor(c.value)}
                  title={c.label}
                  className={`h-8 rounded-md border transition-all ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ background: c.value }}
                />
              );
            })}
          </div>

          <label className="flex items-center gap-2 mt-2">
            <input
              type="color"
              value={docBgColor}
              onChange={(e) => onChangeDocBgColor(e.target.value)}
              className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
              style={{ background: 'transparent' }}
            />
            <input
              type="text"
              value={docBgColor}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') onChangeDocBgColor(v || '#ffffff');
              }}
              placeholder="#ffffff"
              className="flex-1 h-7 px-2 text-[11px] font-mono rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </label>

          <p className="text-[10px] text-slate-400 mt-2 italic">
            Couleur appliquée au document (aperçu et PDF).
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Images flottantes</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md border border-dashed border-slate-300 text-[11px] text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
          >
            <ImagePlus size={13} />
            Ajouter une image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {floatingImages.length > 0 && (
            <div className="mt-2 space-y-1">
              {floatingImages.map((img, idx) => {
                const isActive = selectedImageId === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => onSelectImage(isActive ? null : img.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-md border cursor-pointer transition-colors ${
                      isActive ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-white flex items-center justify-center shrink-0">
                      <img src={img.src} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="flex-1 text-[10px] text-slate-600 truncate">Image {idx + 1}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveImage(img.id); }}
                      title="Supprimer"
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-2 italic">
            Glissez l&apos;image sur le document, redimensionnez aux poignées.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Signatures</p>

          <p className="text-[10px] text-slate-500 mb-1.5">Ma signature (pré-signée)</p>
          <button
            onClick={() => sigInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md border border-dashed border-slate-300 text-[11px] text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
          >
            <UploadCloud size={13} />
            Importer signature (PNG)
          </button>
          <input
            ref={sigInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              handleSignatureFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <p className="text-[10px] text-slate-500 mt-3 mb-1.5">Champ de signature (à signer)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SIGNATURE_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => onAddSignatureField(role)}
                className="flex items-center justify-center gap-1 h-7 rounded-md border border-slate-200 text-[10px] text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
                title={`Ajouter un champ "Signature — ${role}"`}
              >
                <PenLine size={11} />
                {role}
              </button>
            ))}
          </div>

          {floatingSignatures.length > 0 && (
            <div className="mt-2 space-y-1">
              {floatingSignatures.map((sig, idx) => {
                const isActive = selectedSignatureId === sig.id;
                const label = sig.kind === 'signed'
                  ? `Ma signature ${idx + 1}`
                  : `Champ — ${sig.role || 'Client'}`;
                return (
                  <div
                    key={sig.id}
                    onClick={() => onSelectSignature(isActive ? null : sig.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-md border cursor-pointer transition-colors ${
                      isActive ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-white flex items-center justify-center shrink-0">
                      {sig.kind === 'signed' && sig.src
                        ? <img src={sig.src} alt="" className="max-w-full max-h-full object-contain" />
                        : <PenLine size={12} className="text-slate-400" />}
                    </div>
                    <span className="flex-1 text-[10px] text-slate-600 truncate">{label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveSignature(sig.id); }}
                      title="Supprimer"
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-2 italic">
            Image pré-signée intégrée au PDF, ou champ vide à signer manuellement.
          </p>
        </div>
      </div>
    </div>
  );
}
