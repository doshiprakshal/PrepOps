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

    // ── OAuth 2.1 (required by claude.ai connector) ───────────────────────────
    // PrepOps is a public server — no real user authentication needed.
    // We implement Authorization Code + PKCE so claude.ai can complete its flow.
    // The authorize endpoint auto-approves every request immediately.

    // OAuth discovery (RFC 8414)
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return json({
        issuer:                              origin,
        authorization_endpoint:             `${origin}/oauth/authorize`,
        token_endpoint:                      `${origin}/oauth/token`,
        registration_endpoint:              `${origin}/oauth/register`,
        response_types_supported:           ['code'],
        grant_types_supported:              ['authorization_code', 'client_credentials'],
        code_challenge_methods_supported:   ['S256', 'plain'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
        scopes_supported:                   ['mcp'],
        service_documentation:              'https://github.com/doshiprakshal/PrepOps',
      });
    }

    // OAuth protected resource metadata (RFC 9470)
    if (url.pathname === '/.well-known/oauth-protected-resource') {
      return json({
        resource:                            `${origin}/mcp`,
        authorization_servers:              [origin],
        scopes_supported:                   ['mcp'],
        bearer_methods_supported:           ['header'],
      });
    }

    // Dynamic Client Registration (RFC 7591)
    if (url.pathname === '/oauth/register' && request.method === 'POST') {
      let body: Record<string, unknown> = {};
      try { body = await request.json() as Record<string, unknown>; } catch { /* ok */ }
      const clientId = crypto.randomUUID();
      const issuedAt = Math.floor(Date.now() / 1000);
      return json({
        client_id:                   clientId,
        client_secret:               crypto.randomUUID(),
        client_id_issued_at:         issuedAt,
        client_secret_expires_at:    0,
        client_name:                 body['client_name'] ?? 'PrepOps Client',
        redirect_uris:               body['redirect_uris'] ?? [],
        grant_types:                 ['authorization_code', 'client_credentials'],
        response_types:              ['code'],
        token_endpoint_auth_method:  'none',
      }, 201);
    }

    // Authorization endpoint — auto-approve, redirect immediately (no login required)
    if (url.pathname === '/oauth/authorize') {
      const redirectUri  = url.searchParams.get('redirect_uri');
      const state        = url.searchParams.get('state');
      const code         = crypto.randomUUID().replace(/-/g, '');

      if (!redirectUri) {
        return json({ error: 'invalid_request', error_description: 'Missing redirect_uri' }, 400);
      }

      const callback = new URL(redirectUri);
      callback.searchParams.set('code', code);
      if (state) callback.searchParams.set('state', state);

      return Response.redirect(callback.toString(), 302);
    }

    // Token endpoint — issue Bearer token for any grant type
    if (url.pathname === '/oauth/token' && request.method === 'POST') {
      return json({
        access_token:  crypto.randomUUID(),
        token_type:    'Bearer',
        expires_in:    86400,
        scope:         'mcp',
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
