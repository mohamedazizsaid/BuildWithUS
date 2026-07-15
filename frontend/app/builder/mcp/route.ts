import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { TemplateBuilder } from '@/lib/ai/block-factory';
import { createBuilderMcpServer } from '@/lib/ai/mcp/build-server';

/**
 * The Model Context Protocol endpoint that exposes the email-builder tools.
 *
 * This is the "MCP is the build path" endpoint: an MCP client (our own AI
 * assistant, or any external client) connects here over Streamable HTTP,
 * discovers the block/edit tools via `tools/list`, and assembles a template by
 * calling them. Each MCP session owns its own `TemplateBuilder`, so concurrent
 * generations never clash.
 *
 * Transport: the SDK's Web-Standard Streamable HTTP transport, which speaks
 * native `Request`/`Response` — a perfect fit for a Next.js App Router handler.
 *
 * NOTE: session state is held in-memory per server process. That's correct for
 * dev and a single-instance deploy; a multi-instance deploy would need a shared
 * session store (or sticky sessions).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface Session {
  transport: WebStandardStreamableHTTPServerTransport;
}

// One live transport per MCP session id (Mcp-Session-Id header).
const sessions = new Map<string, Session>();

async function handle(req: Request): Promise<Response> {
  const sessionId = req.headers.get('mcp-session-id') ?? undefined;

  // POST carries JSON-RPC messages (initialize, tools/list, tools/call, …).
  if (req.method === 'POST') {
    const body = await req.json().catch(() => undefined);
    let transport = sessionId ? sessions.get(sessionId)?.transport : undefined;

    if (!transport) {
      // A session-less POST is only valid as an `initialize` request — that's
      // when we spin up a fresh builder + server for the new session.
      if (!isInitializeRequest(body)) {
        return Response.json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: no valid session ID' }, id: null },
          { status: 400 },
        );
      }
      const builder = new TemplateBuilder();
      const newTransport: WebStandardStreamableHTTPServerTransport =
        new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (sid: string): void => {
            sessions.set(sid, { transport: newTransport });
          },
        });
      newTransport.onclose = () => {
        if (newTransport.sessionId) sessions.delete(newTransport.sessionId);
      };
      const server = createBuilderMcpServer(builder);
      await server.connect(newTransport);
      transport = newTransport;
    }

    return transport.handleRequest(req, { parsedBody: body });
  }

  // GET opens the SSE stream; DELETE terminates the session. Both require a
  // known session id.
  const transport = sessionId ? sessions.get(sessionId)?.transport : undefined;
  if (!transport) {
    return new Response('Invalid or missing session ID', { status: 400 });
  }
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
