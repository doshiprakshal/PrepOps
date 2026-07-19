import type { Tool, ToolResult } from './index.js';
import type { Env } from '../env.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\n${bp}`;
}

export const startCodingReasoningDef: Tool = {
  name: 'start_coding_reasoning',
  description: 'Starts a Coding Reasoning session. PrepOps presents a problem; evaluates approach, complexity, communication, and reveals the optimal solution. Returns opening prompt plus session_token.',
  inputSchema: {
    type: 'object',
    properties: {
      difficulty:     { type: 'string', enum: ['Junior','Mid','Senior','Staff'] },
      persona:        { type: 'string', description: 'Persona ID' },
      coding_source:  { type: 'string', enum: ['auto','custom'], default: 'auto' },
      custom_problem: { type: 'string', description: 'Custom problem description (when coding_source is custom)' },
      company:        { type: 'string', description: 'Company context for problem selection (optional)' },
      blueprint:      { type: 'string', description: 'Runtime blueprint (optional)' },
    },
    required: ['difficulty'],
  },
};

export async function startCodingReasoning(
  input: { difficulty: string; persona?: string; coding_source?: string; custom_problem?: string; company?: string; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const personaId = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';

  const srcNote = input.coding_source === 'custom' && input.custom_problem
    ? `USE THIS PROBLEM: ${input.custom_problem}`
    : `AUTO-SELECT: Choose a ${input.difficulty}-level problem appropriate for ${input.company ?? 'general'} context. Apply the Coding Reasoning flow.`;

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== CODING REASONING MODE ===
${PROMPTS['coding_interview'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Difficulty: ${input.difficulty}
${input.company ? `Company: ${input.company}` : ''}

=== SOURCE INSTRUCTIONS ===
${srcNote}

Present the problem now. Do NOT show the solution yet. Ask the candidate to walk you through their approach first.`;

  const state: SessionState = {
    config: {
      mode: 'coding', difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'],
      coding_source: (input.coding_source ?? 'auto') as 'auto' | 'custom',
      coding_problem: input.custom_problem, coding_company: input.company, blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
    hidden: { coding_revealed: false },
  };

  return { prompt, session_token: await signToken(state, env.SESSION_SECRET) };
}

export const continueCodingReasoningDef: Tool = {
  name: 'continue_coding_reasoning',
  description: 'Continues a Coding Reasoning session. Do NOT reveal the optimal solution until the candidate has presented their full approach.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: { type: 'string' },
      transcript:    { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, required: ['role','content'] } },
      user_message:  { type: 'string' },
    },
    required: ['session_token', 'transcript', 'user_message'],
  },
};

export async function continueCodingReasoning(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'PrepOps'}: ${m.content}`).join('\n\n');

  const turn = (state.turn_count ?? 0) + 1;
  const revealNote = turn >= 4 && !state.hidden?.coding_revealed
    ? 'The candidate has had enough exchanges — if their approach is reasonably complete, you may now reveal the optimal solution and explain the time/space complexity differences.'
    : '';

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== CODING REASONING MODE ===
${PROMPTS['coding_interview'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Difficulty: ${config.difficulty}${config.coding_company ? ` | Company: ${config.coding_company}` : ''}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

PrepOps (evaluate approach, complexity, communication; probe gaps; do NOT reveal the optimal solution prematurely${revealNote ? `; ${revealNote}` : ''}):`;

  const revealed = state.hidden?.coding_revealed || turn >= 4;
  const updated  = await signToken({ ...state, turn_count: turn, hidden: { ...state.hidden, coding_revealed: revealed } }, env.SESSION_SECRET);
  return { prompt, session_token: updated, solution_revealed: revealed };
}
