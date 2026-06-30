'use client';

import { useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { TemplateData } from '@/lib/editor-types';

export type Role = 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

/**
 * Persistent state for the AI chat. Lives in the editor page (which stays
 * mounted) rather than inside `AiChatPanel`, so the conversation survives
 * switching to Preview / Code / another left-panel tab and back.
 */
export interface AiChatState {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  // The template the AI is actively iterating on (its own latest output).
  workingTemplate: MutableRefObject<TemplateData | null>;
  // Public URL of a poster imported this conversation. Lets later text turns
  // ("ajoute l'image") place the real campaign image, not a stock photo.
  posterUrl: MutableRefObject<string | null>;
  // Compact offer brief (price/plans/gifts) from the analysed poster, so later
  // turns ("ajoute l'offre de l'image dans deux box") have the EXACT data.
  campaign: MutableRefObject<string | null>;
}

export function useAiChatState(): AiChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const workingTemplate = useRef<TemplateData | null>(null);
  const posterUrl = useRef<string | null>(null);
  const campaign = useRef<string | null>(null);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    error,
    setError,
    workingTemplate,
    posterUrl,
    campaign,
  };
}
