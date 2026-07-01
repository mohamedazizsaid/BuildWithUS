'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowUp, RotateCcw, MousePointer2, X, ImagePlus } from 'lucide-react';
import type { AiChatState, ChatMessage } from './useAiChatState';
import type { TemplateData } from '@/lib/editor-types';
import { fileToResizedDataUrl } from '@/lib/resize-image';

// Captions shown under the typing indicator while an image is being turned into
// a template, keyed by the stage the route streams back.
const IMAGE_STAGE_LABEL: Record<string, string> = {
  reading: "Lecture de l'image…",
  analyzed: 'Campagne analysée — génération…',
  reviewing: "Vérification de la fidélité à l'affiche…",
  template: 'Assemblage du modèle…',
  retry: 'Nouvelle tentative…',
};

/** Turn the resized poster data URL into a small JPEG File for media upload. */
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  const safeName = name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], safeName, { type: blob.type || 'image/jpeg' });
}

/** Build a compact, verbatim offer brief from the analysed poster report, so a
 * later turn ("ajoute l'offre de l'image dans deux box") has the exact data. */
function offerBriefFromReport(report: unknown): string | null {
  const o = (report as { content?: { offer?: Record<string, unknown> } })?.content?.offer;
  if (!o) return null;
  const L: string[] = [];
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  if (s(o.headline)) L.push(`Titre : ${o.headline}`);
  if (s(o.subheadline)) L.push(`Sous-titre : ${o.subheadline}`);
  if (s(o.price)) L.push(`Prix : ${o.price}`);
  if (s(o.discount)) L.push(`Remise : ${o.discount}`);
  if (Array.isArray(o.gifts) && o.gifts.length) L.push(`Offert : ${(o.gifts as string[]).join(' · ')}`);
  if (s(o.promoCode)) L.push(`Code promo : ${o.promoCode}`);
  for (const p of (Array.isArray(o.plans) ? o.plans : []) as Array<Record<string, unknown>>) {
    const feats = Array.isArray(p.features) ? (p.features as string[]).join(', ') : '';
    L.push(`Forfait ${s(p.name) || '?'}${s(p.price) ? ` — ${p.price}` : ''}${feats ? ` (${feats})` : ''}`);
  }
  return L.length ? L.join('\n') : null;
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
 * - `chat` holds the conversation state, owned by the editor page so the
 *   history survives switching to Preview/Code and back to the AI tab.
 */
export interface AiSelection {
  blockId: string | null;
  sectionId: string | null;
  label: string | null;
}

export function AiChatPanel({
  onApply,
  getCurrentTemplate,
  chat,
  selection,
  onClearSelection,
}: {
  onApply: (template: TemplateData) => void;
  getCurrentTemplate: () => TemplateData;
  chat: AiChatState;
  // The block/section the user has selected in the canvas (null when nothing is
  // selected). When set, the next prompt is scoped to that element.
  selection?: AiSelection | null;
  onClearSelection?: () => void;
}) {
  const { messages, setMessages, input, setInput, isLoading, setIsLoading, error, setError, workingTemplate, posterUrl, campaign } = chat;

  // An attached poster/affiche to turn into a template (ephemeral, per send).
  const [image, setImage] = useState<{ dataUrl: string; name: string; file: File } | null>(null);
  // Latest stage of the image→template pipeline, for the loading caption.
  const [imageStage, setImageStage] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez choisir une image (JPG, PNG…).');
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setImage({ dataUrl, name: file.name, file });
      setError('');
    } catch {
      setError("Impossible de lire l'image.");
    }
  };

  // Image → template: read the poster, generate, and apply the result live.
  const runImage = async (promptText: string) => {
    if (!image || isLoading) return;
    const trimmed = promptText.trim();
    const userLabel = trimmed || `Créer un email à partir de « ${image.name} »`;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: userLabel }];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);
    setImageStage('reading');
    setError('');
    const img = image;
    setImage(null);

    const appendToAssistant = (text: string) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') copy[copy.length - 1] = { ...last, content: last.content + text };
        return copy;
      });

    try {
      const { ai, media } = await import('@/lib/api');
      // Store the poster to MinIO so the email can use the REAL affiche as its
      // banner (not a stock photo), and so later turns can re-place it. Falls
      // back to the inline data URL if the upload fails.
      let uploadedUrl: string;
      try {
        uploadedUrl = (await media.upload(await dataUrlToFile(img.dataUrl, img.name))).url;
      } catch {
        uploadedUrl = img.dataUrl;
      }
      posterUrl.current = uploadedUrl;
      const result = await ai.fromImageStream(
        { image: img.dataUrl, prompt: trimmed || undefined, posterUrl: uploadedUrl },
        {
          onDelta: appendToAssistant,
          onStatus: setImageStage,
          // Remember the campaign's offer so a later "ajoute l'offre" has the data.
          onReport: (report) => {
            campaign.current = offerBriefFromReport(report);
          },
        },
      );
      if (result.template) {
        workingTemplate.current = result.template;
        onApply(result.template);
      }
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: result.message || last.content || "Voici l'email créé à partir de votre affiche.",
          };
        }
        return copy;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'analyse de l'image";
      setError(msg);
      setMessages((m) => m.slice(0, -2));
      setInput(trimmed);
      setImage(img); // restore the attachment so they can retry
    } finally {
      setIsLoading(false);
      setImageStage('');
    }
  };

  // Composer submit: image attached → image pipeline, otherwise text chat.
  const submit = () => {
    if (isLoading) return;
    if (image) runImage(input);
    else send(input);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    // Show the user's message and an empty assistant bubble we stream into.
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);
    setError('');

    // Always work off the LIVE canvas if it has content: this keeps the AI in
    // sync with manual edits made between turns AND guarantees the selected
    // block/section ids exist in the template we send. Empty canvas → fresh
    // generation (workingTemplate stays null).
    const live = getCurrentTemplate();
    if (live.rows.length > 0) workingTemplate.current = live;

    // Scope the edit to the selected element, if any. Captured at send time.
    const scoped = workingTemplate.current && selection && (selection.blockId || selection.sectionId)
      ? { blockId: selection.blockId, sectionId: selection.sectionId }
      : null;

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
          selection: scoped,
          poster_url: posterUrl.current,
          campaign_context: campaign.current,
        },
        { onDelta: appendToAssistant },
      );

      if (result.template) {
        // An empty result (e.g. "efface tout") resets the working template to null
        // so the NEXT prompt is a fresh generation, not an edit on an empty email.
        workingTemplate.current = result.template.rows.length > 0 ? result.template : null;
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
    posterUrl.current = null;
    campaign.current = null;
  };

  const scopeLabel = selection && (selection.blockId || selection.sectionId) ? selection.label : null;
  const empty = messages.length === 0;
  const lastMsg = messages.at(-1);
  const assistantStreaming = !!lastMsg && lastMsg.role === 'assistant' && lastMsg.content.length > 0;
  // Phase 1 — waiting for the first token: standalone typing dots.
  const showTypingDots = isLoading && !assistantStreaming;
  // Phase 2 — prose shown, MJML still generating (canvas not updated yet): caption.
  const showTemplateCaption = isLoading && assistantStreaming && !imageStage;
  // Image pipeline: a stage-specific caption ('Lecture de l'image…' etc.).
  const imageCaption = isLoading && imageStage ? IMAGE_STAGE_LABEL[imageStage] || 'Traitement…' : '';

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

        {imageCaption && (
          <div className="flex items-center gap-2 pl-8 text-[11px] text-blue-600 dark:text-blue-400">
            <Sparkles size={12} className="animate-pulse" />
            <span>{imageCaption}</span>
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
        {/* Selection scope chip — the next prompt targets this element */}
        {scopeLabel && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-white/70 dark:bg-blue-950/30 px-2.5 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <MousePointer2 size={12} className="shrink-0 text-blue-500" />
            <span className="min-w-0 truncate">
              Modifie : <span className="font-medium text-blue-700 dark:text-blue-300">{scopeLabel}</span>
            </span>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                title="Annuler la sélection (modifier tout l'email)"
                className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        {/* Attached poster/affiche — the next send turns it into a template */}
        {image && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-white/70 dark:bg-blue-950/30 p-1.5 pr-2 text-[11px] text-slate-600 dark:text-slate-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.dataUrl} alt={image.name} className="h-9 w-9 shrink-0 rounded object-cover" />
            <span className="min-w-0 flex-1">
              Affiche à transformer : <span className="font-medium text-blue-700 dark:text-blue-300 break-all">{image.name}</span>
            </span>
            <button
              onClick={() => setImage(null)}
              disabled={isLoading}
              title="Retirer l'image"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 disabled:opacity-40"
            >
              <X size={13} />
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pickImage(e.target.files?.[0]);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
        <div className="relative" data-tour="ai-input">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              image
                ? 'Précisez le rendu voulu (optionnel)…'
                : scopeLabel
                  ? `Modifier « ${scopeLabel} »…`
                  : empty
                    ? 'Décrivez votre email, ou importez une affiche…'
                    : 'Demandez une modification…'
            }
            rows={2}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 text-xs p-3 pl-10 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-60"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
            data-tour="ai-image"
            title="Importer une affiche / image"
            className="absolute bottom-2.5 left-2.5 h-7 w-7 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImagePlus size={15} />
          </button>
          <button
            onClick={submit}
            disabled={isLoading || (!input.trim() && !image)}
            data-tour="ai-send"
            title="Envoyer"
            className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp size={15} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {image ? 'Entrée pour générer l’email à partir de l’affiche' : 'Entrée pour envoyer · Importez une affiche pour en faire un email'}
        </p>
      </div>
    </div>
  );
}
