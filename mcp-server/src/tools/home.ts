import type { Tool, ToolResult } from './index.js';

export const homeToolDef: Tool = {
  name: 'get_home_options',
  description: 'Returns all available PrepOps practice modes with descriptions and CTAs. Call this first when the user wants to start a PrepOps session.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export function getHomeOptions(): ToolResult {
  return {
    modes: [
      { id: 'concept',       title: 'Concept Prep',         description: 'Adaptive Socratic teaching, flashcards, and MCQ for any infrastructure topic.',                       cta: 'Choose a topic →',       sub_modes: ['learn', 'flashcard', 'mcq'] },
      { id: 'incident',      title: 'Production Scenarios',  description: "Live incident simulation — you're on-call, PrepOps responds as the terminal.",                        cta: 'Start an incident →' },
      { id: 'debugging',     title: 'Debugging Lab',         description: 'Broken configs and outputs — diagnose root cause and propose a safe fix.',                            cta: 'Start a lab →',         lab_types: ['k8s_yaml', 'terraform', 'helm', 'promql', 'linux', 'custom'] },
      { id: 'coding',        title: 'Coding Reasoning',      description: 'Problem walkthrough: approach, complexity, communication, and optimal reveal.',                        cta: 'Start a problem →' },
      { id: 'jd_parser',     title: 'Prepare for a Role',    description: 'Paste a JD — PrepOps builds a prep plan, gap analysis, and targeted sessions.',                       cta: 'Start role prep →' },
      { id: 'whiteboard',    title: 'Whiteboard Interview',  description: 'Explain architectures — requirements, design, failure handling, and trade-offs.',                     cta: 'Start whiteboard →',    phases: ['Requirements', 'Design Review'] },
      { id: 'system_design', title: 'System Design',         description: 'Design a full system across 4 structured phases with adversarial probing.',                           cta: 'Design a system →',     phases: ['Requirements', 'High-Level', 'Deep Dives', 'Adversarial'] },
      { id: 'rapid_fire',    title: 'Rapid Fire',            description: 'Fast-paced breadth check — one question at a time, instant feedback.',                                cta: 'Start rapid fire →',    counts: [10, 15, 20, 30] },
      { id: 'mixed',         title: 'Mixed Mode',            description: 'PrepOps controls the mode mix based on your performance in one continuous session.',                   cta: 'Start mixed session →', lengths: ['quick', 'standard', 'full'] },
      { id: 'mock',          title: 'Mock Interview',         description: 'Full 5-phase persona-driven interview with a PrepOps rubric signal verdict.',                         cta: 'Start mock →',          phases: ['Warm-up', 'Core Technical', 'Curveball', 'Production', 'Closing'] },
    ],
    personas: [
      { id: 'google_sre',         label: 'Google SRE',         sub: 'Systems thinking, SLOs, scale' },
      { id: 'amazon_devops',      label: 'Amazon DevOps',      sub: 'Leadership Principles, operational excellence' },
      { id: 'netflix_sre',        label: 'Netflix SRE',        sub: 'Failure tolerance, chaos, freedom & responsibility' },
      { id: 'stripe_engineering', label: 'Stripe Engineering',  sub: 'Precision, correctness, edge cases' },
      { id: 'startup_devops',     label: 'Startup DevOps',     sub: 'Breadth, pragmatism, ship-first' },
      { id: 'staff_engineer',     label: 'Staff Engineer',     sub: 'Architecture, trade-offs, org impact' },
      { id: 'principal_engineer', label: 'Principal Engineer', sub: 'Industry direction, build vs buy' },
      { id: 'friendly_mentor',    label: 'Friendly Mentor',    sub: 'Supportive, patient, hints available' },
      { id: 'strict_bar_raiser',  label: 'Strict Bar-Raiser',  sub: 'Pushes back, no hand-holding, high bar' },
    ],
    difficulties: ['Junior', 'Mid', 'Intermediate', 'Senior', 'Staff', 'Principal'],
    engine_version: '2.0.0',
    note: 'PrepOps provides the engine, prompts, and evaluation criteria. Claude runs the sessions.',
  };
}
