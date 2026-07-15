import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\n${bp}`;
}

export const startWhiteboardDef: Tool = {
  name: 'start_whiteboard',
  description: 'Starts a Whiteboard Interview session (2 phases: requirements → design review). Returns opening prompt. No hire signal — use generate_session_report for SESSION ASSESSMENT + DESIGN ASSESSMENT output.',
  inputSchema: {
    type: 'object',
    properties: {
      topic:      { type: 'string', description: 'Architecture topic or system (e.g. "Kubernetes architecture", "Multi-region failover")' },
      difficulty: { type: 'string', enum: ['Intermediate','Senior','Staff','Principal'] },
      persona:    { type: 'string', description: 'Persona ID' },
      blueprint:  { type: 'string', description: 'Runtime blueprint (optional)' },
    },
    required: ['topic', 'difficulty'],
  },
};

export async function startWhiteboard(
  input: { topic: string; difficulty: string; persona?: string; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const personaId   = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== WHITEBOARD INTERVIEW MODE ===
${PROMPTS['whiteboard'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Topic: ${input.topic}
Difficulty: ${input.difficulty}

Begin Phase 1: present the whiteboard topic in 1-2 sentences and let the user ask clarifying questions. Do not start designing — wait for them to ask first.`;

  const state: SessionState = {
    config: {
      mode: 'whiteboard', wb_topic: input.topic, difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'], blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
  };

  return {
    prompt,
    session_token: await signToken(state, env.SESSION_SECRET),
    phases: ['Requirements', 'Design Review'],
    note: 'No hire signal for whiteboard sessions. Call generate_session_report for a SESSION ASSESSMENT + DESIGN ASSESSMENT report.',
  };
}

export const continueWhiteboardDef: Tool = {
  name: 'continue_whiteboard',
  description: 'Continues a Whiteboard Interview session. Probe one question at a time; advance to Phase 2 once requirements are sufficiently scoped.',
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

export async function continueWhiteboard(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n');
  const turn = (state.turn_count ?? 0) + 1;
  const phase = turn <= 3 ? 0 : 1;

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== WHITEBOARD INTERVIEW MODE ===
${PROMPTS['whiteboard'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Topic: ${config.wb_topic} | Difficulty: ${config.difficulty}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

Interviewer (continue whiteboard; probe with one question at a time; ${phase === 0 ? 'advance to Phase 2 once requirements are sufficiently scoped' : 'you are in Phase 2 — design review'}):`;

  const updated = await signToken({ ...state, turn_count: turn, phase }, env.SESSION_SECRET);
  return { prompt, session_token: updated, phase, phase_label: ['Requirements', 'Design Review'][phase] };
}
