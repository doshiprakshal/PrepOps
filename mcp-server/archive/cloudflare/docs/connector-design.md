# PrepOps MCP Connector — Design Reference

## Overview

PrepOps MCP exposes 7 tools. Claude provides reasoning, conversation, and web research. PrepOps controls session structure, phase progression, hint/clue disclosure, scoring, and report format.

The connector implements a **prompt-compiler pattern**: tools return `prompt` fields that Claude executes, not answers Claude generates directly.

---

## 7-Tool Public Interface

| Tool | When to Call |
|------|-------------|
| `open_prepops` | User says "Open PrepOps" / generic entry / "What can you do?" |
| `resolve_input` | Intent is ambiguous — returns single setup question |
| `start_session` | Mode and required params are known — starts session |
| `continue_session` | Every user turn when `session_token` exists |
| `prepare_role_research` | User pastes a JD (300+ words) |
| `build_role_plan` | After web search answers research questions |
| `generate_report` | User says "done" / "end" / "report" / "quit" |

### Tool removed from public interface

`get_engine_manifest` (formerly `get_home_options`) is no longer in TOOL_DEFS. Manifest data is now surfaced through `open_prepops` and `resolve_input`.

---

## start_session Parameters

```
mode:             concept | incident | debugging | coding | mock |
                  whiteboard | system_design | rapid_fire | mixed
topic:            domain or subject (kubernetes, terraform, linux, sre, aws, networking, …)
difficulty:       Junior | Mid | Intermediate | Senior | Staff | Principal  [default: Senior]
persona:          google_sre | amazon_devops | apple_sre | netflix_platform |
                  stripe_infra | startup_devops                             [default: google_sre]
role:             role title for mock mode (e.g. "SRE", "Platform Engineer")
concept_mode:     learn | flashcard | mcq                                    [default: learn]
session_variant:  for debugging mode (e.g. k8s_yaml, terraform_state, linux_systemd)
session_count:    number of scenario rounds (incident / rapid_fire)
jd_context:       blueprint excerpt for JD-targeted sessions
blueprint:        full runtime blueprint from build_role_plan
custom_input:     free-text problem description (coding / system_design)
```

---

## Session Token Schema

Signed HMAC-SHA256 token. Format: `base64url(JSON.stringify(state)).base64url(sig)`

```json
{
  "config": {
    "mode": "mock",
    "topic": "kubernetes",
    "difficulty": "Senior",
    "persona": "google_sre",
    "role": "SRE",
    "concept_mode": null,
    "incident_domain": null,
    "lab_type": null,
    "lab_topic": null,
    "wb_topic": null,
    "sd_system": null,
    "rf_count": 15,
    "session_count": 1,
    "blueprint": null,
    "company": null
  },
  "hidden": {
    "clues_revealed": 0,
    "working_hypothesis": null,
    "solution_revealed": false,
    "rf_questions_asked": 0,
    "phase_index": 0
  },
  "turn": 1
}
```

### Hidden state fields

| Field | Modes | Purpose |
|-------|-------|---------|
| `clues_revealed` | incident | Count of clues surfaced so far — PrepOps controls disclosure rate |
| `working_hypothesis` | incident | Candidate's current hypothesis — shown in terminal context |
| `solution_revealed` | coding | Whether optimal solution has been shown — blocks early reveal |
| `rf_questions_asked` | rapid_fire | Current question number |
| `phase_index` | mock, whiteboard, system_design | Current phase in multi-phase flow |

---

## View Field Reference

Every tool response includes a `view` field that determines how Claude renders the result.

### `home`
```json
{
  "view": "home",
  "modes": [{ "id": "mock", "display": "Mock Interview", "description": "…" }],
  "custom_input_examples": ["…"],
  "jd_flow": "…"
}
```
Render: list all modes, show custom input option, do not auto-start a session.

### `setup`
```json
{
  "view": "setup",
  "inferred": { "mode": "incident", "topic": "kubernetes", "difficulty": "Senior" },
  "missing_required": ["role"],
  "can_start_immediately": false,
  "setup_question": "What role should I interview you for?"
}
```
Render: show inferred params, ask `setup_question`, call `start_session` after user answers.

### `concept_session`
```json
{
  "view": "concept_session",
  "topic": "kubernetes",
  "difficulty": "Senior",
  "turn": 3,
  "concept_mode": "learn",
  "prompt": "…"
}
```

### `flashcard`
```json
{ "view": "flashcard", "topic": "sre", "turn": 2, "prompt": "…" }
```

### `mcq`
```json
{ "view": "mcq", "topic": "terraform", "turn": 4, "prompt": "…" }
```

### `incident_terminal`
```json
{
  "view": "incident_terminal",
  "domain": "kubernetes",
  "difficulty": "Senior",
  "phase": "investigation",
  "turn": 4,
  "clues_revealed": 2,
  "working_hypothesis": "MTU mismatch between node and CNI",
  "known_signals": ["Pod restarts increasing", "Latency spikes on node-to-node traffic"],
  "available_actions": ["check_logs", "run_tcpdump", "inspect_node", "hypothesis"],
  "prompt": "…"
}
```
Render: terminal-style code block for output. List `known_signals` and `available_actions`. Show `working_hypothesis` if present.

### `debugging_lab`
```json
{
  "view": "debugging_lab",
  "lab_type": "k8s_yaml",
  "difficulty": "Senior",
  "turn": 2,
  "prompt": "…"
}
```

### `coding_workspace`
```json
{
  "view": "coding_workspace",
  "difficulty": "Senior",
  "phase": "brute_force",
  "turn": 3,
  "solution_revealed": false,
  "prompt": "…"
}
```
Render: show problem + phase. Do NOT reveal optimal solution until `solution_revealed: true`.

### `mock_interview`
```json
{
  "view": "mock_interview",
  "role": "SRE",
  "persona": "google_sre",
  "difficulty": "Senior",
  "phase": "Technical Deep Dive",
  "phase_index": 2,
  "turn": 8,
  "prompt": "…"
}
```
Render: show phase. Maintain interviewer persona throughout — never break character.

### `whiteboard_workspace`
```json
{
  "view": "whiteboard_workspace",
  "topic": "Kubernetes networking",
  "difficulty": "Senior",
  "phase": "Deep Dive",
  "phase_index": 2,
  "turn": 5,
  "prompt": "…"
}
```

### `system_design_workspace`
```json
{
  "view": "system_design_workspace",
  "system": "distributed rate limiter",
  "difficulty": "Senior",
  "phase": "Scale and Reliability",
  "phase_index": 2,
  "turn": 7,
  "prompt": "…"
}
```

### `rapid_fire`
```json
{
  "view": "rapid_fire",
  "topic": "linux",
  "difficulty": "Senior",
  "question_number": 5,
  "total": 15,
  "prompt": "…"
}
```
Render: "Question 5/15". Give brief ✓/~/✗ feedback. Move to next question immediately.

### `mixed_mode`
```json
{
  "view": "mixed_mode",
  "topic": "kubernetes",
  "difficulty": "Senior",
  "turn": 6,
  "prompt": "…"
}
```

### `role_prep_plan`
```json
{
  "view": "role_prep_plan",
  "prompt": "…",
  "instructions": ["…"],
  "note": "…"
}
```
Render: show SUCCESS FACTORS · TOPIC PRIORITIES · GAP ANALYSIS · action plan. Parse `<<<BLUEPRINT_META>>>` for `preferred_persona`.

### `session_report`
```json
{
  "view": "session_report",
  "prompt": "…",
  "mode": "mock",
  "difficulty": "Senior",
  "exchanges": 12
}
```
Render: formatted PrepOps report document. Clear `session_token` after display.

---

## PrepOps-Control Model

```
User message
    │
    ▼
continue_session(session_token, user_response)
    │
    ▼
PrepOps returns: { view, session_token, prompt, metadata }
    │
    ▼
Claude runs "prompt" → generates the PrepOps response
    │
    ▼
Claude renders view metadata as context, displays response to user
```

Claude never answers independently when a session is active. The prompt field is the PrepOps engine instruction for that turn.

---

## Role Prep / JD Flow

```
User pastes JD
    │
    ▼
prepare_role_research(jd_text)
    │  returns research_questions
    ▼
Claude performs web search
    │  collects research_findings
    ▼
build_role_plan(jd_text, research_findings)
    │  returns prompt
    ▼
Claude runs prompt → generates blueprint + role_prep_plan view
    │
    ▼
Claude extracts <<<BLUEPRINT_META>>> → preferred_persona, top_domain, level
    │
    ▼
Ask user which mode to start with
    │
    ▼
start_session(mode, ..., blueprint=<full blueprint>)
```

---

## UI Integration Notes (Stage 4 / stage4.html)

The `view` field is designed to drive a structured UI. Each view maps to a distinct panel layout:

- `home` → mode selection grid
- `incident_terminal` → split: terminal pane (left) + signals sidebar (right)
- `coding_workspace` → split: problem pane (left) + canvas (right), solution gated
- `mock_interview` → interview panel with phase progress bar
- `rapid_fire` → question card with N/total counter
- `session_report` → full-width report document
- `role_prep_plan` → full-width structured plan

All metadata needed to render the UI is in the tool response — no additional tool calls needed per turn.
