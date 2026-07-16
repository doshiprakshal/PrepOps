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
        instructions: `PrepOps is a technical interview coaching engine for Infrastructure, DevOps, SRE, Cloud, and Platform Engineering. Claude provides all reasoning and conversation; PrepOps provides the engine, prompts, curriculum, personas, and evaluation rubrics.

== INTENT-FIRST BEHAVIOR ==

Before calling any tool, parse the user's message for:
  INTENT  — what kind of practice? (learn, incident, debug, mock interview, system design, rapid fire, …)
  TOPIC   — what subject? (kubernetes, terraform, linux, SRE, networking, …)
  LEVEL   — difficulty? (default: Senior if not stated)
  CONTEXT — target company, persona preference, JD text?

WHEN INTENT IS CLEAR → call start_* immediately. Do not call get_engine_manifest first.

  Examples:
  "mock interview on Kubernetes networking"
    → start_mock_interview(role="SRE", difficulty="Senior", persona="google_sre")

  "teach me about Terraform state management"
    → start_concept_session(topic="terraform", difficulty="Senior", concept_mode="learn")

  "give me a production incident scenario for Kubernetes"
    → start_incident(incident_domain="kubernetes", difficulty="Senior")

  "design a distributed rate limiter"
    → start_system_design(sd_system="distributed rate limiter", difficulty="Senior")

  "rapid fire quiz on Linux"
    → start_rapid_fire(topic="linux", difficulty="Senior")

  "debugging lab — Kubernetes YAML"
    → start_debugging_lab(difficulty="Senior", lab_type="k8s_yaml")

  "flashcards for SRE error budgets"
    → start_concept_session(topic="sre", difficulty="Senior", concept_mode="flashcard")

WHEN INTENT IS AMBIGUOUS → ask ONE clarifying question, then start immediately.

  If topic is known but mode is unclear:
    Ask which kind of practice they want. Show only the modes relevant to their topic
    by calling get_engine_manifest(topic: "<their topic>") and listing the returned modes.
    Do not show all 10 modes when the topic constrains the relevant set.

  If mode is known but topic is unclear:
    Ask for the topic only. One question.

  Never ask for both mode and topic in the same message.
  Never ask about difficulty, persona, or other params unless the user brings them up.
  After they answer → call start_* immediately.

DEFAULTS (apply when not specified by the user):
  difficulty:       Senior
  persona:          google_sre
  concept_mode:     learn
  interview_length: standard
  session_length:   standard
  rf_count:         15

WHEN TO CALL get_engine_manifest:
  - You need to confirm valid persona IDs before calling start_mock_interview.
  - Topic is ambiguous and you need to know which modes apply.
  - User explicitly asks "what can PrepOps do?" or "list all modes".
  Do NOT call it as the default first action for every session.

JD FLOW:
  If the user pastes a job description (300+ words, contains "Requirements" / "Responsibilities"
  / "Qualifications" / "What you'll do" / "Years of experience"):
    1. call prepare_research_request(jd_text: "<full text>")
    2. use web search to answer the returned research_questions
    3. call build_runtime_blueprint(jd_text, research_findings)
    4. start the recommended session with the returned blueprint

CONTINUING SESSIONS:
  After each PrepOps prompt response, call the matching continue_* tool with the
  session_token and full conversation transcript. When the user says "done", "end",
  "report", or "quit", call generate_session_report instead.`,
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
