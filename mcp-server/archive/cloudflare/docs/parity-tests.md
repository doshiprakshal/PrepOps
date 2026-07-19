# PrepOps MCP — Parity Test Cases

These 6 scenarios validate that the MCP connector matches the behavior of the CLI `/interview-coach` plugin. Each test specifies the user input, expected tool call sequence, and the behavioral guarantees PrepOps must maintain.

---

## Test 1: Kubernetes Networking Concept Prep

**User input:** `"Teach me about Kubernetes networking"`

**Expected tool sequence:**
```
start_session(mode=concept, topic=kubernetes, difficulty=Senior, concept_mode=learn)
→ continue_session(session_token, user_response)  [every turn]
→ generate_report(session_token, transcript)       [on "done"]
```

**PrepOps behavioral guarantees:**
- [ ] First response is a PrepOps conceptual question on Kubernetes networking (not a lecture)
- [ ] Adaptive follow-up based on depth of candidate answer
- [ ] CORE + learn_concept prompt used (not free-form Claude explanation)
- [ ] KNOWLEDGE base appended for Kubernetes domain
- [ ] Session report includes OVERALL ASSESSMENT and NEXT SESSION recommendation
- [ ] `view: concept_session` on every turn

**Parity check vs CLI:**
- CLI starts concept_session and uses the same `PROMPTS['learn_concept']` prompt
- MCP must use the same prompt via `continue_session`

---

## Test 2: MTU Mismatch Incident Scenario

**User input:** `"Give me a production incident scenario for Kubernetes"`

**Expected tool sequence:**
```
start_session(mode=incident, topic=kubernetes, difficulty=Senior)
→ continue_session(session_token, "check pod logs")           [turn 2]
→ continue_session(session_token, "hypothesis: MTU mismatch") [turn 3, hypothesis param]
→ generate_report(session_token, transcript)                   [on "done"]
```

**PrepOps behavioral guarantees:**
- [ ] Hidden root cause set at start, never revealed until candidate finds it
- [ ] `clues_revealed` increments only when PrepOps engine decides to surface a clue
- [ ] `known_signals` list grows as investigation proceeds
- [ ] `working_hypothesis` shown in terminal context when candidate states one
- [ ] Available actions always shown: `check_logs | run_tcpdump | inspect_node | hypothesis`
- [ ] Session report includes MISSED CLUES and INVESTIGATION QUALITY sections
- [ ] `view: incident_terminal` on every turn with terminal-style output

**Parity check vs CLI:**
- CLI uses `PROMPTS['scenarios']` + PERSONA persona — MCP must use same via `buildContinuePrompt`
- Clue reveal logic identical: gate on `clues_revealed < 4` and turn progression

---

## Test 3: Graph Algorithm Coding with Reasoning

**User input:** `"Coding interview — graph problem"`

**Expected tool sequence:**
```
start_session(mode=coding, difficulty=Senior)
→ continue_session(session_token, "I'd use BFS here because…")  [brute force phase]
→ continue_session(session_token, "optimize to O(V+E)…")         [optimization phase]
→ continue_session(session_token, "optimal solution")             [optimal reveal phase]
→ generate_report(session_token, transcript)
```

**PrepOps behavioral guarantees:**
- [ ] Problem presented with constraints, no solution shown
- [ ] `solution_revealed: false` until candidate explicitly requests or reaches final phase
- [ ] Phase progression: `brute_force → optimization → optimal_reveal`
- [ ] PrepOps prompt probes reasoning, not just code
- [ ] `view: coding_workspace` with `phase` and `solution_revealed` fields
- [ ] Report includes APPROACH QUALITY and COMPLEXITY ANALYSIS sections

**Parity check vs CLI:**
- CLI uses `PROMPTS['coding_interview']` — MCP must use same
- `solution_revealed` state in token mirrors CLI's `revealed` flag in session context

---

## Test 4: Google SRE JD Prep Flow

**User input:** *(user pastes 500-word Google SRE JD)*

**Expected tool sequence:**
```
prepare_role_research(jd_text)
→ [Claude performs web search on returned research_questions]
→ build_role_plan(jd_text, research_findings)
→ [Claude runs returned prompt → generates blueprint + role prep plan]
→ [Claude extracts <<<BLUEPRINT_META>>> → preferred_persona=google_sre, top_domain=kubernetes]
→ "Which mode would you like to start with?"
→ [user: "mock interview"]
→ start_session(mode=mock, role=SRE, difficulty=Senior, persona=google_sre, blueprint=<blueprint>)
→ continue_session(…)  [every turn]
```

**PrepOps behavioral guarantees:**
- [ ] `prepare_role_research` extracts company, role, level, required_technologies, research_questions
- [ ] `build_role_plan` produces SUCCESS FACTORS · TOPIC PRIORITIES · GAP ANALYSIS · action plan
- [ ] `<<<BLUEPRINT_META>>>` block present and parseable at end of plan
- [ ] Mock session uses `preferred_persona` from blueprint, not default
- [ ] JD context injected into mock session via `blueprint` parameter
- [ ] Report includes JD REQUIREMENTS DEMONSTRATED section
- [ ] `view: role_prep_plan` returned by `build_role_plan`

**Parity check vs CLI:**
- CLI `/role-prep` uses `PROMPTS['jd_parser']` — MCP `build_role_plan` must use same prompt
- Blueprint injection into start_session must match CLI's `jd_context` injection

---

## Test 5: Full Mock Interview (5 Phases)

**User input:** `"Mock interview for Google SRE, Senior level"`

**Expected tool sequence:**
```
start_session(mode=mock, role=SRE, difficulty=Senior, persona=google_sre)
→ continue_session(…)  [≥10 turns across 5 phases]
→ generate_report(session_token, transcript)
```

**PrepOps behavioral guarantees:**
- [ ] Phase progression: Introduction → Technical Screening → Technical Deep Dive → Production Scenario → Closing
- [ ] `phase_index` in token increments correctly
- [ ] `view: mock_interview` with `phase` and `phase_index` fields on every turn
- [ ] Persona maintained throughout (google_sre: systems thinking, SLOs, scale focus)
- [ ] No hints offered — persona is evaluating, not coaching
- [ ] Report includes PrepOps rubric signal (STRONG HIRE → NO HIRE spectrum)
- [ ] Report includes DIMENSION SCORES (Technical Knowledge · Production Thinking · Communication · Debugging Methodology · Depth)
- [ ] Report includes INTERVIEW VERDICT in interviewer's voice

**Parity check vs CLI:**
- CLI `mock_interview` prompt used — MCP must use same via `PROMPTS['mock_interview']`
- Persona persona appended via `PERSONAS['google_sre']`
- Phase advancement logic identical to CLI phase tracking

---

## Test 6: Custom Unsupported Topic

**User input:** `"I want to practice React frontend interviews"`

**Expected tool sequence:**
```
resolve_input("I want to practice React frontend interviews")
```

**PrepOps behavioral guarantees:**
- [ ] `resolve_input` returns `view: setup`
- [ ] `inferred.mode` is null or best-guess (likely `concept` or `mock`)
- [ ] `missing_required` includes the unsupported topic signal
- [ ] Response acknowledges PrepOps is optimized for Infra/DevOps/SRE/Cloud/Platform
- [ ] Claude offers: proceed with `concept` mode for general software engineering OR suggest the user rephrase for a supported domain
- [ ] Does NOT call `start_session` with an unsupported domain
- [ ] If user says "sure, concept mode" → `start_session(mode=concept, topic=react, difficulty=Senior)`

**Parity check vs CLI:**
- CLI handles unsupported topics by defaulting to concept mode with a note
- MCP `resolve_input` should produce a `setup_question` that surfaces this gracefully

---

## Automated Validation Checklist

Run these checks after any change to `session.ts`, `resolve.ts`, `mcp.ts`, or `engine/manifest.json`:

- [ ] `npm run bundle` succeeds (no ENOENT, no TS errors in Worker scope)
- [ ] `npm run typecheck` passes with 0 errors
- [ ] All 7 tools appear in `tools/list` response
- [ ] `open_prepops` returns `view: home` with all non-internal modes
- [ ] `start_session(mode=mock, ...)` returns `view: mock_interview` + `session_token` + `prompt`
- [ ] `continue_session(token, "next")` returns updated `session_token` with `turn` incremented
- [ ] `generate_report(token, [])` returns `view: session_report` + mode-appropriate `prompt`
- [ ] Session token roundtrip: sign → verify → state matches
- [ ] `hidden.clues_revealed` increments on incident turns
- [ ] `hidden.solution_revealed` stays false until coding phase reaches `optimal_reveal`
- [ ] `hidden.phase_index` increments on mock/whiteboard/system_design turns
