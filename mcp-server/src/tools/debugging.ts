import type { Tool, ToolResult } from './index.js';
import type { Env } from '../env.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, KNOWLEDGE } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\n${bp}`;
}

const LAB_TYPE_LABELS: Record<string, string> = {
  k8s_yaml:  'Broken Kubernetes YAML',
  terraform: 'Broken Terraform',
  helm:      'Broken Helm',
  promql:    'Broken PromQL',
  linux:     'Linux troubleshooting',
  custom:    'Custom lab',
};

export const startDebuggingLabDef: Tool = {
  name: 'start_debugging_lab',
  description: 'Starts a Debugging Lab session. PrepOps presents a broken artifact; the user diagnoses and proposes a fix. Returns opening prompt plus session_token.',
  inputSchema: {
    type: 'object',
    properties: {
      lab_type:   { type: 'string', enum: ['k8s_yaml','terraform','helm','promql','linux','custom'] },
      topic:      { type: 'string', description: 'Optional topic focus (e.g. "pod scheduling", "VPC routing")' },
      difficulty: { type: 'string', enum: ['Junior','Mid','Senior','Staff'] },
      blueprint:  { type: 'string', description: 'Runtime blueprint (optional)' },
    },
    required: ['lab_type', 'difficulty'],
  },
};

export async function startDebuggingLab(
  input: { lab_type: string; topic?: string; difficulty: string; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const labLabel = LAB_TYPE_LABELS[input.lab_type] ?? input.lab_type;
  const knowledgeKey = input.topic?.toLowerCase() ?? '';
  const knowledgeSection = KNOWLEDGE[knowledgeKey] ? `\n\n=== KNOWLEDGE FILE ===\n${KNOWLEDGE[knowledgeKey]}` : '';

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== DEBUGGING LAB MODE ===
${PROMPTS['debugging_labs'] ?? ''}
${knowledgeSection}

=== SESSION CONFIG ===
Lab type: ${labLabel}
${input.topic ? `Topic / domain: ${input.topic}` : 'Topic: PrepOps choice — pick a realistic failure for this lab type'}
Difficulty: ${input.difficulty}

Present LAB 1 now. Show the opening line, then the full CONTEXT and ARTIFACT blocks. End with "What's wrong? What's the fix?" Do not give any hints yet.`;

  const state: SessionState = {
    config: {
      mode: 'debugging', difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: 'google_sre', lab_type: input.lab_type, lab_topic: input.topic, blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
  };

  return { prompt, session_token: await signToken(state, env.SESSION_SECRET) };
}

export const continueDebuggingLabDef: Tool = {
  name: 'continue_debugging_lab',
  description: 'Continues a Debugging Lab session. Follow the adaptive evaluation loop: probe gaps before revealing, honor hint/answer commands.',
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

export async function continueDebuggingLab(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const labLabel = LAB_TYPE_LABELS[config.lab_type ?? ''] ?? config.lab_type ?? 'Lab';
  const knowledgeKey = config.lab_topic?.toLowerCase() ?? '';
  const knowledgeSection = KNOWLEDGE[knowledgeKey] ? `\n\n=== KNOWLEDGE FILE ===\n${KNOWLEDGE[knowledgeKey]}` : '';

  const history = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'PrepOps'}: ${m.content}`).join('\n\n');

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== DEBUGGING LAB MODE ===
${PROMPTS['debugging_labs'] ?? ''}
${knowledgeSection}

=== SESSION CONFIG ===
Lab type: ${labLabel}${config.lab_topic ? ` | Topic: ${config.lab_topic}` : ''} | Difficulty: ${config.difficulty}

=== CONVERSATION ===
${history}

Candidate: ${input.user_message}

PrepOps (follow the adaptive evaluation loop — probe before revealing; honor hint/answer commands; once lab is closed ask the CI/CD question, then offer another lab or end for report):`;

  const turn = (state.turn_count ?? 0) + 1;
  const updated = await signToken({ ...state, turn_count: turn }, env.SESSION_SECRET);
  return { prompt, session_token: updated };
}
