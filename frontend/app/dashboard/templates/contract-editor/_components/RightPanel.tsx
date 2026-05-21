'use client';

import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { FloatingImage } from '../_lib/types';

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
}: {
  readonly docBgColor: string;
  readonly onChangeDocBgColor: (color: string) => void;
  readonly floatingImages: FloatingImage[];
  readonly onAddImage: (src: string, naturalW: number, naturalH: number) => void;
  readonly onRemoveImage: (id: string) => void;
  readonly onSelectImage: (id: string | null) => void;
  readonly selectedImageId: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
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
        probe.onload = () => onAddImage(src, probe.naturalWidth, probe.naturalHeight);
        probe.onerror = () => onAddImage(src, 200, 200);
        probe.src = src;
      };
      reader.onerror = () => toast.error(`Erreur lecture "${file.name}"`);
      reader.readAsDataURL(file);
    });
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
      </div>
    </div>
  );
}
