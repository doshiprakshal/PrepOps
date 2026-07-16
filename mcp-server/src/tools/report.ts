import type { Tool, ToolResult } from './index.js';
import type { Env } from '../index.js';
import { verifyToken } from '../session/token.js';
import { CORE, RUBRICS } from '../assets/engine.js';

export const generateReportDef: Tool = {
  name: 'generate_report',
  description: [
    'Generates the PrepOps session report.',
    'Call when the user says "done", "end", "report", "quit", or the session naturally concludes.',
    'Returns view: session_report and a prompt Claude should run on the full transcript.',
    'Report format and hire-signal rules vary by mode — only mock interview shows a PrepOps rubric signal.',
    'Do NOT generate the report independently outside this tool.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      session_token: { type: 'string', description: 'Session token from start_session.' },
      transcript:    { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, required: ['role','content'] }, description: 'Full conversation transcript.' },
    },
    required: ['session_token', 'transcript'],
  },
};

export async function generateReport(
  input: { session_token: string; transcript: Array<{ role: string; content: string }> },
  env: Env,
): Promise<ToolResult> {
  const state = await verifyToken(input.session_token, env.SESSION_SECRET);
  if (!state) return { error: 'Invalid or expired session token.' };

  const { config } = state;
  const transcript = input.transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'PrepOps'}: ${m.content}`).join('\n\n');
  const exchanges  = input.transcript.filter(m => m.role === 'user').length;
  const jdLine     = config.blueprint ? `JD context was provided — append JD REQUIREMENTS DEMONSTRATED section.` : '';

  const rubricSection = `
=== EVALUATION RUBRIC ===
${RUBRICS['evaluation'] ?? ''}

=== DIMENSION SCORING GUIDE ===
${RUBRICS['dimensions'] ?? ''}

=== HIRING SIGNALS ===
${RUBRICS['hiring_signals'] ?? ''}`;

  let prompt = '';

  switch (config.mode) {

    case 'concept':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate a concise PrepOps session report.\n\nTopic: ${config.topic} | Mode: ${config.concept_mode ?? 'learn'} | Level: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nSession transcript:\n${transcript}\n\n${exchanges < 3 ? 'NOTE: Very short session — note this at the top.\n\n' : ''}Write the report:\n\nOVERALL ASSESSMENT\n[Strong Hire / Lean Hire / Borderline / Lean No Hire / No Hire]\n[One specific sentence citing the actual exchange]\n\nSTRENGTHS\n1. [Specific]\n2. [Specific]\n3. [Specific]\n\nAREAS TO IMPROVE\n1. [Specific gap + production implication]\n2. [Specific]\n3. [Specific]\n\nNEXT SESSION\nTopic: [specific]\nMode: [Learn / Flashcard / MCQ]\nWhy: [one sentence]${jdLine ? '\n\nJD REQUIREMENTS DEMONSTRATED\nFor each key requirement: ✓ Demonstrated / ⚠ Partial / ✗ Not covered' : ''}`;
      break;

    case 'incident':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps Production Scenario debrief.\n\nDomain: ${config.incident_domain} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate:\n1. HIRE SIGNAL and DIMENSION SCORES (Technical Knowledge, Production Thinking, Debugging Methodology, Communication, Depth)\n2. INVESTIGATION QUALITY: what worked and what didn't\n3. MISSED CLUES: what evidence was available but not acted on\n4. STRONGEST MOMENT: best diagnostic step\n5. ONE NEXT ACTION: specific mode + topic\n${jdLine ? '6. JD REQUIREMENTS DEMONSTRATED' : ''}`;
      break;

    case 'debugging':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps debugging lab report.\n\nLab type: ${config.lab_type}${config.lab_topic ? ` | Topic: ${config.lab_topic}` : ''} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate these sections. Do NOT show a hire signal.\n\nSESSION ASSESSMENT\nOne paragraph on overall debugging quality.\n\nPER-LAB SUMMARY\nFor each lab: title, what was identified correctly, what was missed, whether the fix is safe, how to validate.\n\nSTRONGEST SIGNAL\nClearest strength with transcript evidence.\n\nBIGGEST GAP\nSingle most important thing missed.\n\nONE NEXT ACTION\nExactly one: specific mode + topic.\n${jdLine ? '\nJD REQUIREMENTS DEMONSTRATED\nFor each requirement: ✓ / ⚠ / ✗' : ''}`;
      break;

    case 'coding':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps coding reasoning report.\n\nDifficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate:\n1. APPROACH QUALITY: did they think before coding?\n2. COMPLEXITY ANALYSIS: did they nail time/space?\n3. COMMUNICATION: could a colleague follow their reasoning?\n4. EDGE CASES: what did they miss?\n5. OPTIMAL vs CANDIDATE: how did their solution compare?\n6. ONE NEXT ACTION\n${jdLine ? '7. JD REQUIREMENTS DEMONSTRATED' : ''}`;
      break;

    case 'mock':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps mock interview report.\n\nRole: ${config.role}${config.company ? ' at ' + config.company : ''} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate:\n\nPrepOps rubric signal: {STRONG HIRE ⬆ | LEAN HIRE ↑ | BORDERLINE ↔ | LEAN NO HIRE ↓ | NO HIRE ⬇}\nThis reflects this practice session only and does not predict a real hiring decision.\n\nDIMENSION SCORES\nTechnical Knowledge — ★ rating — one sentence evidence\nProduction Thinking — ★ rating — one sentence evidence\nCommunication — ★ rating — one sentence evidence\nDebugging Methodology — ★ rating — one sentence evidence\nDepth — ★ rating — one sentence evidence\n\nSTRONGEST SIGNAL\nClearest strength with transcript evidence.\n\nBIGGEST CONCERN\nSingle most important gap.\n\nINTERVIEW VERDICT\nWould I advance you? {Yes — Strong signal / Yes — Needs polish / Maybe — Borderline / No — Significant gaps}\nWhy: 2-3 sentences as the interviewer would write in debrief.\n${jdLine ? '\nJD REQUIREMENTS DEMONSTRATED\nFor each key requirement: ✓ Demonstrated / ⚠ Partial / ✗ Not covered\n' : ''}\nONE NEXT ACTION\nExactly one recommendation.`;
      break;

    case 'whiteboard':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps whiteboard interview report.\n\nTopic: ${config.wb_topic} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate these sections. Do NOT show a hire signal.\n\nSESSION ASSESSMENT\nOne paragraph on overall design thinking quality.\n\nDESIGN ASSESSMENT\nRate each ★ (1–5) with one line of evidence:\n- Architecture Quality\n- Scalability Thinking\n- Reliability Coverage\n- Operational Readiness\n- Trade-off Articulation\n\nSTRONGEST SIGNAL\nClearest strength with evidence.\n\nBIGGEST GAP\nSingle most important concern.\n\nONE NEXT ACTION\n${jdLine ? '\nJD REQUIREMENTS DEMONSTRATED\n' : ''}`;
      break;

    case 'system_design':
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps system design report.\n\nSystem: ${config.sd_system} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate these sections. Do NOT show a hire signal.\n\nSESSION ASSESSMENT\nOne paragraph on overall design thinking.\n\nDESIGN SCORECARD\nRate each ★ (1–5) with one line of evidence:\n- Correctness\n- Scalability\n- Reliability\n- Simplicity\n- Operability\n- Cost Awareness\n\nSTRONGEST SIGNAL\nBIGGEST GAP\nONE NEXT ACTION\n${jdLine ? '\nJD REQUIREMENTS DEMONSTRATED\n' : ''}`;
      break;

    case 'rapid_fire':
      prompt = `${CORE}\n\nGenerate the PrepOps rapid fire session report.\n\nTopic: ${config.topic} | Questions: ${config.rf_count ?? 15} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\nGenerate. Do NOT show a hire signal.\n\nRAPID FIRE RESULTS\nScore grid (✓/~/✗ per question)\n\nSTRONGEST AREA\nTopic cluster they answered best.\n\nWEAKEST AREA\nTopic cluster that needs most work.\n\nONE NEXT ACTION\nExactly one: specific mode + topic.\n${jdLine ? '\nJD REQUIREMENTS DEMONSTRATED\n' : ''}`;
      break;

    case 'mixed': {
      const showSignal = exchanges >= 10;
      prompt = `${CORE}\n${rubricSection}\n\nGenerate the PrepOps mixed mode session report.\n\nTopic: ${config.topic} | Difficulty: ${config.difficulty} | Exchanges: ${exchanges}\n${jdLine}\n\nTranscript:\n${transcript}\n\n${showSignal ? 'Include HIRE SIGNAL and DIMENSION SCORES.\n\n' : 'Session too short for hire signal (under 10 exchanges) — note this.\n\n'}MIXED MODE SUMMARY\nPerformance by Mode — for each mode used: ★ rating and one-line observation\nStrongest skill: specific topic or mode they excelled in\nBiggest gap: specific topic or mode that needs work\n\nONE NEXT ACTION\n${jdLine ? '\nJD REQUIREMENTS DEMONSTRATED\n' : ''}`;
      break;
    }

    default:
      prompt = `${CORE}\n\nGenerate a PrepOps session report for mode: ${config.mode}.\n\nExchanges: ${exchanges}\n\nTranscript:\n${transcript}`;
  }

  return {
    view: 'session_report',
    prompt,
    mode:       config.mode,
    difficulty: config.difficulty,
    exchanges,
    prepops_note: 'Run the prompt field through your reasoning to generate the PrepOps report. Display it as a formatted report block.',
  };
}
