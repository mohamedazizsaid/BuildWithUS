import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * AI model provider for the tool-based email generator.
 *
 * Points at the in-house vLLM server (OpenAI-compatible API). Configured purely
 * via SERVER-SIDE env vars — the API key must never reach the browser, so there
 * is no NEXT_PUBLIC_ prefix and this module is only ever imported by the route
 * handler (server runtime).
 */

const baseURL = process.env.AI_BASE_URL;
const apiKey = process.env.AI_API_KEY;

/** Default model — validated to drive the tool/agent loop cleanly (gemma4-26b). */
export const DEFAULT_MODEL = process.env.AI_MODEL || 'gemma4-26b';
/** Fallback / A-B alternative (qwen35-35b-a3b). */
export const FALLBACK_MODEL = process.env.AI_MODEL_FALLBACK || 'qwen35-35b-a3b';

let cached: ReturnType<typeof createOpenAICompatible> | null = null;

function provider() {
  if (!baseURL || !apiKey) {
    throw new Error(
      'AI server not configured: set AI_BASE_URL and AI_API_KEY in the environment (server-side).',
    );
  }
  if (!cached) {
    cached = createOpenAICompatible({ name: 'finanssor', baseURL, apiKey });
  }
  return cached;
}

/** Resolve a chat model by id (defaults to DEFAULT_MODEL). */
export function getModel(id: string = DEFAULT_MODEL) {
  return provider()(id);
}
