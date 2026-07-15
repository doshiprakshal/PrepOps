# PrepOps Interactive App

A Claude Artifact that runs PrepOps inside Claude.ai — no install, no API key, no backend.

## How it works

The app uses `window.claude.complete()` to call Claude from within a sandboxed browser artifact. Every AI call embeds the PrepOps engine prompts directly. The app is stateless — no persistence, no accounts, no database.

**Requirements:** User must be signed into Claude.ai. AI usage is billed to the user's Claude account.

## Files

```
interactive-app/
├── README.md       ← this file
├── stage1.html     ← Stage 1 artifact (stable milestone — Concept Prep only)
├── stage2.html     ← Stage 2 artifact (Stage 1 + Production Scenarios + Coding Reasoning)
├── stage3.html     ← Stage 3 artifact (Stage 1 + Stage 2 + Prepare for a Role)
└── stage4.html     ← Stage 4 artifact (Stage 1–3 + Whiteboard · System Design · Rapid Fire · Mixed Mode)
```

## Stages

| Stage | Status | What it covers |
|-------|--------|---------------|
| 1 | ✅ Done | Home screen · Concept Prep (Learn, Flashcards, MCQ) · Session report |
| 2 | ✅ Done | Production Scenarios (incident simulator) · Coding Reasoning (optimal reveal) |
| 3 | ✅ Done | Prepare for a Role (JD parsing, prep plan, gap analysis, JD-driven sessions) |
| 4 | ✅ Done | Whiteboard Interview · System Design · Rapid Fire · Mixed Mode |
| 5 | ✅ Done | Debugging Labs · Mock Interview (standalone) |

## How to use

1. Copy the full contents of `stage4.html`
2. Go to [claude.ai](https://claude.ai) and start a new chat
3. Say: `Create an artifact from this HTML` and paste the file
4. Claude renders it inline — click through the artifact to test

**Requirements:** Must be signed into Claude.ai. AI usage is billed to your Claude.ai account.

## Architecture

The artifact is a single HTML file containing:
- Vanilla JS + Tailwind CSS via CDN (no build step, no React, no Babel)
- PrepOps engine prompts embedded verbatim as JS string constants
- All views rendered via `innerHTML` with direct DOM manipulation
- Append-only message lists for session chat (no full re-renders)

Each `window.claude.complete()` call passes: PrepOps core rules + mode prompt + selected persona + incident/problem content + full conversation history.

## Prepare for a Role flow (Stage 3)

The JD-driven flow follows `prompts/jd_parser.md` exactly:

1. User pastes a job description (required)
2. Optional: resume/background, interview timeline, known interview details, research notes
3. PrepOps extracts role, company, level, required skills, and tech stack
4. A runtime blueprint is generated in memory (never saved as a file)
5. Blueprint maps requirements to PrepOps curriculum with confidence ratings
6. Resume gap analysis runs when background is provided (✓ Evidenced / ⚠ Weak / ✗ Missing)
7. Prep plan is displayed with topic weights, success factors, and schedule
8. User launches any of 5 session types — each carries the JD context

**Web research limitation:** Claude.ai artifacts have no live web access. When no research notes are provided, PrepOps shows "Research status: Model knowledge only" and applies ★★★☆☆ confidence to company-specific claims. Users can paste research from Claude web search or recruiter guidance into the research field.

## Engine prompt reuse

Stage 4–5 embeds the full source content of:
- `prompts/jd_parser.md` — full JD parsing flow (Steps 0–7, source-confidence rules, report format)
- `prompts/scenarios.md` — full incident engine
- `prompts/coding_interview.md` — full coding reasoning mode (7-step flow)
- `prompts/mock_interview.md` — mock interview mode (5-phase structure, debrief format)
- `prompts/whiteboard.md` — whiteboard interview mode (2-phase, architecture dimensions, DESIGN ASSESSMENT)
- `prompts/system_design.md` — system design mode (4-phase, DESIGN SCORECARD)
- `prompts/rapid_fire.md` — rapid fire mode (question types, difficulty progression, coding redirect rule)
- `prompts/mixed_mode.md` — mixed mode (Decision Engine, mode mix targets, cross-domain questions)
- `prompts/debugging_labs.md` — debugging labs (adaptive evaluation loop, hint system, lab generation rules)
- `prompts/mock_interview.md` — mock interview (5-phase structure, persona rules, debrief format) — used by both JD-driven and standalone flows
- `personas/google_sre.yaml`, `friendly_mentor.yaml`, `strict_bar_raiser.yaml`, `staff_engineer.yaml`, `amazon_devops.yaml`
- `incidents/kubernetes/mtu-mismatch.yaml`, `oom-kill-cascade.yaml`
- `incidents/linux/disk-full-open-handles.yaml`
- `incidents/networking/dns-blackhole.yaml`
- `incidents/sre/cascading-retry-storm.yaml`
- `incident-templates/pod-not-starting.yaml`, `network-latency.yaml`
- `rubrics/dimensions.yaml`, `rubrics/hiring-signals.yaml` — evaluation rubric (embedded in JD parser)
- `templates/evaluation_rubric.yaml` — scoring rules (embedded in JD parser)

The CLI (`skills/claude/SKILL.md`) remains the source of truth. These files are read and embedded — not paraphrased.

## Stage 4 modes

### Whiteboard Interview
Topic or system input, difficulty, persona, optional JD context. Two-phase session (requirements → design review) with a side panel for notes (requirements, components, trade-offs). Report includes DESIGN ASSESSMENT across 5 architecture dimensions.

### System Design
System to design (preset or custom), difficulty, persona, optional scale + constraints. Four-phase session (requirements → high-level → deep dives → adversarial). Side panel for notes. Report includes DESIGN SCORECARD.

### Rapid Fire
Topic (free text), starting difficulty, question count (10/15/20/30), persona. One question at a time with ✓/~/✗ feedback. Coding topics redirect to Coding Reasoning. Report shows score grid, strongest/weakest area, one next action.

### Debugging Labs
Lab type picker (Broken K8s YAML, Terraform, Helm, PromQL, Linux troubleshooting, Custom), optional topic, difficulty. PrepOps presents one broken artifact with context and symptoms. Candidate diagnoses and proposes a fix. Adaptive loop probes before revealing. Hint and answer commands available. Report covers per-lab summary (what was found, what was missed, fix safety, validation), strongest signal, biggest gap, one next action. No hire signal.

### Mock Interview (standalone)
Role (free text), company (optional), focus areas (optional multi-select), difficulty, interview length (short/standard/full), persona, optional JD context. Full 5-phase structure (warm-up → core technical → curveball → production → persona closing). One question at a time, persona maintained throughout, no coaching. Report includes PrepOps rubric signal labeled "reflects this practice session only — not a real hiring decision," dimension scores, strongest signal, biggest concern, interview verdict in persona voice, JD requirements demonstrated when context provided, one next action.

### Mixed Mode
Topic or role, starting difficulty, session length (15/30/45 min), persona. PrepOps controls the mode mix (MCQ, concept, scenario, rapid fire, whiteboard) using a Decision Engine that adapts based on performance. Mode indicator updates in the header as the session evolves. Hire signal shown only for sessions of 10+ exchanges.
