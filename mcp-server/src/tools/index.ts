import type { Env } from '../env.js';

export interface Tool {
  name:        string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolResult = Record<string, unknown>;

// ── Public tool imports (7 tools) ─────────────────────────────────────────────

import { openPrepOpsDef,       openPrepOps }                             from './open.js';
import { resolveInputDef,      resolveInput }                            from './resolve.js';
import { startSessionDef,      startSession,
         continueSessionDef,   continueSession }                         from './session.js';
import { prepareRoleResearchDef, prepareRoleResearch,
         buildRolePlanDef,     buildRolePlan }                           from './research.js';
import { generateReportDef,    generateReport }                          from './report.js';

// ── Public tool registry ──────────────────────────────────────────────────────

export const TOOL_DEFS: Tool[] = [
  openPrepOpsDef,
  resolveInputDef,
  startSessionDef,
  continueSessionDef,
  prepareRoleResearchDef,
  buildRolePlanDef,
  generateReportDef,
];

// ── Handler dispatch ──────────────────────────────────────────────────────────

type AsyncHandler = (input: Record<string, unknown>, env: Env) => Promise<ToolResult>;
type SyncHandler  = (input: Record<string, unknown>) => ToolResult;
type Handler      = AsyncHandler | SyncHandler;

const HANDLERS: Record<string, Handler> = {
  open_prepops:           ()                               => openPrepOps(),
  resolve_input:          (i: Record<string, unknown>)    => resolveInput(i as Parameters<typeof resolveInput>[0]),
  start_session:          (i: Record<string, unknown>, e) => startSession(i as Parameters<typeof startSession>[0], e),
  continue_session:       (i: Record<string, unknown>, e) => continueSession(i as Parameters<typeof continueSession>[0], e),
  prepare_role_research:  (i: Record<string, unknown>)    => prepareRoleResearch(i as Parameters<typeof prepareRoleResearch>[0]),
  build_role_plan:        (i: Record<string, unknown>)    => buildRolePlan(i as Parameters<typeof buildRolePlan>[0]),
  generate_report:        (i: Record<string, unknown>, e) => generateReport(i as Parameters<typeof generateReport>[0], e),
};

export async function callTool(name: string, args: Record<string, unknown>, env: Env): Promise<ToolResult> {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}. Available tools: ${Object.keys(HANDLERS).join(', ')}` };
  return handler(args, env);
}
