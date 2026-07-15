import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { signToken, verifyToken, updateToken } from '../session/token.js';
import type { SessionState, ConceptSubMode } from '../session/types.js';
import { CORE, PROMPTS, KNOWLEDGE, TOPICS } from '../assets/engine.js';

const MODE_PROMPTS: Record<ConceptSubMode, (topicDisplay: string, diff: string, covNote: string) => string> = {
  learn: (t, d, cov) => `Mode: Learn Concept | Topic: ${t} | Level: ${d}
${cov}

Run an adaptive Socratic session. Open with ONE concrete, production-grounded question — not "what is X", ask "walk me through what happens when…" or "when would you choose X over Y?". Probe based on their answer; one follow-up at a time. After 5-7 exchanges surface the key misconception most engineers have about this topic. Keep responses tight. Ask your opening question now.`,

  flashcard: (t, d, cov) => `Mode: Flashcards | Topic: ${t} | Level: ${d}
${cov}

Generate one flashcard at a time. Show only the FRONT first. Wait for user response, then show BACK.

FRONT: [Production-grounded question — test "why" and "what breaks", not definitions]

After user responds:
BACK: [2-4 sentence answer. Key insight + why it matters in production.]

Ask: "How'd that go? Got it / Almost / Missed it" and adjust difficulty. Start with card 1 — show only the FRONT.`,

  mcq: (t, d, cov) => `Mode: MCQ Practice | Topic: ${t} | Level: ${d}
${cov}

Generate one scenario-based MCQ at a time.

Q: [Scenario — not a definition. "You notice X symptom, what's the most likely cause?"]
A) …  B) …  C) …  D) …

After user answers: name the correct answer, explain WHY, explain why wrong options are wrong, state the production implication. Then ask if ready for the next question. Start with question 1 now.`,
};

function covNote(topicId: string, topicDisplay: string): string {
  const hasKnowledge = Object.keys(KNOWLEDGE).some(k => k.startsWith(topicId));
  return hasKnowledge
    ? `PrepOps has a full structured curriculum for "${topicDisplay}" — use production-grounded questions, common misconceptions, and real debugging scenarios.`
    : `PrepOps has no structured curriculum for "${topicDisplay}" — draw on general knowledge and be upfront about it.`;
}

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\nThis session was launched from a role prep plan. Keep topic weights, evaluation focus, and persona from this blueprint.\n\n${bp}\n\nAt the end, append a JD READINESS section showing which required skills were demonstrated.`;
}

export const startConceptDef: Tool = {
  name: 'start_concept_session',
  description: 'Starts a Concept Prep session (Learn, Flashcard, or MCQ). Returns the opening prompt for Claude to run, plus a session token to pass to continue_concept_session.',
  inputSchema: {
    type: 'object',
    properties: {
      topic:        { type: 'string', description: 'Topic to study (e.g. "kubernetes", "linux processes")' },
      difficulty:   { type: 'string', enum: ['Junior','Mid','Intermediate','Senior','Staff','Principal'] },
      persona:      { type: 'string', description: 'Persona ID from get_home_options' },
      concept_mode: { type: 'string', enum: ['learn','flashcard','mcq'], default: 'learn' },
      blueprint:    { type: 'string', description: 'Runtime blueprint from build_runtime_blueprint (optional)' },
    },
    required: ['topic', 'difficulty'],
  },
};

export async function startConceptSession(
  input: { topic: string; difficulty: string; persona?: string; concept_mode?: ConceptSubMode; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const topicObj = TOPICS.find(t => t.id === input.topic.toLowerCase()) ?? { id: input.topic.toLowerCase(), display: input.topic, coverage: 'general' as const };
  const mode = (input.concept_mode ?? 'learn') as ConceptSubMode;
  const diff  = input.difficulty;
  const cov   = covNote(topicObj.id, topicObj.display);

  const knowledgeSection = KNOWLEDGE[topicObj.id] ? `\n\n=== KNOWLEDGE FILE ===\n${KNOWLEDGE[topicObj.id]}` : '';

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

${MODE_PROMPTS[mode](topicObj.display, diff, cov)}${knowledgeSection}

PrepOps:`;

  const state: SessionState = {
    config: { mode: 'concept', topic: topicObj.id, difficulty: diff as SessionState['config']['difficulty'], persona: (input.persona ?? 'google_sre') as SessionState['config']['persona'], concept_mode: mode, blueprint: input.blueprint },
    phase: 0, turn_count: 0, started_at: Date.now(),
  };

  return { prompt, session_token: await signToken(state, env.SESSION_SECRET), topic: topicObj, mode };
}

export const continueConceptDef: Tool = {
  name: 'continue_concept_session',
  description: 'Continues a Concept Prep session. Pass the session_token from start_concept_session plus the full conversation transcript so far.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: { type: 'string' },
      transcript:    { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, required: ['role','content'] }, description: 'Full conversation so far' },
      user_message:  { type: 'string', description: 'Latest user message' },
    },
    required: ['session_token', 'transcript', 'user_message'],
  },
};

export async function continueConceptSession(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const topicObj = TOPICS.find(t => t.id === config.topic) ?? { id: config.topic ?? '', display: config.topic ?? '', coverage: 'general' as const };
  const mode = (config.concept_mode ?? 'learn') as ConceptSubMode;
  const cov  = covNote(topicObj.id, topicObj.display);
  const knowledgeSection = KNOWLEDGE[topicObj.id] ? `\n\n=== KNOWLEDGE FILE ===\n${KNOWLEDGE[topicObj.id]}` : '';

  const history = input.transcript.map(m => `${m.role === 'user' ? 'User' : 'PrepOps'}: ${m.content}`).join('\n\n');

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

${MODE_PROMPTS[mode](topicObj.display, config.difficulty, cov)}${knowledgeSection}

Conversation so far:
${history}

User: ${input.user_message}

PrepOps:`;

  const updated = await updateToken(input.session_token, env.SESSION_SECRET, { turn_count: state.turn_count + 1 });
  return { prompt, session_token: updated ?? input.session_token };
}
