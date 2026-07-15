import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\n${bp}`;
}

const SD_PHASES = ['Requirements', 'High-Level', 'Deep Dives', 'Adversarial'];

function getPhase(turn: number): number {
  if (turn <= 3) return 0;
  if (turn <= 6) return 1;
  if (turn <= 10) return 2;
  return 3;
}

export const startSystemDesignDef: Tool = {
  name: 'start_system_design',
  description: 'Starts a System Design session across 4 phases (requirements → high-level → deep dives → adversarial). No hire signal — use generate_session_report for DESIGN SCORECARD output.',
  inputSchema: {
    type: 'object',
    properties: {
      system:      { type: 'string', description: 'System to design (e.g. "Logging platform", "Multi-region Kubernetes")' },
      difficulty:  { type: 'string', enum: ['Intermediate','Senior','Staff','Principal'] },
      persona:     { type: 'string', description: 'Persona ID' },
      scale:       { type: 'string', description: 'Scale hint (optional, e.g. "10K req/sec, 500 engineers")' },
      constraints: { type: 'string', description: 'Constraints (optional, e.g. "AWS only, no vendor lock-in")' },
      blueprint:   { type: 'string', description: 'Runtime blueprint (optional)' },
    },
    required: ['system', 'difficulty'],
  },
};

export async function startSystemDesign(
  input: { system: string; difficulty: string; persona?: string; scale?: string; constraints?: string; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const personaId   = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== SYSTEM DESIGN MODE ===
${PROMPTS['system_design'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
System: ${input.system}
Difficulty: ${input.difficulty}
${input.scale ? `Scale hint: ${input.scale}` : ''}
${input.constraints ? `Constraints: ${input.constraints}` : ''}

Begin Phase 1: present the design problem in 2-3 sentences and let the user ask clarifying questions. Do not give requirements — wait for them to surface the constraints.`;

  const state: SessionState = {
    config: {
      mode: 'system_design', sd_system: input.system, difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'],
      sd_scale: input.scale, sd_constraints: input.constraints, blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
  };

  return {
    prompt,
    session_token: await signToken(state, env.SESSION_SECRET),
    phases: SD_PHASES,
    note: 'No hire signal for system design sessions. Call generate_session_report for DESIGN SCORECARD.',
  };
}

export const continueSystemDesignDef: Tool = {
  name: 'continue_system_design',
  description: 'Continues a System Design session. Follow phase structure — ask one probing question at a time.',
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

export async function continueSystemDesign(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n');
  const turn  = (state.turn_count ?? 0) + 1;
  const phase = getPhase(turn);

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== SYSTEM DESIGN MODE ===
${PROMPTS['system_design'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
System: ${config.sd_system} | Difficulty: ${config.difficulty}
${config.sd_scale ? `Scale: ${config.sd_scale}` : ''}${config.sd_constraints ? ` | Constraints: ${config.sd_constraints}` : ''}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

Interviewer (current phase: ${SD_PHASES[phase] ?? 'Adversarial'}; continue — ask one probing question at a time):`;

  const updated = await signToken({ ...state, turn_count: turn, phase }, env.SESSION_SECRET);
  return { prompt, session_token: updated, phase, phase_label: SD_PHASES[phase] ?? 'Adversarial' };
}
