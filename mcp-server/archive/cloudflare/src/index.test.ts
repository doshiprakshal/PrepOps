import { describe, it, expect } from 'vitest';
import worker from './index.js';

const BASE  = 'https://prepops-test.example.com';
const ENV   = { SESSION_SECRET: 'test-secret-32-chars-minimum-xx' };

// MCP Streamable HTTP requires Accept: application/json, text/event-stream
const MCP_HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/json, text/event-stream',
};

function post(path: string, body: unknown, headers: Record<string, string> = MCP_HEADERS) {
  return worker.fetch(
    new Request(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }),
    ENV,
  );
}

function get(path: string) {
  return worker.fetch(new Request(`${BASE}${path}`), ENV);
}

// SSE responses are text/event-stream — parse the data line
async function parseSSE(res: Response): Promise<unknown> {
  const text = await res.text();
  const dataLine = text.split('\n').find(l => l.startsWith('data: '));
  if (!dataLine) throw new Error(`No data line in SSE body:\n${text}`);
  return JSON.parse(dataLine.slice(6));
}

// Parse either SSE or JSON depending on Content-Type
async function parseMCP(res: Response): Promise<unknown> {
  const ct = res.headers.get('Content-Type') ?? '';
  if (ct.includes('text/event-stream')) return parseSSE(res);
  return res.json();
}

const INIT_BODY = {
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities:    {},
    clientInfo:      { name: 'prepops-test', version: '1.0.0' },
  },
};

// ── Health ─────────────────────────────────────────────────────────────────────

describe('GET /', () => {
  it('returns name, status, and mcp_endpoint', async () => {
    const res  = await get('/');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.name).toBe('PrepOps MCP');
    expect(body.status).toBe('ok');
    expect(body.mcp_endpoint).toBe('/mcp');
  });
});

// ── No OAuth ───────────────────────────────────────────────────────────────────

describe('No OAuth endpoints', () => {
  const oauthPaths = [
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-protected-resource',
    '/oauth/register',
    '/oauth/token',
    '/oauth/authorize',
  ];

  for (const path of oauthPaths) {
    it(`${path} → 404`, async () => {
      const res = await get(path);
      expect(res.status).toBe(404);
    });
  }
});

// ── MCP protocol ──────────────────────────────────────────────────────────────

describe('MCP initialize', () => {
  it('POST /mcp returns 200, not 401', async () => {
    const res = await post('/mcp', INIT_BODY);
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
  });

  it('no WWW-Authenticate header', async () => {
    const res = await post('/mcp', INIT_BODY);
    expect(res.headers.get('WWW-Authenticate')).toBeNull();
  });

  it('responds with SSE when Accept includes text/event-stream', async () => {
    const res = await post('/mcp', INIT_BODY);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('returns valid JSON-RPC result with serverInfo and capabilities', async () => {
    const res  = await post('/mcp', INIT_BODY);
    const body = await parseMCP(res) as {
      jsonrpc: string;
      id:      number;
      result:  { protocolVersion: string; serverInfo: { name: string }; capabilities: object };
    };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    expect(body.result.serverInfo.name).toBe('PrepOps');
    expect(body.result.capabilities).toBeDefined();
    expect(body.result.protocolVersion).toBe('2025-06-18');
  });

  it('falls back to JSON when Accept is application/json only', async () => {
    const res = await post('/mcp', INIT_BODY, { 'Content-Type': 'application/json', 'Accept': 'application/json' });
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json() as { result: { serverInfo: { name: string } } };
    expect(body.result.serverInfo.name).toBe('PrepOps');
  });

  it('notifications/initialized returns 204 with no body', async () => {
    const res = await post('/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe('');
  });
});

describe('MCP tools/list', () => {
  it('returns exactly 7 public PrepOps tools', async () => {
    const res   = await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const body  = await parseMCP(res) as { result: { tools: { name: string }[] } };
    const names = (body.result.tools ?? []).map(t => t.name);
    expect(names).toHaveLength(7);
    for (const name of ['open_prepops','resolve_input','start_session','continue_session',
                        'prepare_role_research','build_role_plan','generate_report']) {
      expect(names).toContain(name);
    }
  });
});

// ── Session token signing ─────────────────────────────────────────────────────

describe('Signed session tokens', () => {
  it('start_session returns a signed token with payload.signature format', async () => {
    const res   = await post('/mcp', {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'start_session', arguments: { mode: 'concept', topic: 'kubernetes', difficulty: 'Senior' } },
    });
    expect(res.status).toBe(200);
    const body    = await parseMCP(res) as { result: { content: { text: string }[] } };
    const content = JSON.parse(body.result.content[0]?.text ?? '{}') as { session_token?: string };
    expect(content.session_token).toBeDefined();
    expect(content.session_token?.split('.').length).toBe(2);
  });

  it('continue_session with valid token advances the session', async () => {
    const startRes  = await post('/mcp', {
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'start_session', arguments: { mode: 'concept', topic: 'kubernetes', difficulty: 'Senior' } },
    });
    const startBody = await parseMCP(startRes) as { result: { content: { text: string }[] } };
    const { session_token } = JSON.parse(startBody.result.content[0]?.text ?? '{}') as { session_token: string };

    const contRes  = await post('/mcp', {
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'continue_session', arguments: { session_token, user_response: 'etcd stores cluster state' } },
    });
    const contBody = await parseMCP(contRes) as { result: { content: { text: string }[] } };
    const content  = JSON.parse(contBody.result.content[0]?.text ?? '{}') as { session_token?: string; view?: string };
    expect(content.session_token).toBeDefined();
    expect(content.view).toBe('concept_session');
  });

  it('continue_session with tampered token returns error', async () => {
    const res     = await post('/mcp', {
      jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: { name: 'continue_session', arguments: { session_token: 'bad.token', user_response: 'x' } },
    });
    const body    = await parseMCP(res) as { result: { content: { text: string }[] } };
    const content = JSON.parse(body.result.content[0]?.text ?? '{}') as { error?: string };
    expect(content.error).toBeDefined();
  });
});
