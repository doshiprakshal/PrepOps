import type { Tool, ToolResult } from './index.js';
import { MANIFEST } from '../assets/engine.js';

// ── Intent keyword maps ────────────────────────────────────────────────────────

const MODE_PATTERNS: Array<{ mode: string; patterns: RegExp }> = [
  { mode: 'mock',          patterns: /mock interview|practice interview|act as interviewer|interviewing me|interview prep/i },
  { mode: 'system_design', patterns: /system design|design a system|design interview|architect a |design \w+ (system|service|platform|pipeline)/i },
  { mode: 'whiteboard',    patterns: /whiteboard|explain (my |the )?architecture|architecture interview|draw out|walk me through.*architecture/i },
  { mode: 'incident',      patterns: /incident|on-call|oncall|production (issue|outage|problem|failure)|troubleshoot|simulate.*outage/i },
  { mode: 'debugging',     patterns: /debug(ging)?( lab)?|broken config|diagnose|fix (this |the )?(config|yaml|terraform|helm)|lab/i },
  { mode: 'rapid_fire',    patterns: /rapid fire|quick questions|breadth check|quiz me quickly|lots of questions|rapid quiz/i },
  { mode: 'mixed',         patterns: /mixed( mode)?|adaptive|let (prepops|you) decide|surprise me|mixed session|you pick/i },
  { mode: 'coding',        patterns: /coding (problem|challenge|interview|question)|algorithm|leetcode|data structure|big.?o|dsa/i },
  { mode: 'concept',       patterns: /teach me|learn|explain|study|flashcard|flash card|mcq|multiple choice|understand/i },
];

const DOMAIN_PATTERNS: Array<{ domain: string; patterns: RegExp }> = [
  { domain: 'kubernetes', patterns: /kubernetes|k8s|pod|deployment|kubectl|helm|kube/i },
  { domain: 'linux',      patterns: /linux|bash|shell|systemd|process|filesystem|inode/i },
  { domain: 'terraform',  patterns: /terraform|state|module|tfstate|hcl/i },
  { domain: 'aws',        patterns: /aws|amazon|ec2|s3|iam|vpc|rds|eks|lambda/i },
  { domain: 'networking', patterns: /network(ing)?|dns|tcp|bgp|load.?balanc|firewall|vlan|cidr/i },
  { domain: 'sre',        patterns: /sre|slo|sla|error budget|reliability|on.?call|postmortem/i },
];

const CONCEPT_MODE_PATTERNS: Record<string, RegExp> = {
  flashcard: /flashcard|flash card/i,
  mcq:       /mcq|multiple.?choice/i,
  learn:     /teach|learn|explain|study|understand/i,
};

const DIFFICULTY_PATTERNS: Array<{ level: string; patterns: RegExp }> = [
  { level: 'Junior',      patterns: /junior|beginner|entry.?level|new to/i },
  { level: 'Mid',         patterns: /\bmid\b|intermediate/i },
  { level: 'Staff',       patterns: /staff|principal|architect|director/i },
  { level: 'Senior',      patterns: /senior/i },
];

// ── Required params per mode ───────────────────────────────────────────────────

const MODE_REQUIRED: Record<string, string[]> = {
  concept:       ['topic', 'difficulty'],
  incident:      ['topic', 'difficulty'],   // topic → incident domain
  debugging:     ['difficulty'],
  coding:        ['difficulty'],
  mock:          ['role', 'difficulty'],
  whiteboard:    ['topic', 'difficulty'],   // topic → wb_topic
  system_design: ['topic', 'difficulty'],   // topic → sd_system
  rapid_fire:    ['topic', 'difficulty'],
  mixed:         ['topic', 'difficulty'],
};

const MODE_SETUP_QUESTIONS: Record<string, (inferred: Record<string, string>) => string> = {
  mock:          (i) => `What role should I interview you for? ${i['topic'] ? `(e.g. "${i['topic']?.toUpperCase()} Engineer", "${i['topic']?.toUpperCase()} SRE", "Platform Engineer")` : '(e.g. "Senior SRE", "Platform Engineer", "DevOps Lead")'}`,
  system_design: ()  => 'What system should we design? (e.g. "distributed rate limiter", "multi-region Kubernetes cluster", "logging pipeline")',
  whiteboard:    ()  => 'What architecture topic? (e.g. "Kubernetes networking", "multi-region failover", "service mesh")',
  concept:       ()  => 'Which topic? (Kubernetes · Linux · Terraform · AWS · Networking · SRE · Docker · Helm · CI/CD · Prometheus)',
  incident:      ()  => 'Which domain? (kubernetes · linux · networking · sre · aws · terraform)',
  rapid_fire:    ()  => 'Which topic for the quiz? (Kubernetes · Linux · Terraform · AWS · Networking · SRE)',
  mixed:         ()  => 'What area to focus on? (e.g. "Kubernetes SRE", "AWS networking", "Site Reliability Engineering")',
  debugging:     ()  => null as unknown as string,  // no required topic for debugging
  coding:        ()  => null as unknown as string,  // no required topic for coding
};

// ── Inference helpers ─────────────────────────────────────────────────────────

function inferMode(req: string): string | null {
  for (const { mode, patterns } of MODE_PATTERNS) {
    if (patterns.test(req)) return mode;
  }
  return null;
}

function inferDomain(req: string): string | null {
  for (const { domain, patterns } of DOMAIN_PATTERNS) {
    if (patterns.test(req)) return domain;
  }
  return null;
}

function inferConceptMode(req: string): string {
  for (const [mode, pattern] of Object.entries(CONCEPT_MODE_PATTERNS)) {
    if (pattern.test(req)) return mode;
  }
  return 'learn';
}

function inferDifficulty(req: string): string {
  for (const { level, patterns } of DIFFICULTY_PATTERNS) {
    if (patterns.test(req)) return level;
  }
  return 'Senior';
}

function inferRole(req: string, domain: string | null): string | null {
  const roleMatch = req.match(/(?:for|as)\s+(?:a\s+)?(.{3,40}?)\s+(?:role|interview|position|job|engineer)/i);
  if (roleMatch?.[1]) return roleMatch[1].trim();
  if (domain === 'sre' || /sre/i.test(req)) return 'SRE';
  if (/devops/i.test(req)) return 'DevOps Engineer';
  if (/platform/i.test(req)) return 'Platform Engineer';
  return null;
}

function inferTopic(req: string, mode: string | null, domain: string | null): string | null {
  // System design: extract the system name
  if (mode === 'system_design') {
    const sdMatch = req.match(/design\s+(?:a\s+|an\s+)?(.+?)(?:\s+system|\s+service|\s+platform|\s+interview)?$/i);
    if (sdMatch?.[1]) return sdMatch[1].trim();
    return domain;
  }
  // Whiteboard: extract the architecture topic
  if (mode === 'whiteboard') {
    const wbMatch = req.match(/whiteboard\s+(?:on\s+)?(.+)/i) || req.match(/architecture\s+(?:of\s+)?(.+)/i);
    if (wbMatch?.[1]) return wbMatch[1].trim();
    return domain;
  }
  return domain;
}

// ── Tool ──────────────────────────────────────────────────────────────────────

export const resolveInputDef: Tool = {
  name: 'resolve_input',
  description: [
    'Resolves user intent into a PrepOps session configuration.',
    'Call this when the user has stated what they want to practice but the mode',
    'or a required parameter is still ambiguous.',
    'Returns a setup view with inferred parameters and the single most important',
    'missing piece. If can_start_immediately is true, call start_session directly.',
    'Do NOT use this as the first step for every session —',
    'only call it when you cannot fully determine the mode and params from the user message.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      user_request: {
        type: 'string',
        description: 'Exactly what the user said they want to practice.',
      },
    },
    required: ['user_request'],
  },
};

export function resolveInput(input: { user_request: string }): ToolResult {
  const req   = input.user_request;
  const mode  = inferMode(req);
  const domain = inferDomain(req);
  const diff  = inferDifficulty(req);

  const topic   = inferTopic(req, mode, domain);
  const cmMode  = mode === 'concept' ? inferConceptMode(req) : undefined;
  const role    = mode === 'mock' ? inferRole(req, domain) : undefined;

  const inferred: Record<string, string> = {
    ...(mode             ? { mode }        : {}),
    ...(topic            ? { topic }       : {}),
    ...(diff             ? { difficulty: diff } : {}),
    ...(cmMode           ? { concept_mode: cmMode } : {}),
    ...(role             ? { role }        : {}),
    persona: 'google_sre',
  };

  // Determine what required params are still missing
  const required = mode ? (MODE_REQUIRED[mode] ?? []) : [];
  const missingRequired: string[] = [];

  if (!mode)         missingRequired.push('mode');
  if (required.includes('topic') && !topic) missingRequired.push('topic');
  if (required.includes('role')  && !role)  missingRequired.push('role');

  const canStart = missingRequired.length === 0;

  // Build the single most important setup question
  let setupQuestion: string | null = null;
  if (!mode) {
    // Get all non-internal modes from manifest
    interface ManifestMode { display: string; description: string; internal?: boolean }
    const allModes = MANIFEST['modes'] as Record<string, ManifestMode>;
    const modeList = Object.entries(allModes)
      .filter(([, m]) => !m.internal)
      .map(([, m]) => m.display)
      .join(' · ');
    setupQuestion = `What kind of practice? ${modeList}`;
  } else if (missingRequired.includes('topic') || missingRequired.includes('role')) {
    const questionFn = MODE_SETUP_QUESTIONS[mode];
    if (questionFn) setupQuestion = questionFn(inferred);
  }

  return {
    view: 'setup',
    user_request:         req,
    inferred,
    missing_required:     missingRequired,
    can_start_immediately: canStart,
    ...(setupQuestion   ? { setup_question: setupQuestion }         : {}),
    ...(canStart        ? { start_session_params: { ...inferred } } : {}),
  };
}
