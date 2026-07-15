import type { Tool, ToolResult } from './index.js';
import { CORE, PROMPTS, RUBRICS } from '../assets/engine.js';

export const buildRuntimeBlueprintDef: Tool = {
  name: 'build_runtime_blueprint',
  description: 'Assembles the PrepOps JD-parser prompt for Claude to execute. Returns a prompt Claude should run to generate the runtime blueprint. The blueprint exists only for the current session — nothing is written permanently.',
  inputSchema: {
    type: 'object',
    properties: {
      jd_text:           { type: 'string', description: 'Full job description' },
      resume_text:       { type: 'string', description: 'Candidate background (optional)' },
      research_findings: { type: 'string', description: 'Web research findings from prepare_research_request (optional but recommended)' },
      known_details:     { type: 'string', description: 'Known details about the interview process (optional)' },
      timeline:          { type: 'string', description: 'Interview timeline (optional, e.g. "3 weeks")' },
    },
    required: ['jd_text'],
  },
};

export function buildRuntimeBlueprint(input: {
  jd_text:           string;
  resume_text?:      string;
  research_findings?:string;
  known_details?:    string;
  timeline?:         string;
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

${input.resume_text ? `Candidate Background:\n${input.resume_text}\n` : ''}
${input.research_findings ? `Research Findings:\n${input.research_findings}\n` : 'Research Status: Model knowledge only — apply ★★★☆☆ confidence to company-specific claims.\n'}
${input.known_details ? `Known Interview Details:\n${input.known_details}\n` : ''}
${input.timeline ? `Interview Timeline: ${input.timeline}\n` : ''}

=== REQUIRED OUTPUT ===
Generate the full runtime blueprint following the JD Parser instructions above.

At the very end of your response, append this meta block exactly:
<<<BLUEPRINT_META
preferred_persona: {persona_id}
top_domain: {domain}
level: {Junior|Mid|Senior|Staff|Principal}
role_title: {exact role title}
company: {company name}
>>>`;

  return {
    prompt,
    instructions: [
      'Run this prompt through Claude.',
      'Store the full response as the runtime blueprint.',
      'Parse the <<<BLUEPRINT_META...>>> block to extract preferred_persona, top_domain, level, role_title, company.',
      'Pass the blueprint text to subsequent start_* tool calls via the blueprint parameter.',
    ],
  };
}
