'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileSpreadsheet, Upload, AlertCircle } from 'lucide-react';
import { parseFile, type ParsedFile } from '@/lib/invoice/ingest/parse-file';
import toast from '@/lib/toast';

interface Props {
  onCancel: () => void;
  onParsed: (file: ParsedFile) => void;
}

export function InvoiceImportModal({ onCancel, onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const parsed = await parseFile(file);
      if (parsed.headers.length === 0) {
        setError('Aucune colonne détectée — vérifiez le séparateur ou le format');
        return;
      }
      if (parsed.rows.length === 0) {
        setError('Le fichier ne contient aucune ligne de données');
        return;
      }
      onParsed(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la lecture du fichier');
      toast.error('Erreur lecture fichier');
    } finally {
      setParsing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[520px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet size={15} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Importer un fichier</h3>
              <p className="text-[11px] text-slate-500">Une facture sera générée par ligne</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            disabled={parsing}
            className={`w-full flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed rounded-xl transition-colors ${
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            <Upload size={22} className="text-slate-400" />
            <div className="text-sm font-medium text-slate-700">
              {parsing ? 'Lecture du fichier...' : 'Cliquez ou glissez un fichier'}
            </div>
            <div className="text-[11px] text-slate-400">CSV · TSV · XLSX · ODS</div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.ods"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-slate-50 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-700">Mode actuel :</strong> une facture par ligne, avec une seule ligne d&apos;article.
            Les informations émetteur, paiement et style sont reprises du template actuellement ouvert.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
