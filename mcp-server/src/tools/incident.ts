import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS, INCIDENTS, INCIDENT_TEMPLATES } from '../assets/engine.js';

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\nKeep topic weights, evaluation focus, and persona from this blueprint.\n\n${bp}`;
}

function incidentYaml(id?: string, customText?: string): { yaml: string; srcNote: string } {
  if (customText) {
    return {
      yaml: '',
      srcNote: `GENERATE A UNIQUE PRODUCTION INCIDENT matching: "${customText}". Apply all rules from the INCIDENT ENGINE below.`,
    };
  }
  if (id) {
    const isTemplate = id.startsWith('tpl_');
    if (isTemplate) {
      const key = id.replace('tpl_', '');
      const yaml = INCIDENT_TEMPLATES[key] ?? '';
      return { yaml, srcNote: `USE THE INCIDENT TEMPLATE BELOW. Follow generation_instructions exactly.` };
    }
    const yaml = INCIDENTS[id] ?? '';
    return { yaml, srcNote: `USE THE INCIDENT YAML BELOW EXACTLY. Follow opening_message, clues, red_herrings, turn_budget, and resolution_sequence precisely.` };
  }
  return { yaml: '', srcNote: 'GENERATE A UNIQUE PRODUCTION INCIDENT for this domain. Apply all rules from the INCIDENT ENGINE.' };
}

export const startIncidentDef: Tool = {
  name: 'start_incident',
  description: 'Starts a Production Scenario (incident simulation). Returns the opening prompt for Claude to run as the on-call terminal. Pass session_token to continue_incident for each turn.',
  inputSchema: {
    type: 'object',
    properties: {
      domain:        { type: 'string', description: 'Domain: kubernetes | linux | networking | sre | aws | terraform' },
      difficulty:    { type: 'string', enum: ['Junior','Mid','Senior','Staff'] },
      persona:       { type: 'string', description: 'Persona ID from get_home_options' },
      incident_id:   { type: 'string', description: 'Specific incident key (e.g. "kubernetes/mtu-mismatch") or "tpl_pod-not-starting" for a template. Omit for auto-generated.' },
      custom_text:   { type: 'string', description: 'Custom incident description (overrides incident_id)' },
      blueprint:     { type: 'string', description: 'Runtime blueprint from build_runtime_blueprint (optional)' },
    },
    required: ['domain', 'difficulty'],
  },
};

export async function startIncident(
  input: { domain: string; difficulty: string; persona?: string; incident_id?: string; custom_text?: string; blueprint?: string },
  env: Env,
): Promise<ToolResult> {
  const personaId = input.persona ?? 'google_sre';
  const personaYaml = PERSONAS[personaId] ?? PERSONAS['google_sre'] ?? '';
  const { yaml, srcNote } = incidentYaml(input.incident_id, input.custom_text);

  const prompt = `${CORE}${blueprintBlock(input.blueprint)}

=== INCIDENT ENGINE ===
${PROMPTS['scenarios'] ?? ''}

=== PERSONA ===
${personaYaml}

${yaml ? `=== INCIDENT ===\n${yaml}\n\n` : ''}=== SOURCE INSTRUCTIONS ===
${srcNote}

DOMAIN: ${input.domain} | DIFFICULTY: ${input.difficulty}

You are PrepOps running the Production Incident Simulator. The user is the on-call engineer.
- Begin with ONLY the incident opening_message (formatted with ━ borders)
- Do NOT reveal root cause, resolution, or clues yet
- Stay in the terminal persona`;

  const state: SessionState = {
    config: {
      mode: 'incident', difficulty: input.difficulty as SessionState['config']['difficulty'],
      persona: personaId as SessionState['config']['persona'], incident_domain: input.domain,
      incident_id: input.incident_id, custom_incident: input.custom_text, blueprint: input.blueprint,
    },
    phase: 0, turn_count: 0, started_at: Date.now(),
    hidden: { incident_phase: 'opening', clues_revealed: 0 },
  };

  return { prompt, session_token: await signToken(state, env.SESSION_SECRET) };
}

export const continueIncidentDef: Tool = {
  name: 'continue_incident',
  description: 'Continues a Production Scenario session. Pass the session_token and full conversation transcript.',
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

export async function continueIncident(
  input: { session_token: string; transcript: Array<{ role: string; content: string }>; user_message: string },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const personaYaml = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const { yaml, srcNote } = incidentYaml(config.incident_id, config.custom_incident);

  const history = input.transcript.map(m => `${m.role === 'user' ? 'Engineer' : 'Terminal'}: ${m.content}`).join('\n\n');

  const prompt = `${CORE}${blueprintBlock(config.blueprint)}

=== INCIDENT ENGINE ===
${PROMPTS['scenarios'] ?? ''}

=== PERSONA ===
${personaYaml}

${yaml ? `=== INCIDENT ===\n${yaml}\n\n` : ''}=== SOURCE INSTRUCTIONS ===
${srcNote}

DOMAIN: ${config.incident_domain ?? 'kubernetes'} | DIFFICULTY: ${config.difficulty}

=== INVESTIGATION SO FAR ===
${history}

Engineer: ${input.user_message}

Terminal (continue incident simulation — follow the incident engine rules; reveal clues based on commands run; do NOT reveal root cause prematurely):`;

  const turn = (state.turn_count ?? 0) + 1;
  const phase = turn <= 3 ? 'opening' : turn <= 8 ? 'investigation' : 'resolution';
  const updated = await signToken(
    { ...state, turn_count: turn, hidden: { ...state.hidden, incident_phase: phase as 'opening' | 'investigation' | 'resolution' | 'debrief' } },
    env.SESSION_SECRET,
  );

  return { prompt, session_token: updated, turn_count: turn, phase };
}
