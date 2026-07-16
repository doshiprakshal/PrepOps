import type { Env } from '../index.js';

export interface Tool {
  name:        string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolResult = Record<string, unknown>;

// ── Imports ──────────────────────────────────────────────────────────────────
import { homeToolDef,              getHomeOptions }          from './home.js';
import { resolveTopicDef,          resolveTopic,
         prepareResearchRequestDef, prepareResearchRequest } from './research.js';
import { buildRuntimeBlueprintDef, buildRuntimeBlueprint }  from './blueprint.js';
import { startConceptDef,          startConceptSession,
         continueConceptDef,       continueConceptSession }  from './concept.js';
import { startIncidentDef,         startIncident,
         continueIncidentDef,      continueIncident }        from './incident.js';
import { startDebuggingLabDef,     startDebuggingLab,
         continueDebuggingLabDef,  continueDebuggingLab }    from './debugging.js';
import { startCodingReasoningDef,  startCodingReasoning,
         continueCodingReasoningDef, continueCodingReasoning } from './coding.js';
import { startMockInterviewDef,    startMockInterview,
         continueMockInterviewDef, continueMockInterview }   from './mock.js';
import { startWhiteboardDef,       startWhiteboard,
         continueWhiteboardDef,    continueWhiteboard }      from './whiteboard.js';
import { startSystemDesignDef,     startSystemDesign,
         continueSystemDesignDef,  continueSystemDesign }    from './sysdesign.js';
import { startRapidFireDef,        startRapidFire,
         continueRapidFireDef,     continueRapidFire }       from './rapidfire.js';
import { startMixedModeDef,        startMixedMode,
         continueMixedModeDef,     continueMixedMode }       from './mixed.js';
import { generateSessionReportDef, generateSessionReport }  from './report.js';

// ── Registry ──────────────────────────────────────────────────────────────────
export const TOOL_DEFS: Tool[] = [
  homeToolDef,
  resolveTopicDef,
  prepareResearchRequestDef,
  buildRuntimeBlueprintDef,
  startConceptDef,
  continueConceptDef,
  startIncidentDef,
  continueIncidentDef,
  startDebuggingLabDef,
  continueDebuggingLabDef,
  startCodingReasoningDef,
  continueCodingReasoningDef,
  startMockInterviewDef,
  continueMockInterviewDef,
  startWhiteboardDef,
  continueWhiteboardDef,
  startSystemDesignDef,
  continueSystemDesignDef,
  startRapidFireDef,
  continueRapidFireDef,
  startMixedModeDef,
  continueMixedModeDef,
  generateSessionReportDef,
];

type AsyncHandler  = (input: Record<string, unknown>, env: Env) => Promise<ToolResult>;
type SyncHandler   = (input: Record<string, unknown>) => ToolResult;
type Handler       = AsyncHandler | SyncHandler;

const HANDLERS: Record<string, Handler> = {
  get_home_options:           () => getHomeOptions(),
  resolve_topic:              (i: Record<string, unknown>) => resolveTopic(i as Parameters<typeof resolveTopic>[0]),
  prepare_research_request:   (i: Record<string, unknown>) => prepareResearchRequest(i as Parameters<typeof prepareResearchRequest>[0]),
  build_runtime_blueprint:    (i: Record<string, unknown>) => buildRuntimeBlueprint(i as Parameters<typeof buildRuntimeBlueprint>[0]),
  start_concept_session:      (i, e) => startConceptSession(i as Parameters<typeof startConceptSession>[0], e),
  continue_concept_session:   (i, e) => continueConceptSession(i as Parameters<typeof continueConceptSession>[0], e),
  start_incident:             (i, e) => startIncident(i as Parameters<typeof startIncident>[0], e),
  continue_incident:          (i, e) => continueIncident(i as Parameters<typeof continueIncident>[0], e),
  start_debugging_lab:        (i, e) => startDebuggingLab(i as Parameters<typeof startDebuggingLab>[0], e),
  continue_debugging_lab:     (i, e) => continueDebuggingLab(i as Parameters<typeof continueDebuggingLab>[0], e),
  start_coding_reasoning:     (i, e) => startCodingReasoning(i as Parameters<typeof startCodingReasoning>[0], e),
  continue_coding_reasoning:  (i, e) => continueCodingReasoning(i as Parameters<typeof continueCodingReasoning>[0], e),
  start_mock_interview:       (i, e) => startMockInterview(i as Parameters<typeof startMockInterview>[0], e),
  continue_mock_interview:    (i, e) => continueMockInterview(i as Parameters<typeof continueMockInterview>[0], e),
  start_whiteboard:           (i, e) => startWhiteboard(i as Parameters<typeof startWhiteboard>[0], e),
  continue_whiteboard:        (i, e) => continueWhiteboard(i as Parameters<typeof continueWhiteboard>[0], e),
  start_system_design:        (i, e) => startSystemDesign(i as Parameters<typeof startSystemDesign>[0], e),
  continue_system_design:     (i, e) => continueSystemDesign(i as Parameters<typeof continueSystemDesign>[0], e),
  start_rapid_fire:           (i, e) => startRapidFire(i as Parameters<typeof startRapidFire>[0], e),
  continue_rapid_fire:        (i, e) => continueRapidFire(i as Parameters<typeof continueRapidFire>[0], e),
  start_mixed_mode:           (i, e) => startMixedMode(i as Parameters<typeof startMixedMode>[0], e),
  continue_mixed_mode:        (i, e) => continueMixedMode(i as Parameters<typeof continueMixedMode>[0], e),
  generate_session_report:    (i, e) => generateSessionReport(i as Parameters<typeof generateSessionReport>[0], e),
};

export async function callTool(name: string, args: Record<string, unknown>, env: Env): Promise<ToolResult> {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}` };
  return handler(args, env);
}
