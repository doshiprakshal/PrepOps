import type { Tool, ToolResult } from './index.js';
import { CORE, PROMPTS, RUBRICS } from '../assets/engine.js';

// ── prepare_role_research ──────────────────────────────────────────────────────

export const prepareRoleResearchDef: Tool = {
  name: 'prepare_role_research',
  description: [
    'Call when the user pastes a job description (300+ words containing "Requirements",',
    '"Responsibilities", "Qualifications", "What you\'ll do", or "Years of experience").',
    'Extracts company, role, level, and required technologies from the JD.',
    'Returns research questions for Claude to answer via web search.',
    'After web search, call build_role_plan with the JD text and research findings.',
    'PrepOps does not perform web search — Claude does.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      jd_text:      { type: 'string', description: 'Full job description text.' },
      resume_text:  { type: 'string', description: 'Candidate background or resume notes (optional).' },
      known_details:{ type: 'string', description: 'Known details about the interview process (optional).' },
    },
    required: ['jd_text'],
  },
};

export function prepareRoleResearch(input: {
  jd_text: string;
  resume_text?: string;
  known_details?: string;
}): ToolResult {
  const prompt = `${CORE}

${PROMPTS['jd_parser'] ?? ''}

=== TASK: EXTRACT AND GENERATE RESEARCH QUESTIONS ===
Job Description:
${input.jd_text}

${input.resume_text  ? `Candidate Background:\n${input.resume_text}\n` : ''}
${input.known_details ? `Known Interview Details:\n${input.known_details}\n` : ''}

Extract and return a JSON object with:
{
  "company": "...",
  "role": "...",
  "level": "Junior|Mid|Senior|Staff|Principal",
  "required_technologies": ["..."],
  "research_questions": [
    "What does the {company} {level} {role} interview loop look like?",
    "What technical topics does {company} focus on for this role?",
    "What are the core engineering values or leadership principles {company} evaluates?",
    "What production systems does this team own?",
    "What do current and former engineers say about interview difficulty and style?"
  ]
}

Return ONLY the JSON object.`;

  return {
    view: 'setup',
    prompt,
    next_steps: [
      '1. Run this prompt through Claude to extract company/role/level and generate research questions.',
      '2. Use web search to answer each research_question.',
      '3. Collect all findings as a single research_findings string.',
      '4. Call build_role_plan with: jd_text, resume_text (if any), research_findings, known_details.',
    ],
    note: 'PrepOps does not perform web search. Claude performs it and passes findings to build_role_plan.',
  };
}

// ── build_role_plan ────────────────────────────────────────────────────────────

export const buildRolePlanDef: Tool = {
  name: 'build_role_plan',
  description: [
    'Assembles the PrepOps JD-parser prompt for Claude to execute.',
    'Call after prepare_role_research and web search.',
    'Returns a prompt Claude should run to generate the runtime blueprint and role prep plan.',
    'The blueprint exists only for the current session — nothing is written permanently.',
    'After running the prompt, extract the <<<BLUEPRINT_META...>>> block and pass the full',
    'blueprint to start_session via the blueprint parameter.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      jd_text:           { type: 'string', description: 'Full job description.' },
      resume_text:       { type: 'string', description: 'Candidate background (optional).' },
      research_findings: { type: 'string', description: 'Web research findings from prepare_role_research (recommended).' },
      known_details:     { type: 'string', description: 'Known interview process details (optional).' },
      timeline:          { type: 'string', description: 'Interview timeline (optional, e.g. "3 weeks").' },
    },
    required: ['jd_text'],
  },
};

export function buildRolePlan(input: {
  jd_text:            string;
  resume_text?:       string;
  research_findings?: string;
  known_details?:     string;
  timeline?:          string;
}): ToolResult {
  const prompt = `${CORE}

=== JD PARSER INSTRUCTIONS ===
${PROMPTS['jd_parser'] ?? ''}

=== EVALUATION RUBRIC ===
${RUBRICS['evaluation'] ?? ''}

=== HIRING SIGNALS ===
${RUBRICS['hiring_signals'] ?? ''}

=== INPUTS ===
Job Description:
${input.jd_text}

${input.resume_text        ? `Candidate Background:\n${input.resume_text}\n`           : ''}
${input.research_findings  ? `Research Findings:\n${input.research_findings}\n`        : 'Research Status: Model knowledge only — apply ★★★☆☆ confidence to company-specific claims.\n'}
${input.known_details      ? `Known Interview Details:\n${input.known_details}\n`      : ''}
${input.timeline           ? `Interview Timeline: ${input.timeline}\n`                 : ''}

=== REQUIRED OUTPUT ===
Generate the full PrepOps runtime blueprint following the JD Parser instructions above.

Show the role prep plan in the role_prep_plan view format:
- SUCCESS FACTORS (3-5 things that make someone pass this interview)
- TOPIC PRIORITIES (ranked list: topic, PrepOps coverage, confidence)
- GAP ANALYSIS (resume vs JD requirements: ✓ Strong / ⚠ Partial / ✗ Missing)
- TODAY / TOMORROW / THIS WEEKEND / NEXT WEEK action plan

At the very end, append this meta block exactly:
<<<BLUEPRINT_META
preferred_persona: {persona_id}
top_domain: {domain}
level: {Junior|Mid|Senior|Staff|Principal}
role_title: {exact role title}
company: {company name}
>>>`;

  return {
    view: 'role_prep_plan',
    prompt,
    instructions: [
      'Run this prompt through Claude to generate the runtime blueprint and role prep plan.',
      'Parse the <<<BLUEPRINT_META...>>> block to extract preferred_persona, top_domain, level, role_title, company.',
      'Store the full response as the runtime blueprint.',
      'Pass the blueprint to start_session via the blueprint parameter for targeted sessions.',
    ],
    note: 'The blueprint is session-only. PrepOps never stores it permanently.',
  };
}
