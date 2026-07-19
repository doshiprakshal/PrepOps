import type { Tool, ToolResult } from './index.js';
import type { Env } from '../env.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\nWeight topics toward JD requirements using this blueprint.\n\n${bp}`;
}

const LENGTH_MAP: Record<string, string> = {
  quick:    '~10 exchanges (15 min)',
  standard: '~20 exchanges (30 min)',
  full:     '~30 exchanges (45 min)',
};

export const startMixedModeDef: Tool = {
  name: 'start_mixed_mode',
  description: 'Starts a Mixed Mode session. PrepOps controls the mode mix (MCQ, concept, scenario, rapid fire, whiteboard) based on the Decision Engine in mixed_mode.md. Hire signal only after 10+ exchanges.',
  inputSchema: {
    type: 'object',
    properties: {
      topic:          { type: 'string', description: 'Topic or role focus (e.g. "Kubernetes SRE", "AWS networking")' },
      difficulty:     { type: 'string', enum: ['Junior','Mid','Senior','Staff'] },
      persona:        { type: 'string', description: 'Persona ID' },
      session_length: { type: 'string', enum: ['quick','standard','full'], default: 'standard' },
      blueprint:      { type: 'string', description: 'Runtime blueprint (optional)' },
    },
    required: ['topic', 'difficulty'],
  },
};

export async function startMixedMode(
  input: { topic: string; difficulty: string; persona?: string; session_length?: string; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const personaId   = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';
  const lenNote     = LENGTH_MAP[input.session_length ?? 'standard'] ?? LENGTH_MAP['standard']!;

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== MIXED MODE ===
${PROMPTS['mixed_mode'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Topic / role: ${input.topic}
Starting difficulty: ${input.difficulty}
Session length: ${lenNote}
${input.blueprint ? 'JD priorities active — weight topics toward JD requirements.' : ''}

Start with one MCQ question to calibrate. Do not announce the mode — just ask. After calibrating, follow the Decision Engine to adapt modes based on their performance.`;

  const state: SessionState = {
    config: {
      mode: 'mixed', topic: input.topic, difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'],
      session_length: (input.session_length ?? 'standard') as 'quick' | 'standard' | 'full',
      blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
  };

  return {
    prompt,
    session_token: await signToken(state, env.SESSION_SECRET),
    hire_signal_note: 'Hire signal is shown in the report only after 10+ exchanges.',
  };
}

export const continueMixedModeDef: Tool = {
  name: 'continue_mixed_mode',
  description: 'Continues a Mixed Mode session. PrepOps follows the Decision Engine — adapt modes based on performance, use brief transitions, do not announce mode changes.',
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

export async function continueMixedMode(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'PrepOps'}: ${m.content}`).join('\n\n');
  const turn  = (state.turn_count ?? 0) + 1;

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== MIXED MODE ===
${PROMPTS['mixed_mode'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Topic / role: ${config.topic} | Difficulty: ${config.difficulty} | Exchanges so far: ${turn}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

PrepOps (continue; follow Decision Engine — if 3-4 exchanges have passed evaluate signal and adapt; use one brief transition sentence if switching modes; do not explain the mode change):`;

  const updated = await signToken({ ...state, turn_count: turn }, env.SESSION_SECRET);
  return { prompt, session_token: updated, exchange_count: turn };
}
