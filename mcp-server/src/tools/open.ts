import type { Tool, ToolResult } from './index.js';
import { MANIFEST } from '../assets/engine.js';

interface ManifestMode {
  display:      string;
  description:  string;
  start_tool?:  string;
  required_params?: string[];
  internal?:    boolean;
}

export const openPrepOpsDef: Tool = {
  name: 'open_prepops',
  description: [
    'Entry point for PrepOps. Call when user says "Open PrepOps", "Start PrepOps",',
    '"What can PrepOps do?", or any generic entry intent.',
    'Returns the home view: all available modes loaded from the shared engine manifest,',
    'and a custom-input option for users who know what they want.',
    'Do NOT call this when the user has already expressed a specific intent',
    '(e.g. "mock interview on Kubernetes") — call resolve_input or start_session instead.',
  ].join(' '),
  inputSchema: { type: 'object', properties: {}, required: [] },
};

export function openPrepOps(): ToolResult {
  const allModes = MANIFEST['modes'] as Record<string, ManifestMode>;

  const modes = Object.entries(allModes)
    .filter(([, m]) => !m.internal)
    .map(([id, m]) => ({
      id,
      display:         m.display,
      description:     m.description,
      start_tool:      m.start_tool,
      required_params: m.required_params ?? [],
    }));

  return {
    view: 'home',
    modes,
    custom_input: {
      description: 'Tell PrepOps what you want. It will pick the right mode.',
      examples: [
        'Mock interview on Kubernetes networking',
        'Teach me Terraform state management',
        'Production incident scenario — Kubernetes',
        'Design a distributed rate limiter',
        'Rapid fire quiz on Linux',
        'Debugging lab — broken Kubernetes YAML',
        'Flashcards for SRE error budgets',
      ],
    },
    jd_flow: {
      description: 'Have a job description? Paste it to get a personalized role prep plan.',
      tool: 'prepare_role_research',
    },
    engine_version: MANIFEST['version'] as string,
  };
}
