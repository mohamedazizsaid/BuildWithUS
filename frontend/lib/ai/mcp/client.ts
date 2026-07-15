import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { dynamicTool, jsonSchema, type ToolSet } from 'ai';
import type { TemplateData } from '@/lib/editor-types';

/**
 * MCP CLIENT side of the "MCP is the build path" design. The assistant opens a
 * build session against the /builder/mcp endpoint, DISCOVERS the block/edit tools
 * at runtime (tools/list) and wraps each as an AI SDK tool the model can call.
 * The model never learns the tools from the system prompt — it learns them from
 * the server's own descriptions. Adding a tool on the server → the model can use
 * it, with zero prompt or client changes.
 *
 * getTemplate/loadTemplate are ORCHESTRATION calls the route makes directly (seed
 * an edit session, retrieve the result) — they're hidden from the model's toolset.
 */

export interface McpBuildSession {
  /** Model-facing block/edit tools, discovered from the server. */
  tools: ToolSet;
  /** Seed the session's builder with an existing template (edit mode). */
  loadTemplate(t: TemplateData): Promise<void>;
  /** Retrieve the assembled template. */
  getTemplate(): Promise<TemplateData>;
  /** Close the MCP session (frees the server-side builder). */
  close(): Promise<void>;
}

const ORCHESTRATION_TOOLS = new Set(['getTemplate', 'loadTemplate']);

function firstText(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const t = content.find((c) => c && typeof c === 'object' && (c as { type?: string }).type === 'text');
  return t ? (t as { text?: string }).text : undefined;
}

/**
 * Open a build session against the MCP endpoint. `baseUrl` is the absolute URL of
 * the /builder/mcp route (derived from the incoming request in the route, so it
 * works in dev and prod without hardcoding a host).
 */
export async function openBuildSession(baseUrl: string): Promise<McpBuildSession> {
  const client = new Client({ name: 'winaity-assistant', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
  await client.connect(transport);

  const listed = await client.listTools();
  const tools: ToolSet = {};
  for (const t of listed.tools) {
    if (ORCHESTRATION_TOOLS.has(t.name)) continue;
    tools[t.name] = dynamicTool({
      description: t.description ?? t.name,
      // The server's JSON Schema IS the contract — no zod redefinition here.
      inputSchema: jsonSchema((t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>),
      execute: async (args) => {
        const res = await client.callTool({
          name: t.name,
          arguments: (args ?? {}) as Record<string, unknown>,
        });
        // Return the tool's small JSON ack ({ ok, added }) so the model gets
        // feedback; the real template is fetched via getTemplate at the end.
        return firstText(res.content) ?? JSON.stringify(res.structuredContent ?? { ok: true });
      },
    });
  }

  return {
    tools,
    async loadTemplate(t: TemplateData): Promise<void> {
      await client.callTool({ name: 'loadTemplate', arguments: { template: t as unknown as Record<string, unknown> } });
    },
    async getTemplate(): Promise<TemplateData> {
      const res = await client.callTool({ name: 'getTemplate', arguments: {} });
      const text = firstText(res.content);
      if (!text) throw new Error('getTemplate returned no template');
      return JSON.parse(text) as TemplateData;
    },
    async close(): Promise<void> {
      await transport.close();
    },
  };
}
