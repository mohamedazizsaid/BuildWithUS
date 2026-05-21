'use client';

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

export function RightPanel({
  docBgColor,
  onChangeDocBgColor,
}: {
  readonly docBgColor: string;
  readonly onChangeDocBgColor: (color: string) => void;
}) {
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
      </div>
    </div>
  );
}
