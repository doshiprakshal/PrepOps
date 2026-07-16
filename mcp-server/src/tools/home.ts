import type { Tool, ToolResult } from './index.js';
import { MANIFEST } from '../assets/engine.js';

// ── Types derived from manifest shape ─────────────────────────────────────────

interface ManifestMode {
  display:         string;
  description:     string;
  best_for?:       string[];
  start_tool?:     string;
  required_params?:string[];
  optional_params?:string[];
  phases?:         string[];
  sub_modes?:      string[];
  lab_types?:      string[];
  no_hire_signal?: boolean;
  signal_label?:   string;
  hire_signal_min_exchanges?: number;
  coding_only?:    boolean;
  internal?:       boolean;
  coding_redirect?:boolean;
}

interface PersonaMeta { label: string; sub: string; }

const MODES        = MANIFEST['modes']            as Record<string, ManifestMode>;
const PERSONA_META = MANIFEST['persona_metadata'] as Record<string, PersonaMeta>;
const DIFFICULTIES = MANIFEST['difficulties']     as string[];

// Keywords that indicate a coding-only topic — redirects away from infra modes.
const CODING_KEYWORDS = [
  'algorithm', 'data structure', 'leetcode', 'dsa', 'dynamic programming',
  'binary search', 'linked list', 'tree traversal', 'graph algorithm', 'big o', 'sorting',
];

function isCodingTopic(topic: string): boolean {
  const t = topic.toLowerCase();
  return CODING_KEYWORDS.some(k => t.includes(k));
}

function relevantModes(topic?: string): Array<ManifestMode & { id: string }> {
  const all = Object.entries(MODES)
    .filter(([, m]) => !m.internal)          // exclude jd_parser (internal)
    .map(([id, m]) => ({ id, ...m }));

  if (!topic) return all;

  // Coding topics → only coding mode
  if (isCodingTopic(topic)) {
    return all.filter(m => m.id === 'coding');
  }

  // Infra topics → everything except coding-only modes
  return all.filter(m => !m.coding_only);
}

// ── Tool definition ────────────────────────────────────────────────────────────

export const engineManifestDef: Tool = {
  name: 'get_engine_manifest',
  description: [
    'Returns PrepOps engine data: available modes (filtered by topic if provided),',
    'required and optional parameters for each start_* tool, valid persona IDs,',
    'difficulty levels, and curriculum coverage signal.',
    '',
    'WHEN TO CALL THIS TOOL:',
    '- You need to confirm valid persona IDs before calling start_mock_interview.',
    '- You need to check which modes apply to an unusual topic.',
    '- The user explicitly asks "what can PrepOps do?" or "show me all modes".',
    '',
    'DO NOT call this as the first action for every session. If the user has expressed',
    'clear intent (e.g. "mock interview on Kubernetes" or "teach me Terraform state"),',
    'go directly to the appropriate start_* tool without calling this first.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Optional topic to filter modes (e.g. "kubernetes", "algorithms"). Coding topics return only start_coding_reasoning.',
      },
    },
    required: [],
  },
};

export function getEngineManifest(input: { topic?: string }): ToolResult {
  const modes = relevantModes(input.topic);

  return {
    modes: modes.map(m => ({
      id:              m.id,
      display:         m.display,
      description:     m.description,
      start_tool:      m.start_tool,
      required_params: m.required_params ?? [],
      optional_params: m.optional_params ?? [],
      ...(m.sub_modes         ? { sub_modes:    m.sub_modes }    : {}),
      ...(m.lab_types         ? { lab_types:    m.lab_types }    : {}),
      ...(m.phases            ? { phases:       m.phases }       : {}),
      ...(m.no_hire_signal    ? { no_hire_signal: true }         : {}),
      ...(m.signal_label      ? { signal_label: m.signal_label } : {}),
      ...(m.coding_redirect   ? { coding_redirect: true }        : {}),
    })),
    personas: Object.entries(PERSONA_META).map(([id, meta]) => ({
      id,
      label: meta.label,
      sub:   meta.sub,
    })),
    difficulties: DIFFICULTIES,
    topic_filter:   input.topic ?? null,
    coding_redirect: input.topic ? isCodingTopic(input.topic) : false,
    engine_version:  MANIFEST['version'] as string,
    note: 'Use modes[].start_tool to know which tool to call. Default difficulty: Senior. Default persona: google_sre.',
  };
}
