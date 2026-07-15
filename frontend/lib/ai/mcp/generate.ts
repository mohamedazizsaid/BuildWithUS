import { streamText, stepCountIs } from 'ai';
import { getModel } from '@/lib/ai/provider';
import { TemplateBuilder } from '@/lib/ai/block-factory';
import { openBuildSession } from './client';
import type { TemplateData } from '@/lib/editor-types';

/**
 * The MCP generation engine: run one agentic build/edit turn where the model's
 * tools are DISCOVERED from the /builder/mcp endpoint (not hardcoded). The model
 * calls those tools to mutate a server-side builder; we then fetch the assembled
 * template via getTemplate.
 *
 * Returns a LOCAL TemplateBuilder pre-loaded with the result, so the calling
 * route can keep using its existing builder-centric finishing steps
 * (resolveStockImages, frameTemplate, dedupeTemplate, blockCount) unchanged.
 */

const GEN_MAX_TOKENS = Number(process.env.AI_GEN_MAX_TOKENS) || 1500;

export interface McpGenResult {
  /** A local builder loaded with the assembled template (drop-in for the routes). */
  builder: TemplateBuilder;
  /** The streamed chat-bubble prose (already cleaned/capped by the caller's pump). */
  prose: string;
}

export async function buildViaMcp(opts: {
  /** Absolute URL of the /builder/mcp endpoint (derive from the request origin). */
  mcpUrl: string;
  modelId: string;
  system: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  /** When set, the session is seeded in edit mode with this template. */
  editTemplate?: TemplateData | null;
  maxSteps?: number;
  /** Drain the model's text stream into the client; returns the (capped) prose. */
  pump: (stream: AsyncIterable<string>) => Promise<string>;
}): Promise<McpGenResult> {
  const session = await openBuildSession(opts.mcpUrl);
  try {
    if (opts.editTemplate) await session.loadTemplate(opts.editTemplate);

    const result = streamText({
      model: getModel(opts.modelId),
      system: opts.system,
      messages: opts.messages,
      tools: session.tools,
      stopWhen: stepCountIs(opts.maxSteps ?? 36),
      maxOutputTokens: GEN_MAX_TOKENS,
    });

    const prose = await opts.pump(result.textStream);
    await result.finishReason; // rejects on model error; ensures tool calls finished

    const template = await session.getTemplate();
    const builder = new TemplateBuilder();
    builder.loadTemplate(template);
    return { builder, prose };
  } finally {
    await session.close();
  }
}
