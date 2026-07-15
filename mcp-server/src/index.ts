import { handleMCP } from './mcp.js';

export interface Env {
  SESSION_SECRET: string;
}

const HEALTH = JSON.stringify({
  service:  'PrepOps Remote MCP',
  version:  '2.0.0',
  status:   'ok',
  endpoint: '/mcp',
  docs:     'https://github.com/doshiprakshal/PrepOps/tree/main/mcp-server/docs',
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
      return handleMCP(request, env);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(HEALTH, {
        status:  200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
