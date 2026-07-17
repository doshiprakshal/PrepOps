import { handleMCP } from './mcp.js';

export interface Env {
  SESSION_SECRET: string;
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
      return handleMCP(request, env);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ name: 'PrepOps MCP', status: 'ok', mcp_endpoint: '/mcp' });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
