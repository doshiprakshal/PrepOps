import { describe, it, expect } from 'vitest';
import worker from './index.js';

const BASE = 'https://prepops-test.example.com';
const ENV  = { SESSION_SECRET: 'test-secret-32-chars-minimum-xx' };

function post(path: string, body: unknown) {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }),
    ENV,
  );
}

function get(path: string) {
  return worker.fetch(new Request(`${BASE}${path}`), ENV);
}

const INIT_PARAMS = {
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
};

// ── Health ─────────────────────────────────────────────────────────────────────

describe('GET /', () => {
  it('returns name, status, and mcp_endpoint', async () => {
    const res  = await get('/');
    const body = await res.json() as Record<string, string>;
    expect(res.status).toBe(200);
    expect(body.name).toBe('PrepOps MCP');
    expect(body.status).toBe('ok');
    expect(body.mcp_endpoint).toBe('/mcp');
  });
});

// ── No OAuth ───────────────────────────────────────────────────────────────────

describe('No OAuth endpoints', () => {
  it('/.well-known/oauth-authorization-server → 404', async () => {
    const res = await get('/.well-known/oauth-authorization-server');
    expect(res.status).toBe(404);
  });

  it('/.well-known/oauth-protected-resource → 404', async () => {
    const res = await get('/.well-known/oauth-protected-resource');
    expect(res.status).toBe(404);
  });

  it('/oauth/register → 404', async () => {
    const res = await post('/oauth/register', {});
    expect(res.status).toBe(404);
  });

  it('/oauth/token → 404', async () => {
    const res = await post('/oauth/token', {});
    expect(res.status).toBe(404);
  });

  it('/oauth/authorize → 404', async () => {
    const res = await get('/oauth/authorize');
    expect(res.status).toBe(404);
  });
});

// ── MCP public access ─────────────────────────────────────────────────────────

describe('MCP — public unauthenticated access', () => {
  it('POST /mcp initialize → 200, not 401', async () => {
    const res = await post('/mcp', INIT_PARAMS);
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
  });

  it('no WWW-Authenticate header on /mcp', async () => {
    const res = await post('/mcp', INIT_PARAMS);
    expect(res.headers.get('WWW-Authenticate')).toBeNull();
  });

  it('initialize returns PrepOps server info', async () => {
    const res  = await post('/mcp', INIT_PARAMS);
    const body = await res.json() as { result: { serverInfo: { name: string } } };
    expect(body.result.serverInfo.name).toBe('PrepOps');
  });

  it('tools/list returns exactly 7 public tools', async () => {
    const res  = await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const body  = await res.json() as { result: { tools: { name: string }[] } };
    const names = (body.result.tools ?? []).map(t => t.name);
    expect(names).toHaveLength(7);
    expect(names).toContain('open_prepops');
    expect(names).toContain('resolve_input');
    expect(names).toContain('start_session');
    expect(names).toContain('continue_session');
    expect(names).toContain('prepare_role_research');
    expect(names).toContain('build_role_plan');
    expect(names).toContain('generate_report');
  });
});

// ── Signed session tokens ─────────────────────────────────────────────────────

describe('Signed session tokens', () => {
  it('start_session returns a signed token', async () => {
    const res  = await post('/mcp', {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'start_session', arguments: { mode: 'concept', topic: 'kubernetes', difficulty: 'Senior' } },
    });
    expect(res.status).toBe(200);
    const body    = await res.json() as { result: { content: { text: string }[] } };
    const content = JSON.parse(body.result.content[0]?.text ?? '{}') as { session_token?: string };
    expect(content.session_token).toBeDefined();
    expect(content.session_token?.split('.').length).toBe(2); // payload.sig
  });

  it('continue_session with valid token returns next view', async () => {
    // Start a session
    const startRes  = await post('/mcp', {
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'start_session', arguments: { mode: 'concept', topic: 'kubernetes', difficulty: 'Senior' } },
    });
    const startBody = await startRes.json() as { result: { content: { text: string }[] } };
    const { session_token } = JSON.parse(startBody.result.content[0]?.text ?? '{}') as { session_token: string };

    // Continue the session
    const contRes  = await post('/mcp', {
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'continue_session', arguments: { session_token, user_response: 'Kubernetes uses etcd as its state store.' } },
    });
    expect(contRes.status).toBe(200);
    const contBody = await contRes.json() as { result: { content: { text: string }[] } };
    const content  = JSON.parse(contBody.result.content[0]?.text ?? '{}') as { session_token?: string; view?: string };
    expect(content.session_token).toBeDefined();
    expect(content.view).toBe('concept_session');
  });

  it('continue_session with tampered token returns error', async () => {
    const res  = await post('/mcp', {
      jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: { name: 'continue_session', arguments: { session_token: 'invalid.tampered', user_response: 'test' } },
    });
    const body    = await res.json() as { result: { content: { text: string }[] } };
    const content = JSON.parse(body.result.content[0]?.text ?? '{}') as { error?: string };
    expect(content.error).toBeDefined();
  });
});
