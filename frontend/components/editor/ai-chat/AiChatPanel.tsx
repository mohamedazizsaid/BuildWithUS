'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowUp, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/auth';

type Role = 'user' | 'assistant';
interface ChatMessage {
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  'Un email de bienvenue avec logo, titre et bouton',
  'Une newsletter éditoriale avec article à la une',
  'Une facture professionnelle',
  'Un email promotionnel avec code de réduction',
];

/**
 * Canva-style conversational AI panel. The user chats turn by turn; each
 * assistant reply applies the full updated template to the canvas live.
 *
 * - `onApply` replaces the canvas template with freshly generated MJML.
 * - `getCurrentMjml` serialises the live canvas, used to seed the first turn
 *   when the user is editing an already-populated template.
 */
export function AiChatPanel({
  onApply,
  getCurrentMjml,
}: {
  onApply: (mjml: string) => void;
  getCurrentMjml: () => string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // The template the AI is actively iterating on. Seeded from the canvas on the
  // first turn, then kept as the AI's own output for full fidelity afterwards.
  const workingMjml = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    // On the first turn, seed from the live canvas if it already has content.
    if (workingMjml.current === null) {
      const live = getCurrentMjml();
      workingMjml.current = live.includes('<mj-section') ? live : null;
    }

    try {
      const { ai } = await import('@/lib/api');
      const result = await ai.chat({
        messages: nextMessages,
        current_mjml: workingMjml.current,
        tenant_id: user?.tenant_id || '',
        user_id: user?.id || '',
      });

      if (result.mjml) {
        workingMjml.current = result.mjml;
        onApply(result.mjml);
      }
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: result.message || 'Voici votre modèle.' },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de génération';
      setError(msg);
      // Roll back the user's message so they can retry cleanly.
      setMessages((m) => m.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError('');
    workingMjml.current = null;
  };

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Assistant IA</span>
        </div>
        {!empty && (
          <button
            onClick={reset}
            disabled={isLoading}
            title="Nouvelle conversation"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {empty ? (
          <div className="flex flex-col gap-4 pt-2">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles size={18} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Décrivez l&apos;email à créer</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Puis affinez-le par message : « rends l&apos;entête plus sombre », « ajoute une section tarifs »…
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs rounded-lg border border-border px-3 py-2 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={empty ? 'Décrivez votre email…' : 'Demandez une modification…'}
            rows={2}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border border-border bg-background text-xs p-3 pr-11 focus:outline-none focus:ring-1 focus:ring-ring/20 focus:border-ring transition-all disabled:opacity-60"
          />
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            title="Envoyer"
            className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp size={15} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          Entrée pour envoyer · Maj+Entrée pour un retour à la ligne
        </p>
      </div>
    </div>
  );
}
