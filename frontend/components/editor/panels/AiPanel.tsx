'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth';

// ─── AI Panel ───
export function AiPanel({ onGenerate }: { onGenerate: (mjml: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError('');
    try {
      const { ai } = await import('@/lib/api');
      const result = await ai.generate({
        prompt: prompt.trim(),
        tenant_id: user?.tenant_id || '',
        user_id: user?.id || '',
      });
      onGenerate(result.mjml);
      setPrompt('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de génération';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const examples = [
    'Un email de bienvenue avec logo et bouton',
    'Une facture avec tableau des articles',
    'Une newsletter avec 3 colonnes d\'articles',
    'Un email de confirmation de commande',
    'Un email promotionnel avec image héro',
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-primary" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Génération IA</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs mb-1.5 block">Décrivez votre modèle</Label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Un email de bienvenue professionnel avec un logo en haut, un titre, un paragraphe et un bouton..."
            className="w-full min-h-[100px] rounded-xl border border-border bg-background text-xs p-3 resize-y focus:outline-none focus:ring-1 focus:ring-ring/20 focus:border-ring transition-all"
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
          />
          <p className="text-[10px] text-muted-foreground mt-1">Ctrl+Entrée pour générer</p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Générer le modèle
            </>
          )}
        </button>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Quick prompts */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggestions</p>
          <div className="space-y-1">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="w-full text-left text-[11px] px-3 py-2 rounded-lg border border-border hover:bg-accent hover:border-ring transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
