import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TemplateBuilder } from '../block-factory';
import { createBlockTools, createEditTools } from '../tools';
import type { TemplateData } from '@/lib/editor-types';

/**
 * Builds a Model Context Protocol server whose tools ARE the email builder — one
 * MCP tool per block/edit operation, bound to a single request-scoped
 * `TemplateBuilder`. This is the heart of the "MCP is the build path" design:
 * any MCP client (our own assistant, Claude Desktop, …) connects, discovers the
 * tools automatically via `tools/list`, and assembles a template by calling them.
 *
 * The tool schemas + handlers are REUSED verbatim from `tools.ts` (the same
 * self-describing zod definitions the legacy path used), so there is ONE source
 * of truth for what a tool does. State lives in the `builder`: block/edit tools
 * mutate it, `getTemplate` returns the assembled `TemplateData`, and
 * `loadTemplate` seeds it for edit sessions.
 */
export function createBuilderMcpServer(builder: TemplateBuilder): McpServer {
  const server = new McpServer(
    { name: 'winaity-email-builder', version: '1.0.0' },
    {
      instructions:
        "Outils pour construire un email marketing premium bloc par bloc. Appelle setTheme en premier, puis les blocs du haut vers le bas, et termine par getTemplate pour récupérer le template.",
    },
  );

  // Reuse every existing tool (generation + edit), bound to this session's builder.
  const aiTools = { ...createBlockTools(builder), ...createEditTools(builder) };
  for (const [name, t] of Object.entries(aiTools)) {
    // The AI SDK tool keeps the zod object we passed as `inputSchema`; MCP's
    // registerTool wants its raw shape ({ field: zodType }). Fall back to an
    // empty shape for zero-arg tools.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = (t as any).inputSchema;
    const shape = schema && typeof schema === 'object' && 'shape' in schema ? schema.shape : {};
    server.registerTool(
      name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { description: (t as any).description ?? name, inputSchema: shape },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (t as any).execute(args ?? {}, {});
        return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      },
    );
  }

  // loadTemplate — seed the builder from an existing template for edit sessions.
  server.registerTool(
    'loadTemplate',
    {
      description:
        "Charge un template existant (TemplateData JSON) dans le constructeur pour l'ÉDITER. À appeler en premier dans une session d'édition, avant les outils de modification.",
      inputSchema: { template: z.record(z.string(), z.unknown()) },
    },
    async ({ template }) => {
      builder.loadTemplate(template as unknown as TemplateData);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, loaded: true }) }] };
    },
  );

  // getTemplate — the assembled result. Returned both as text (JSON) and as
  // structuredContent so a client can consume it typed.
  server.registerTool(
    'getTemplate',
    {
      description:
        "Retourne le TEMPLATE COMPLET assemblé (TemplateData JSON : rows + globalStyles). À appeler EN DERNIER pour récupérer le résultat.",
      inputSchema: {},
    },
    async () => {
      const tpl = builder.build();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(tpl) }],
        structuredContent: tpl as unknown as Record<string, unknown>,
      };
    },
  );

  return server;
}
