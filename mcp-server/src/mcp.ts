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
        instructions: `PrepOps is a technical interview coaching engine for Infrastructure, DevOps, SRE, Cloud, and Platform Engineering. Claude provides all reasoning, conversation, and web research. PrepOps controls the session structure, phase, scoring, clue disclosure, and report format.

== TOOL REFERENCE (7 tools) ==

open_prepops
  Call when: user says "Open PrepOps", "Start PrepOps", "What can you do?", "show me options"
  Do NOT call when: user has already stated a specific intent.

resolve_input(user_request)
  Call when: intent or a required parameter is still ambiguous after reading the user message.
  Do NOT call for every session — only when mode or required params cannot be determined.

start_session(mode, topic, difficulty, ...)
  Call when: mode and all required params are known.
  Defaults: difficulty=Senior, persona=google_sre, concept_mode=learn.
  Returns: first PrepOps view + session_token + prompt to run.

continue_session(session_token, user_response, optional_hypothesis, optional_action)
  Call: for EVERY user message when a session_token exists. No exceptions.
  Returns: next PrepOps view + updated session_token + prompt to run.

prepare_role_research(jd_text)
  Call when: user pastes a job description (300+ words with Requirements/Responsibilities/Qualifications).
  Returns: research questions. Then perform web search. Then call build_role_plan.

build_role_plan(jd_text, research_findings)
  Call after: web search is complete.
  Returns: prompt to run that generates the runtime blueprint + role prep plan view.

generate_report(session_token, transcript)
  Call when: user says "done", "end", "report", "quit", or session naturally concludes.
  Returns: session_report view + prompt to run for the PrepOps report.

== INTENT-FIRST SESSION START ==

Before calling any tool, parse the user's message:
  INTENT  → what kind of practice? (learn/teach, incident, debug, mock interview, system design, rapid fire, …)
  TOPIC   → what subject? (kubernetes, terraform, linux, SRE, networking, aws, …)
  LEVEL   → difficulty? (default: Senior)

If intent and required params are clear → call start_session immediately.

  start_session mode values: concept | incident | debugging | coding | mock | whiteboard | system_design | rapid_fire | mixed

  Examples:
  "mock interview on Kubernetes networking" → start_session(mode=mock, topic=kubernetes, role=SRE, difficulty=Senior, persona=google_sre)
  "teach me about Terraform state"         → start_session(mode=concept, topic=terraform, difficulty=Senior, concept_mode=learn)
  "production incident scenario for k8s"  → start_session(mode=incident, topic=kubernetes, difficulty=Senior)
  "design a distributed rate limiter"      → start_session(mode=system_design, topic=distributed rate limiter, difficulty=Senior)
  "rapid fire quiz on Linux"               → start_session(mode=rapid_fire, topic=linux, difficulty=Senior)
  "debugging lab — broken k8s YAML"        → start_session(mode=debugging, session_variant=k8s_yaml, difficulty=Senior)
  "flashcards for SRE error budgets"       → start_session(mode=concept, topic=sre, difficulty=Senior, concept_mode=flashcard)

If one required param is unclear → call resolve_input(user_request). It returns a single setup question.
Ask it. After the user answers, call start_session immediately.

Never ask about difficulty, persona, session length, or focus areas unless the user brings them up.

== ACTIVE SESSION: PrepOps CONTROLS EVERY TURN ==

When a session_token exists:
  ✓ Call continue_session for EVERY user response without exception.
  ✓ Run the returned "prompt" field through your reasoning to generate the PrepOps message.
  ✓ Render mode metadata (phase, turn, known_signals, etc.) as session context.
  ✗ Do NOT generate the next question, feedback, or scoring independently.
  ✗ Do NOT change phase, difficulty, persona, incident clues, or coding state outside continue_session.
  ✗ Do NOT produce the final report — call generate_report instead.

== HOW TO RUN A PROMPT ==

When any PrepOps tool returns a "prompt" field:
  1. Use the prompt as your instruction context for this response turn.
  2. Generate the PrepOps message (question, terminal response, feedback, etc.) following the prompt.
  3. Use your conversation history for session context — do not show the prompt to the user.

== VIEW RENDERING ==

home
  List all modes from open_prepops result. Show custom input examples. Do not auto-start.

setup
  Show what PrepOps inferred. Ask the setup_question if present. Then call start_session.

concept_session / flashcard / mcq
  Show the PrepOps question with topic, turn, difficulty in a context line.

incident_terminal
  Render like a terminal session. Show: phase · turn N of 12 · known_signals list · working_hypothesis (if set).
  Present the available_actions list after the terminal response. Wait for next action.

debugging_lab
  Show the artifact and current question. Honor "hint" / "answer" commands in user_response.

coding_workspace
  Show problem + current phase + constraints.
  Do NOT reveal the optimal solution until solution_revealed is true in the view metadata.

mock_interview
  Show the current phase name. Maintain interviewer persona — never break character or coach mid-session.

whiteboard_workspace / system_design_workspace
  Show current phase. Probe exactly one question at a time per PrepOps instructions.

rapid_fire
  Show question N of total. Give brief ✓/~/✗ feedback per PrepOps instructions. Move to next question.

mixed_mode
  Follow PrepOps Decision Engine instructions. Do not announce mode changes to the candidate.

session_report
  Display the generated PrepOps report as a formatted document. Clear session_token after display.

role_prep_plan
  Show SUCCESS FACTORS · TOPIC PRIORITIES · GAP ANALYSIS · week-by-week action plan.
  Extract <<<BLUEPRINT_META>>> — use preferred_persona for subsequent sessions.

== JD FLOW ==

Trigger: user pastes a job description (300+ words containing Requirements/Responsibilities/Qualifications):
  1. call prepare_role_research(jd_text)
  2. perform web search to answer the returned research_questions
  3. call build_role_plan(jd_text, research_findings)
  4. run the returned prompt to generate the role prep plan
  5. parse <<<BLUEPRINT_META>>> for preferred_persona and top_domain
  6. ask which mode the user wants to start with
  7. call start_session with the blueprint parameter

PrepOps does not perform web search — Claude does.`,
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
