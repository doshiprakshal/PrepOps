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

const HEALTH = {
  service:  'PrepOps Remote MCP',
  version:  '2.0.0',
  status:   'ok',
  endpoint: '/mcp',
  docs:     'https://github.com/doshiprakshal/PrepOps/tree/main/mcp-server/docs',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url    = new URL(request.url);
    const origin = url.origin;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // MCP endpoint
    if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
      return handleMCP(request, env);
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return json(HEALTH);
    }

    // ── OAuth 2.0 (required by claude.ai connector) ───────────────────────────
    // PrepOps is a public server — no real user auth needed.
    // We implement the minimum OAuth surface so claude.ai can register and
    // obtain a Bearer token, which we accept but don't actually validate.

    // OAuth discovery
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return json({
        issuer:                                origin,
        token_endpoint:                        `${origin}/oauth/token`,
        registration_endpoint:                 `${origin}/oauth/register`,
        response_types_supported:              ['token'],
        grant_types_supported:                 ['client_credentials'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
        scopes_supported:                      ['mcp'],
        service_documentation:                 'https://github.com/doshiprakshal/PrepOps',
      });
    }

    // Dynamic Client Registration (RFC 7591)
    if (url.pathname === '/oauth/register' && request.method === 'POST') {
      let body: Record<string, unknown> = {};
      try { body = await request.json() as Record<string, unknown>; } catch { /* ok */ }
      return json({
        client_id:                   crypto.randomUUID(),
        client_secret:               crypto.randomUUID(),
        client_name:                 body['client_name'] ?? 'PrepOps Client',
        redirect_uris:               body['redirect_uris'] ?? [],
        grant_types:                 ['client_credentials'],
        token_endpoint_auth_method:  'client_secret_post',
      }, 201);
    }

    // Token endpoint — client_credentials grant, no real auth required
    if (url.pathname === '/oauth/token' && request.method === 'POST') {
      return json({
        access_token: 'prepops-public-access',
        token_type:   'Bearer',
        expires_in:   86400,
        scope:        'mcp',
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
