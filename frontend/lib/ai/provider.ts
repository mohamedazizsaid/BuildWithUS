import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * AI model provider for the tool-based email generator.
 *
 * Points at the in-house vLLM server (OpenAI-compatible API). Configured purely
 * via SERVER-SIDE env vars — the API key must never reach the browser, so there
 * is no NEXT_PUBLIC_ prefix and this module is only ever imported by the route
 * handler (server runtime).
 */

export const DEFAULT_MODEL = process.env.AI_MODEL || 'deepseek/deepseek-chat';
export const FALLBACK_MODEL = process.env.AI_MODEL_FALLBACK || 'deepseek/deepseek-v3.2';

let cached: ReturnType<typeof createOpenAICompatible> | null = null;
let cachedBaseURL = '';
let cachedApiKey = '';

function provider() {
  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!baseURL || !apiKey) {
    throw new Error(
      'AI server not configured: set AI_BASE_URL and AI_API_KEY in the environment (server-side).',
    );
  }
  if (!cached || cachedBaseURL !== baseURL || cachedApiKey !== apiKey) {
    cached = createOpenAICompatible({ name: 'openrouter', baseURL, apiKey });
    cachedBaseURL = baseURL;
    cachedApiKey = apiKey;
  }
  return cached;
}

/** Resolve a chat model by id (defaults to DEFAULT_MODEL). */
export function getModel(id?: string) {
  const modelId = id || process.env.AI_MODEL || DEFAULT_MODEL;
  return provider()(modelId);
}

