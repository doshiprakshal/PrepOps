import type { Env } from './index.js';
import { TOOL_DEFS, callTool } from './tools/index.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id:      string | number | null;
  method:  string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id:      string | number | null;
  result?: unknown;
  error?:  { code: number; message: string; data?: unknown };
}

function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function err(id: JsonRpcRequest['id'], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleRequest(req: JsonRpcRequest, env: Env): Promise<JsonRpcResponse> {
  switch (req.method) {

    case 'initialize':
      return ok(req.id, {
        protocolVersion: '2024-11-05',
        capabilities:    { tools: {} },
        serverInfo:      { name: 'PrepOps', version: '2.0.0' },
        instructions:    'PrepOps is a technical interview coaching engine for Infrastructure, DevOps, SRE, Cloud, and Platform Engineering. Use get_home_options to see available modes, then call the appropriate start_* tool to begin a session. Pass session_token to continue_* tools for multi-turn sessions. Claude handles all reasoning — PrepOps provides the engine, prompts, curriculum, personas, and evaluation rubrics.',
      });

    case 'notifications/initialized':
      return ok(req.id, {});

    case 'ping':
      return ok(req.id, {});

    case 'tools/list':
      return ok(req.id, { tools: TOOL_DEFS });

    case 'tools/call': {
      const p = req.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      if (!p?.name) return err(req.id, -32602, 'Missing tool name');
      try {
        const result = await callTool(p.name, p.arguments ?? {}, env);
        return ok(req.id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: 'error' in result,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return ok(req.id, {
          content: [{ type: 'text', text: JSON.stringify({ error: msg }) }],
          isError: true,
        });
      }
    }

    default:
      return err(req.id, -32601, `Method not found: ${req.method}`);
  }
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
  'Access-Control-Max-Age':       '86400',
};

export async function handleMCP(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify(err(null, -32700, 'Parse error')),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Support both single request and batched requests
  const isBatch = Array.isArray(body);
  const requests: JsonRpcRequest[] = isBatch ? (body as JsonRpcRequest[]) : [body as JsonRpcRequest];

  const responses = await Promise.all(
    requests.map(r => handleRequest(r, env).catch(e => err(r.id ?? null, -32603, String(e)))),
  );

  const payload = isBatch ? responses : responses[0];
  return new Response(JSON.stringify(payload), {
    status:  200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
