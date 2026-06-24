'use client';

import React, { useEffect, useRef } from 'react';
import { Sparkles, ArrowUp, RotateCcw } from 'lucide-react';
import type { AiChatState, ChatMessage } from './useAiChatState';
import type { TemplateData } from '@/lib/editor-types';

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
 * - `chat` holds the conversation state, owned by the editor page so the
 *   history survives switching to Preview/Code and back to the AI tab.
 */
export function AiChatPanel({
  onApply,
  getCurrentTemplate,
  chat,
}: {
  onApply: (template: TemplateData) => void;
  getCurrentTemplate: () => TemplateData;
  chat: AiChatState;
}) {
  const { messages, setMessages, input, setInput, isLoading, setIsLoading, error, setError, workingTemplate } = chat;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    // Show the user's message and an empty assistant bubble we stream into.
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);
    setError('');

    // On the first turn, seed from the live canvas if it already has content.
    if (workingTemplate.current === null) {
      const live = getCurrentTemplate();
      workingTemplate.current = live.rows.length > 0 ? live : null;
    }

    // Append streamed prose to the trailing assistant bubble.
    const appendToAssistant = (text: string) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + text };
        }
        return copy;
      });

    try {
      const { ai } = await import('@/lib/api');
      const result = await ai.chatStream(
        {
          messages: nextMessages,
          current_template: workingTemplate.current,
        },
        { onDelta: appendToAssistant },
      );

      if (result.template) {
        workingTemplate.current = result.template;
        onApply(result.template);
      }
      // Replace the streamed bubble with the authoritative final message.
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: result.message || last.content || 'Voici votre modèle.',
          };
        }
        return copy;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de génération';
      setError(msg);
      // Roll back the assistant placeholder AND the user message so they can retry cleanly.
      setMessages((m) => m.slice(0, -2));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError('');
    workingTemplate.current = null;
  };

  const empty = messages.length === 0;
  const lastMsg = messages.at(-1);
  const assistantStreaming = !!lastMsg && lastMsg.role === 'assistant' && lastMsg.content.length > 0;
  // Phase 1 — waiting for the first token: standalone typing dots.
  const showTypingDots = isLoading && !assistantStreaming;
  // Phase 2 — prose shown, MJML still generating (canvas not updated yet): caption.
  const showTemplateCaption = isLoading && assistantStreaming;

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-blue-50/40 to-background dark:from-blue-950/20 dark:to-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-blue-900/40 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/30">
            <Sparkles size={13} className="text-white" />
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Assistant IA</span>
        </div>
        {!empty && (
          <button
            onClick={reset}
            disabled={isLoading}
            title="Nouvelle conversation"
            className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-40"
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
              <div className="mx-auto mb-3 h-11 w-11 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles size={20} className="text-white" />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Décrivez l&apos;email à créer</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Puis affinez-le par message : « rends l&apos;entête plus sombre », « ajoute une section tarifs »…
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs rounded-lg border border-blue-100 dark:border-blue-900/40 bg-white/60 dark:bg-blue-950/20 px-3 py-2 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-200 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-xs leading-relaxed bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
                  {m.content}
                </div>
              </div>
            ) : !m.content ? (
              // Empty placeholder while the reply streams — the typing dots cover this state.
              null
            ) : (
              <div key={i} className="flex justify-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/30 mt-0.5">
                  <Sparkles size={11} className="text-white" />
                </span>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3 py-2 text-xs leading-relaxed bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/40 text-slate-700 dark:text-slate-200 shadow-sm">
                  {m.content}
                </div>
              </div>
            ),
          )
        )}

        {showTypingDots && (
          <div className="flex justify-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/30 mt-0.5">
              <Sparkles size={11} className="text-white" />
            </span>
            <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/40 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
            </div>
          </div>
        )}

        {showTemplateCaption && (
          <div className="flex items-center gap-2 pl-8 text-[11px] text-blue-600 dark:text-blue-400">
            <Sparkles size={12} className="animate-pulse" />
            <span>Génération du modèle…</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-blue-100 dark:border-blue-900/40 bg-linear-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/30 p-3 shrink-0">
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
            className="w-full resize-none rounded-xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 text-xs p-3 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-60"
          />
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            title="Envoyer"
            className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
