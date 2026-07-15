import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\nThis session was launched from a role prep plan. Keep topic weights, evaluation focus, and persona from this blueprint.\n\n${bp}\n\nAt the end, append the JD READINESS section.`;
}

const LENGTH_NOTES: Record<string, string> = {
  short:    'Keep each phase concise — ~3 exchanges.',
  standard: 'Standard pace — ~5 exchanges per phase.',
  full:     'Full depth — explore each phase thoroughly.',
};

export const startMockInterviewDef: Tool = {
  name: 'start_mock_interview',
  description: 'Starts a full 5-phase Mock Interview (warm-up → core technical → curveball → production → closing). Returns the opening prompt for Claude to run in persona. Report includes PrepOps rubric signal — not a real hiring decision.',
  inputSchema: {
    type: 'object',
    properties: {
      role:             { type: 'string', description: 'Role being practiced (e.g. "Senior SRE", "Platform Engineer")' },
      difficulty:       { type: 'string', enum: ['Junior','Mid','Senior','Staff','Principal'] },
      persona:          { type: 'string', description: 'Interviewer persona ID' },
      focus_areas:      { type: 'array', items: { type: 'string' }, description: 'Optional: [prod, debug, design, comm, depth]' },
      interview_length: { type: 'string', enum: ['short','standard','full'], default: 'standard' },
      company:          { type: 'string', description: 'Company context (optional)' },
      jd_context:       { type: 'string', description: 'Pasted JD text or key requirements (optional)' },
      blueprint:        { type: 'string', description: 'Runtime blueprint from build_runtime_blueprint (optional)' },
    },
    required: ['role', 'difficulty'],
  },
};

export async function startMockInterview(
  input: {
    role: string; difficulty: string; persona?: string; focus_areas?: string[];
    interview_length?: string; company?: string; jd_context?: string; blueprint?: string;
  },
  env: Env,
): Promise<ToolResult> {
  const personaId   = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';
  const lenNote     = LENGTH_NOTES[input.interview_length ?? 'standard'] ?? LENGTH_NOTES['standard']!;
  const focusNote   = input.focus_areas?.length
    ? `Emphasis areas: ${input.focus_areas.join(', ')}`
    : '';

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== MOCK INTERVIEW MODE ===
${PROMPTS['mock_interview'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Role: ${input.role}
Difficulty: ${input.difficulty}
${input.company ? `Company: ${input.company}` : ''}
${focusNote}
Session length: ${lenNote}
${input.jd_context ? `\nJD / role context:\n${input.jd_context}` : ''}

Open with Phase 1 now — just the warm-up question, in character. Do not announce the phase.`;

  const state: SessionState = {
    config: {
      mode: 'mock', role: input.role, difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'],
      focus_areas: input.focus_areas, interview_length: (input.interview_length ?? 'standard') as 'short' | 'standard' | 'full',
      company: input.company, jd_context: input.jd_context, blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
  };

  return {
    prompt,
    session_token: await signToken(state, env.SESSION_SECRET),
    signal_disclaimer: 'Report will include a PrepOps rubric signal. It reflects this practice session only — not a real hiring decision.',
  };
}

export const continueMockInterviewDef: Tool = {
  name: 'continue_mock_interview',
  description: 'Continues a Mock Interview session. Maintains persona throughout — no hints, no coaching, no revealing whether answers are correct during the interview.',
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

export async function continueMockInterview(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n');

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== MOCK INTERVIEW MODE ===
${PROMPTS['mock_interview'] ?? ''}

=== PERSONA ===
${personaYaml}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

Interviewer (continue — maintain persona, follow phase structure, do not coach, do not reveal correct answers):`;

  const turn = (state.turn_count ?? 0) + 1;
  const phase = Math.min(4, Math.floor(turn / 3));
  const updated = await signToken({ ...state, turn_count: turn, phase }, env.SESSION_SECRET);
  return { prompt, session_token: updated, phase, turn_count: turn };
}
