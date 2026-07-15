import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS } from '../assets/engine.js';

const CODING_KEYWORDS = ['algorithm','data structure','leetcode','dsa','dynamic programming','binary search','linked list','tree traversal','graph algorithm','big o','sorting'];

function isCodingTopic(t: string): boolean {
  const lower = t.toLowerCase();
  return CODING_KEYWORDS.some(k => lower.includes(k));
}

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\n${bp}`;
}

export const startRapidFireDef: Tool = {
  name: 'start_rapid_fire',
  description: 'Starts a Rapid Fire session — one question at a time, instant ✓/~/✗ feedback, adaptive difficulty. Coding topics are redirected to start_coding_reasoning automatically. No hire signal.',
  inputSchema: {
    type: 'object',
    properties: {
      topic:      { type: 'string', description: 'Topic to drill (e.g. "Kubernetes networking", "Linux processes", "DNS")' },
      difficulty: { type: 'string', enum: ['Junior','Mid','Senior','Staff'] },
      persona:    { type: 'string', description: 'Persona ID' },
      count:      { type: 'number', enum: [10, 15, 20, 30], default: 15, description: 'Number of questions' },
      blueprint:  { type: 'string', description: 'Runtime blueprint (optional)' },
    },
    required: ['topic', 'difficulty'],
  },
};

export async function startRapidFire(
  input: { topic: string; difficulty: string; persona?: string; count?: number; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  if (isCodingTopic(input.topic)) {
    return {
      redirect: 'coding',
      message: 'Coding topics use Coding Reasoning so PrepOps can evaluate approach, complexity, and communication. Call start_coding_reasoning instead.',
    };
  }

  const personaId   = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';
  const count       = input.count ?? 15;

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== RAPID FIRE MODE ===
${PROMPTS['rapid_fire'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Topic: ${input.topic}
Total questions: ${count}
Starting difficulty: ${input.difficulty}

First check: is this a coding/algorithms/data structures topic? If yes, output exactly: "Coding topics use Coding Reasoning so PrepOps can evaluate approach, complexity, and communication." and stop.

Otherwise: open with the rapid fire header (RAPID FIRE · ${input.topic} · ${input.difficulty}) and ask question 1. Do not ask multiple questions.`;

  const state: SessionState = {
    config: {
      mode: 'rapid_fire', topic: input.topic, difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'], rf_count: count, blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
    hidden: { rf_questions_asked: 0 },
  };

  return { prompt, session_token: await signToken(state, env.SESSION_SECRET), total_questions: count };
}

export const continueRapidFireDef: Tool = {
  name: 'continue_rapid_fire',
  description: 'Continues a Rapid Fire session. Gives brief ✓/~/✗ feedback on the previous answer, then asks the next question. After all questions, shows results grid.',
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

export async function continueRapidFire(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'PrepOps'}: ${m.content}`).join('\n\n');
  const turn    = (state.turn_count ?? 0) + 1;
  const asked   = (state.hidden?.rf_questions_asked ?? 0) + 1;
  const total   = config.rf_count ?? 15;

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== RAPID FIRE MODE ===
${PROMPTS['rapid_fire'] ?? ''}

=== PERSONA ===
${personaYaml}

=== SESSION CONFIG ===
Topic: ${config.topic} | Total: ${total} questions | Starting difficulty: ${config.difficulty}
Current question: approximately ${asked} of ${total}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

PrepOps (give brief ✓/~/✗ feedback; then if questions remain ask the next question; if all ${total} questions done show the results grid and ask if they want to drill weak areas):`;

  const updated = await signToken(
    { ...state, turn_count: turn, hidden: { ...state.hidden, rf_questions_asked: asked } },
    env.SESSION_SECRET,
  );
  return { prompt, session_token: updated, questions_asked: asked, total_questions: total };
}
