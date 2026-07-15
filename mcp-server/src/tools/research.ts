import type { Tool, ToolResult } from './index.js';
import { CORE, PROMPTS } from '../assets/engine.js';

export const resolveTopicDef: Tool = {
  name: 'resolve_topic',
  description: 'Given a topic string, returns whether PrepOps has a structured curriculum for it and what the curriculum covers. Use this before starting any session to confirm coverage.',
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Topic the user wants to practice (e.g. "kubernetes", "linux processes", "terraform state")' },
      mode:  { type: 'string', description: 'Intended mode: concept | incident | debugging | rapid_fire | mixed' },
    },
    required: ['topic'],
  },
};

const FULL_CURRICULUM = [
  'kubernetes', 'linux', 'aws', 'networking', 'terraform', 'sre',
  'k8s', 'containers', 'docker', 'pods', 'services', 'ingress',
  'iam', 'ec2', 'autoscaling', 'dns', 'tcp', 'load balancing',
  'processes', 'filesystems', 'performance', 'state', 'modules', 'drift',
  'slo', 'error budget', 'incident response', 'reliability',
];

const CODING_KEYWORDS = [
  'algorithm', 'data structure', 'leetcode', 'dsa', 'dynamic programming',
  'binary search', 'linked list', 'tree traversal', 'graph algorithm', 'big o', 'sorting',
];

export function resolveTopic(input: { topic: string; mode?: string }): ToolResult {
  const t = input.topic.toLowerCase();
  const isCodingTopic = CODING_KEYWORDS.some(k => t.includes(k));

  if (isCodingTopic) {
    return {
      topic: input.topic,
      coverage: 'redirect',
      redirect_to: 'coding',
      reason: 'Coding/algorithm topics use Coding Reasoning so PrepOps can evaluate approach, complexity, and communication.',
    };
  }

  const hasCurriculum = FULL_CURRICULUM.some(k => t.includes(k));
  return {
    topic: input.topic,
    coverage: hasCurriculum ? 'full' : 'general',
    curriculum_note: hasCurriculum
      ? `PrepOps has a full structured curriculum for this topic — questions will use production-grounded scenarios, common misconceptions, and real debugging scenarios.`
      : `PrepOps has no structured curriculum for "${input.topic}" — Claude will draw on general knowledge and be upfront about it.`,
  };
}

export const prepareResearchRequestDef: Tool = {
  name: 'prepare_research_request',
  description: 'Given a job description, extracts company, role, level, required technologies, and returns research questions. Claude should then perform web search to answer these questions before calling build_runtime_blueprint.',
  inputSchema: {
    type: 'object',
    properties: {
      jd_text:      { type: 'string', description: 'Full job description text' },
      resume_text:  { type: 'string', description: 'Candidate resume or background notes (optional)' },
      known_details:{ type: 'string', description: 'Known details about the interview process (optional)' },
    },
    required: ['jd_text'],
  },
};

export function prepareResearchRequest(input: {
  jd_text: string;
  resume_text?: string;
  known_details?: string;
}): ToolResult {
  const prompt = `${CORE}

${PROMPTS['jd_parser'] ?? ''}

=== TASK: EXTRACT AND GENERATE RESEARCH QUESTIONS ===
Job Description:
${input.jd_text}

${input.resume_text ? `Candidate Background:\n${input.resume_text}` : ''}
${input.known_details ? `Known Interview Details:\n${input.known_details}` : ''}

Extract and return a JSON object with:
{
  "company": "...",
  "role": "...",
  "level": "Junior|Mid|Senior|Staff|Principal",
  "required_technologies": ["..."],
  "research_questions": [
    "What does the {company} {level} {role} interview loop look like in 2024–2025?",
    "What technical topics does {company} focus on for this role?",
    "What are the core engineering values or leadership principles {company} evaluates?",
    "What production systems does this team own?",
    "What do current and former engineers say about interview difficulty and style?"
  ]
}

Return ONLY the JSON object.`;

  return {
    prompt,
    instructions: [
      '1. Run this prompt through Claude to extract company/role/level and generate research questions.',
      '2. Use Claude\'s web search to answer each research_question.',
      '3. Collect the findings as a single research_findings string.',
      '4. Call build_runtime_blueprint with: jd_text, resume_text (if any), research_findings, known_details.',
    ],
  };
}
