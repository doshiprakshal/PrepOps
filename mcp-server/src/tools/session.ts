/**
 * session.ts — unified PrepOps session dispatcher
 *
 * start_session  → starts any mode, returns first structured view + session token
 * continue_session → handles every user response, returns next structured view
 *
 * The internal per-mode start functions (startConceptSession, startIncident, …)
 * are used for start_session dispatch. Continuation prompts are built here from
 * the signed session state — no transcript re-embedding needed; Claude holds the
 * conversation context.
 */

import type { Tool, ToolResult } from './index.js';
import type { Env } from '../env.js';
import { signToken, verifyToken } from '../session/token.js';
import type { SessionState } from '../session/types.js';
import { CORE, PROMPTS, PERSONAS, KNOWLEDGE } from '../assets/engine.js';

// Internal start functions (each returns { prompt, session_token, ...extras })
import { startConceptSession }  from './concept.js';
import { startIncident }        from './incident.js';
import { startDebuggingLab }    from './debugging.js';
import { startCodingReasoning } from './coding.js';
import { startMockInterview }   from './mock.js';
import { startWhiteboard }      from './whiteboard.js';
import { startSystemDesign }    from './sysdesign.js';
import { startRapidFire }       from './rapidfire.js';
import { startMixedMode }       from './mixed.js';

// ── View type map ─────────────────────────────────────────────────────────────

function modeToView(mode: string, conceptMode?: string): string {
  if (mode === 'concept') {
    if (conceptMode === 'flashcard') return 'flashcard';
    if (conceptMode === 'mcq')       return 'mcq';
    return 'concept_session';
  }
  const MAP: Record<string, string> = {
    incident:      'incident_terminal',
    debugging:     'debugging_lab',
    coding:        'coding_workspace',
    mock:          'mock_interview',
    whiteboard:    'whiteboard_workspace',
    system_design: 'system_design_workspace',
    rapid_fire:    'rapid_fire',
    mixed:         'mixed_mode',
  };
  return MAP[mode] ?? 'concept_session';
}

// ── View metadata builders ────────────────────────────────────────────────────

const MOCK_PHASES   = ['Warm-up', 'Core Technical', 'Curveball', 'Production', 'Closing'];
const SD_PHASES     = ['Requirements', 'High-Level', 'Deep Dives', 'Adversarial'];
const WB_PHASES     = ['Requirements', 'Design Review'];
const INC_PHASES    = ['Opening', 'Investigation', 'Resolution', 'Debrief'];
const CODING_PHASES = ['Clarification', 'Approach', 'Brute Force', 'Optimization', 'Complexity', 'Edge Cases', 'Optimal Reveal'];

function incidentPhaseFromTurn(turn: number): string {
  if (turn <= 2) return 'Opening';
  if (turn <= 8) return 'Investigation';
  if (turn <= 12) return 'Resolution';
  return 'Debrief';
}

function codingPhaseFromTurn(turn: number, revealed?: boolean): string {
  if (revealed) return 'Optimal Reveal';
  const phases = ['Clarification', 'Approach', 'Brute Force', 'Optimization', 'Complexity', 'Edge Cases'];
  return phases[Math.min(turn, phases.length - 1)] ?? 'Edge Cases';
}

function buildViewMeta(state: SessionState): Record<string, unknown> {
  const { config, phase, turn_count, hidden } = state;
  const turn = turn_count ?? 0;

  switch (config.mode) {
    case 'concept':
      return {
        topic:          config.topic,
        concept_mode:   config.concept_mode ?? 'learn',
        difficulty:     config.difficulty,
        turn,
        has_curriculum: !!KNOWLEDGE[config.topic ?? ''],
      };

    case 'incident':
      return {
        phase:              INC_PHASES[phase] ?? incidentPhaseFromTurn(turn),
        turn,
        turn_budget:        12,
        incident_domain:    config.incident_domain,
        clues_revealed:     hidden?.clues_revealed ?? 0,
        working_hypothesis: hidden?.working_hypothesis ?? null,
        actions:            ['Run diagnostic command', 'State hypothesis', 'Request Slack context', 'Propose mitigation', 'Ask for metrics'],
        known_signals:      hidden?.known_signals ?? [],
      };

    case 'debugging':
      return {
        lab_type:   config.lab_type,
        lab_topic:  config.lab_topic,
        difficulty: config.difficulty,
        turn,
        actions:    ['Identify root cause', 'Propose fix', 'Ask for hint', 'Reveal answer'],
      };

    case 'coding':
      return {
        phase:            codingPhaseFromTurn(turn, hidden?.coding_revealed),
        turn,
        solution_revealed:hidden?.coding_revealed ?? false,
        phases:           CODING_PHASES,
        difficulty:       config.difficulty,
      };

    case 'mock':
      return {
        phase:       MOCK_PHASES[phase] ?? 'Core Technical',
        phase_index: phase,
        turn,
        role:        config.role,
        persona:     config.persona,
        all_phases:  MOCK_PHASES,
        signal_note: 'PrepOps rubric signal — reflects this practice session only',
      };

    case 'whiteboard':
      return {
        phase:      WB_PHASES[Math.min(phase, 1)] ?? 'Requirements',
        turn,
        topic:      config.wb_topic,
        all_phases: WB_PHASES,
      };

    case 'system_design':
      return {
        phase:      SD_PHASES[Math.min(phase, 3)] ?? 'Requirements',
        turn,
        system:     config.sd_system,
        scale:      config.sd_scale,
        all_phases: SD_PHASES,
      };

    case 'rapid_fire':
      return {
        question_number: (hidden?.rf_questions_asked ?? 0) + 1,
        total_questions: config.rf_count ?? 15,
        difficulty:      config.difficulty,
        topic:           config.topic,
      };

    case 'mixed':
      return {
        turn,
        topic:               config.topic,
        difficulty:          config.difficulty,
        session_length:      config.session_length,
        hire_signal_after:   10,
        exchanges_remaining: Math.max(0, (config.session_length === 'quick' ? 10 : config.session_length === 'full' ? 30 : 20) - turn),
      };

    default:
      return { turn };
  }
}

// ── Continuation prompt builders ──────────────────────────────────────────────

function blueprintBlock(bp?: string): string {
  if (!bp) return '';
  return `\n\n=== JD-DRIVEN SESSION ===\nWeight this session toward JD requirements from the blueprint below.\n\n${bp}`;
}

function buildContinuePrompt(
  state:      SessionState,
  userResp:   string,
  hypothesis?: string,
  action?:     string,
): string {
  const { config, phase, turn_count, hidden } = state;
  const turn     = (turn_count ?? 0) + 1;
  const persona  = PERSONAS[config.persona] ?? PERSONAS['google_sre'] ?? '';
  const bp       = blueprintBlock(config.blueprint);

  switch (config.mode) {

    case 'concept': {
      const topicId  = config.topic ?? '';
      const modeName = config.concept_mode ?? 'learn';
      const modeKey  = modeName === 'learn' ? 'learn_concept' : modeName;
      const prompt   = PROMPTS[modeKey] ?? PROMPTS['learn_concept'] ?? '';
      const knowledge = KNOWLEDGE[topicId] ? `\n\n=== KNOWLEDGE FILE ===\n${KNOWLEDGE[topicId]}` : '';
      return `${CORE}${bp}

=== CONCEPT PREP — ${modeName.toUpperCase()} MODE ===
${prompt}
${knowledge}

=== SESSION STATE ===
Topic: ${config.topic} | Difficulty: ${config.difficulty} | Turn: ${turn}

=== ADAPTIVE EVALUATION LOOP ===
Run the loop: evaluate the answer, identify the weakest link, choose response (probe gap / increase difficulty / decrease difficulty).

User's answer: ${userResp}

PrepOps (evaluate — one follow-up probe OR next question; never two questions in one response):`;
    }

    case 'incident': {
      const incPhase  = incidentPhaseFromTurn(turn);
      const clues     = hidden?.clues_revealed ?? 0;
      const incDomain = config.incident_domain ?? 'kubernetes';
      return `${CORE}${bp}

=== INCIDENT ENGINE ===
${PROMPTS['scenarios'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
Domain: ${incDomain} | Difficulty: ${config.difficulty} | Phase: ${incPhase} | Turn: ${turn} of 12
Clues revealed so far: ${clues}
${hypothesis ? `Working hypothesis (stated by engineer): ${hypothesis}` : 'Working hypothesis: none stated yet'}

=== ENGINEER'S ACTION ===
${userResp}
${action ? `Action type: ${action}` : ''}

Terminal (respond to this action following incident engine rules; reveal clue if diagnostic command targets the right area; do NOT reveal root cause; track which hypothesis is active; Claude holds full conversation context):`;
    }

    case 'debugging': {
      const labLabel  = config.lab_type ?? 'lab';
      const knowledge = KNOWLEDGE[config.lab_topic?.toLowerCase() ?? ''];
      const knowledgeSection = knowledge ? `\n\n=== KNOWLEDGE FILE ===\n${knowledge}` : '';
      return `${CORE}${bp}

=== DEBUGGING LAB MODE ===
${PROMPTS['debugging_labs'] ?? ''}
${knowledgeSection}

=== SESSION STATE ===
Lab type: ${labLabel}${config.lab_topic ? ` | Topic: ${config.lab_topic}` : ''} | Difficulty: ${config.difficulty} | Turn: ${turn}

Candidate's response: ${userResp}

PrepOps (adaptive evaluation loop: probe before revealing; honor "hint" / "answer" commands; after lab closes, ask the CI/CD question; Claude holds full conversation context):`;
    }

    case 'coding': {
      const revealed  = hidden?.coding_revealed ?? false;
      const revealNote = !revealed && turn >= 4
        ? 'The candidate has had sufficient exchanges. If their approach is reasonably complete, you may now reveal the optimal solution and compare time/space complexity.'
        : '';
      return `${CORE}${bp}

=== CODING REASONING MODE ===
${PROMPTS['coding_interview'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
Difficulty: ${config.difficulty}${config.coding_company ? ` | Company: ${config.coding_company}` : ''} | Turn: ${turn}
Solution revealed: ${revealed}
Current phase: ${codingPhaseFromTurn(turn - 1, revealed)}

Candidate's response: ${userResp}

PrepOps (evaluate approach, probe complexity and edge cases; follow coding reasoning phases; ${revealed ? 'solution has been revealed — evaluate their understanding' : `do NOT reveal optimal solution yet${revealNote ? `; ${revealNote}` : ''}`}; Claude holds full conversation context):`;
    }

    case 'mock': {
      const mockPhase  = MOCK_PHASES[phase] ?? 'Core Technical';
      const nextPhase  = turn > 0 && turn % 3 === 0 ? MOCK_PHASES[Math.min(phase + 1, 4)] : null;
      return `${CORE}${bp}

=== MOCK INTERVIEW MODE ===
${PROMPTS['mock_interview'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
Role: ${config.role}${config.company ? ` at ${config.company}` : ''} | Difficulty: ${config.difficulty}
Phase: ${mockPhase} (${phase + 1} of 5) | Turn: ${turn}
${nextPhase ? `Phase transition available: consider moving to ${nextPhase} if this phase is sufficiently explored.` : ''}

Candidate: ${userResp}

Interviewer (maintain persona; follow phase structure; do not coach; do not reveal correct answers; do not break character; Claude holds full conversation context):`;
    }

    case 'whiteboard': {
      const wbPhase = phase === 0 ? 'Requirements' : 'Design Review';
      const advNote = phase === 0 && turn > 3 ? 'Consider advancing to Design Review if requirements are sufficiently scoped.' : '';
      return `${CORE}${bp}

=== WHITEBOARD INTERVIEW MODE ===
${PROMPTS['whiteboard'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
Topic: ${config.wb_topic} | Difficulty: ${config.difficulty}
Phase: ${wbPhase} | Turn: ${turn}
${advNote}

Candidate: ${userResp}

Interviewer (${wbPhase} phase; probe one question at a time; ${advNote || 'continue scoping requirements'}; Claude holds full conversation context):`;
    }

    case 'system_design': {
      const sdPhase = SD_PHASES[Math.min(phase, 3)] ?? 'Adversarial';
      return `${CORE}${bp}

=== SYSTEM DESIGN MODE ===
${PROMPTS['system_design'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
System: ${config.sd_system} | Difficulty: ${config.difficulty}
${config.sd_scale ? `Scale: ${config.sd_scale}` : ''}${config.sd_constraints ? ` | Constraints: ${config.sd_constraints}` : ''}
Phase: ${sdPhase} (turns 1-3 Requirements, 4-6 High-Level, 7-10 Deep Dives, 11+ Adversarial) | Turn: ${turn}

Candidate: ${userResp}

Interviewer (current phase: ${sdPhase}; one probing question at a time; advance phase when current scope is exhausted; Claude holds full conversation context):`;
    }

    case 'rapid_fire': {
      const asked = (hidden?.rf_questions_asked ?? 0) + 1;
      const total = config.rf_count ?? 15;
      const done  = asked >= total;
      return `${CORE}${bp}

=== RAPID FIRE MODE ===
${PROMPTS['rapid_fire'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
Topic: ${config.topic} | Question ${asked} of ${total} | Difficulty: ${config.difficulty}
${done ? 'All questions complete — show the results grid.' : ''}

Candidate's answer: ${userResp}

PrepOps (brief ✓/~/✗ feedback on this answer; ${done ? 'show results grid, strongest area, weakest area, one next action' : 'ask the next question — one question only; adapt difficulty based on performance'}):`;
    }

    case 'mixed': {
      const budget  = config.session_length === 'quick' ? 10 : config.session_length === 'full' ? 30 : 20;
      const remaining = Math.max(0, budget - turn);
      return `${CORE}${bp}

=== MIXED MODE ===
${PROMPTS['mixed_mode'] ?? ''}

=== PERSONA ===
${persona}

=== SESSION STATE ===
Topic / role: ${config.topic} | Difficulty: ${config.difficulty} | Turn: ${turn} of ~${budget}
Remaining exchanges: ~${remaining}
${config.blueprint ? 'JD priorities active — weight topics toward JD requirements.' : ''}

Candidate: ${userResp}

PrepOps (follow Decision Engine; evaluate signal; if 3-4 exchanges have passed adapt mode; use one brief transition sentence if switching modes; do not announce mode change; Claude holds full conversation context):`;
    }

    default:
      return `${CORE}\n\nUser: ${userResp}\n\nPrepOps:`;
  }
}

// ── start_session ─────────────────────────────────────────────────────────────

export const startSessionDef: Tool = {
  name: 'start_session',
  description: [
    'Starts a PrepOps session in any mode.',
    'Returns the first structured session view and a session_token.',
    'The prompt field contains the PrepOps opening instruction — Claude should run it',
    'using its own reasoning to generate the first PrepOps message, then render the view.',
    'Pass session_token to continue_session for every subsequent user response.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      mode:             { type: 'string', description: 'PrepOps mode: concept | incident | debugging | coding | mock | whiteboard | system_design | rapid_fire | mixed' },
      topic:            { type: 'string', description: 'Topic, domain, system name, or architecture — interpretation depends on mode. For system_design: system to design (e.g. "distributed rate limiter"). For whiteboard: architecture topic. For concept/incident/rapid_fire/mixed: subject domain.' },
      difficulty:       { type: 'string', enum: ['Junior','Mid','Intermediate','Senior','Staff','Principal'], description: 'Default: Senior' },
      persona:          { type: 'string', description: 'Persona ID. Default: google_sre. For mock interview, specify explicitly.' },
      role:             { type: 'string', description: 'Role for mock interview (e.g. "Senior SRE", "Platform Engineer").' },
      session_variant:  { type: 'string', description: 'Sub-mode or format. concept: learn|flashcard|mcq. debugging lab: k8s_yaml|terraform|helm|promql|linux|custom. mock/mixed length: short|standard|full. rapid_fire count: 10|15|20|30 (use session_count instead for numeric).' },
      session_count:    { type: 'number', description: 'Number of questions for rapid_fire (10, 15, 20, or 30).' },
      jd_context:       { type: 'string', description: 'Job description text or key requirements. Use with mock interview for targeted questions.' },
      blueprint:        { type: 'string', description: 'Runtime blueprint from build_role_plan. Weights all session content toward the target role.' },
      custom_input:     { type: 'string', description: 'Additional context: custom coding problem, incident description, scale/constraints for system design, focus areas for mock interview.' },
    },
    required: ['mode'],
  },
};

export async function startSession(
  input: {
    mode:             string;
    topic?:           string;
    difficulty?:      string;
    persona?:         string;
    role?:            string;
    session_variant?: string;
    session_count?:   number;
    jd_context?:      string;
    blueprint?:       string;
    custom_input?:    string;
  },
  env: Env,
): Promise<ToolResult> {
  const diff    = (input.difficulty ?? 'Senior') as SessionState['config']['difficulty'];
  const persona = input.persona ?? 'google_sre';
  const topic   = input.topic;
  const variant = input.session_variant;
  const bp      = input.blueprint;

  let result: ToolResult;

  switch (input.mode) {
    case 'concept':
      if (!topic) return { error: 'concept mode requires topic.' };
      result = await startConceptSession({
        topic, difficulty: diff, persona,
        concept_mode: (variant ?? 'learn') as 'learn' | 'flashcard' | 'mcq',
        blueprint: bp,
      }, env);
      break;

    case 'incident':
      result = await startIncident({
        domain:      topic ?? 'kubernetes',
        difficulty:  diff,
        persona,
        incident_id: undefined,
        custom_text: input.custom_input,
        blueprint:   bp,
      }, env);
      break;

    case 'debugging':
      result = await startDebuggingLab({
        lab_type:   variant ?? 'k8s_yaml',
        topic,
        difficulty: diff,
        blueprint:  bp,
      }, env);
      break;

    case 'coding':
      result = await startCodingReasoning({
        difficulty:    diff,
        persona,
        coding_source: input.custom_input ? 'custom' : 'auto',
        custom_problem:input.custom_input,
        company:       topic,
        blueprint:     bp,
      }, env);
      break;

    case 'mock':
      if (!input.role && !topic) return { error: 'mock mode requires role (e.g. "Senior SRE") or topic.' };
      result = await startMockInterview({
        role:             input.role ?? `${topic} Engineer`,
        difficulty:       diff,
        persona,
        interview_length: (variant ?? 'standard') as 'short' | 'standard' | 'full',
        company:          undefined,
        jd_context:       input.jd_context ?? input.custom_input,
        blueprint:        bp,
      }, env);
      break;

    case 'whiteboard':
      if (!topic) return { error: 'whiteboard mode requires topic (architecture subject).' };
      result = await startWhiteboard({ topic, difficulty: diff, persona, blueprint: bp }, env);
      break;

    case 'system_design':
      if (!topic) return { error: 'system_design mode requires topic (system to design).' };
      result = await startSystemDesign({
        system:      topic,
        difficulty:  diff,
        persona,
        scale:       undefined,
        constraints: input.custom_input,
        blueprint:   bp,
      }, env);
      break;

    case 'rapid_fire':
      if (!topic) return { error: 'rapid_fire mode requires topic.' };
      result = await startRapidFire({
        topic,
        difficulty: diff,
        persona,
        count:      input.session_count ?? (variant ? parseInt(variant, 10) || 15 : 15),
        blueprint:  bp,
      }, env);
      // Rapid fire may return a redirect for coding topics
      if ('redirect' in result) return { view: 'setup', ...result };
      break;

    case 'mixed':
      if (!topic) return { error: 'mixed mode requires topic.' };
      result = await startMixedMode({
        topic,
        difficulty:     diff,
        persona,
        session_length: (variant ?? 'standard') as 'quick' | 'standard' | 'full',
        blueprint:      bp,
      }, env);
      break;

    default:
      return { error: `Unknown mode: ${input.mode}. Valid modes: concept, incident, debugging, coding, mock, whiteboard, system_design, rapid_fire, mixed` };
  }

  // Decode token to get state for view metadata (token was just signed above)
  const state = await verifyToken(result['session_token'] as string, env.SESSION_SECRET);
  const view  = modeToView(input.mode, input.mode === 'concept' ? (variant ?? 'learn') : undefined);
  const meta  = state ? buildViewMeta(state) : {};

  return {
    view,
    session_token: result['session_token'],
    prompt:        result['prompt'],
    ...meta,
    prepops_note: 'Run the prompt field through your reasoning to generate the first PrepOps message. Render the view fields as context for the user.',
  };
}

// ── continue_session ──────────────────────────────────────────────────────────

export const continueSessionDef: Tool = {
  name: 'continue_session',
  description: [
    'Handles every user response while a PrepOps session is active.',
    'ALWAYS call this for every user message when a session_token exists.',
    'Do NOT answer the candidate directly, generate the next question independently,',
    'or change phase, difficulty, or persona outside of this tool.',
    'Returns the next structured view with a PrepOps prompt and updated session_token.',
    'The prompt field contains the PrepOps instruction — Claude runs it using',
    'its conversation context and generates the PrepOps response.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      session_token:      { type: 'string', description: 'Token from start_session or the previous continue_session call.' },
      user_response:      { type: 'string', description: 'Exactly what the user said.' },
      optional_hypothesis:{ type: 'string', description: 'For incident mode: hypothesis the engineer has stated.' },
      optional_action:    { type: 'string', description: 'For incident mode: action type (run command / state hypothesis / request slack / propose mitigation).' },
    },
    required: ['session_token', 'user_response'],
  },
};

export async function continueSession(
  input: {
    session_token:       string;
    user_response:       string;
    optional_hypothesis?:string;
    optional_action?:    string;
  },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token. Start a new session with start_session.' };

  const { config, hidden } = state;
  const turn   = (state.turn_count ?? 0) + 1;

  // Compute updated hidden state per mode
  let updatedHidden = { ...hidden };

  if (config.mode === 'incident') {
    const phase = incidentPhaseFromTurn(turn);
    const phaseIndex = phase === 'Opening' ? 0 : phase === 'Investigation' ? 1 : phase === 'Resolution' ? 2 : 3;
    updatedHidden = {
      ...hidden,
      incident_phase: phaseIndex === 0 ? 'opening' : phaseIndex === 1 ? 'investigation' : phaseIndex === 2 ? 'resolution' : 'debrief',
    };
    if (input.optional_hypothesis) {
      updatedHidden['working_hypothesis'] = input.optional_hypothesis;
    }
  }

  if (config.mode === 'coding') {
    const revealed = (hidden?.coding_revealed ?? false) || turn >= 4;
    updatedHidden = { ...hidden, coding_revealed: revealed };
  }

  if (config.mode === 'rapid_fire') {
    updatedHidden = { ...hidden, rf_questions_asked: (hidden?.rf_questions_asked ?? 0) + 1 };
  }

  // Compute phase index for modes that track phase numerically
  let updatedPhase = state.phase;
  if (config.mode === 'mock')          updatedPhase = Math.min(4, Math.floor(turn / 3));
  if (config.mode === 'whiteboard')    updatedPhase = turn <= 3 ? 0 : 1;
  if (config.mode === 'system_design') updatedPhase = turn <= 3 ? 0 : turn <= 6 ? 1 : turn <= 10 ? 2 : 3;

  // Build updated session state
  const updatedState: SessionState = {
    ...state,
    turn_count: turn,
    phase:      updatedPhase,
    hidden:     updatedHidden,
  };

  // Build the mode-specific continuation prompt
  const prompt = buildContinuePrompt(
    updatedState,
    input.user_response,
    input.optional_hypothesis,
    input.optional_action,
  );

  // Sign new token
  const newToken = await signToken(updatedState, env.SESSION_SECRET);

  const view = modeToView(config.mode, config.concept_mode);
  const meta = buildViewMeta(updatedState);

  return {
    view,
    session_token:  newToken,
    prompt,
    ...meta,
    prepops_note: 'Run the prompt field through your reasoning to generate the PrepOps response. Do not answer the candidate independently.',
  };
}
