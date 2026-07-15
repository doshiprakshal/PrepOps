# Parity Validation Checklist

This checklist verifies that the Remote MCP server produces the same experience as the CLI (`/interview-coach`) and the reference UI (`interactive-app/stage4.html`).

Run this after any change to engine assets, tool implementations, or prompt assembly logic.

---

## Engine asset parity

- [ ] `CORE` prompt is identical across CLI, stage4.html, and MCP engine.ts
- [ ] All 12 prompts in `prompts/` are bundled into engine.ts (check `npm run bundle` output)
- [ ] All 9 persona YAML files are bundled
- [ ] All 5 incident YAML files are bundled
- [ ] All 4 incident templates are bundled
- [ ] Rubrics and evaluation template are bundled

Verify: `npm run bundle` should report 12 prompts, 9 personas, 5 incidents.

---

## Session behavior parity

### Concept Prep
- [ ] Learn mode opens with a production-grounded Socratic question (not "what is X")
- [ ] Flashcard mode shows FRONT only, waits for response before showing BACK
- [ ] MCQ mode shows one scenario-based question at a time with 4 options
- [ ] All three sub-modes use the same CORE + KNOWLEDGE section
- [ ] Curriculum badge: topics with knowledge files get "Full curriculum" note; others get "General knowledge" note
- [ ] JD blueprint context is injected when present

### Production Scenarios
- [ ] Handcrafted incidents use their YAML exactly (opening_message, clues, red_herrings)
- [ ] Template incidents follow generation_instructions
- [ ] Custom incidents are generated from domain + description
- [ ] Persona behavior matches the YAML (tone, hint policy, follow-up patterns)
- [ ] Clue revelation follows incident turn budget
- [ ] Debrief generates after resolution phase

### Debugging Labs
- [ ] Adaptive evaluation loop: correct → deepen; wrong diagnosis → probe; partial → point to next
- [ ] `hint` command works (3 levels)
- [ ] `answer` command reveals full solution
- [ ] CI/CD question is always asked at lab close
- [ ] No hire signal in report

### Coding Reasoning
- [ ] Problem presented before solution
- [ ] Optimal solution not revealed until candidate has presented full approach
- [ ] Evaluation covers: approach quality, complexity, communication, edge cases

### Mock Interview
- [ ] 5-phase structure is maintained (warm-up → core → curveball → production → closing)
- [ ] Persona maintained throughout — no coaching, no hints (except Friendly Mentor)
- [ ] "I don't know" handling: "Take your time." once, then move on
- [ ] Hire signal is labeled: "PrepOps rubric signal — reflects this practice session only"
- [ ] JD REQUIREMENTS DEMONSTRATED section appears when blueprint is provided

### Whiteboard Interview
- [ ] Phase 1 (requirements) runs before Phase 2 (design review)
- [ ] No hire signal in report
- [ ] Report sections: SESSION ASSESSMENT, DESIGN ASSESSMENT (5 dimensions), STRONGEST SIGNAL, BIGGEST GAP, ONE NEXT ACTION

### System Design
- [ ] 4-phase structure (requirements → high-level → deep dives → adversarial)
- [ ] No hire signal in report
- [ ] Report sections: SESSION ASSESSMENT, DESIGN SCORECARD (6 dimensions), STRONGEST SIGNAL, BIGGEST GAP, ONE NEXT ACTION

### Rapid Fire
- [ ] Coding topics redirect to `start_coding_reasoning` with an explanation message
- [ ] One question at a time with ✓/~/✗ feedback
- [ ] No hire signal in report
- [ ] Report sections: score grid, STRONGEST AREA, WEAKEST AREA, ONE NEXT ACTION

### Mixed Mode
- [ ] Decision Engine adapts modes based on performance
- [ ] Mode transitions have one brief transition sentence, no announcement
- [ ] Hire signal shown only after 10+ exchanges
- [ ] Report: MIXED MODE SUMMARY with performance by mode

---

## JD context parity

- [ ] `prepare_research_request` extracts company, role, level, technologies, research questions
- [ ] `build_runtime_blueprint` assembles JD parser prompt with CORE + jd_parser.md + rubrics
- [ ] Blueprint is stored in session token and injected into all subsequent prompts
- [ ] JD REQUIREMENTS DEMONSTRATED section appears in all mode reports when blueprint is active
- [ ] BLUEPRINT_META block is documented in `build_runtime_blueprint` instructions

---

## Report parity

- [ ] Concept: OVERALL ASSESSMENT / STRENGTHS / AREAS TO IMPROVE / NEXT SESSION
- [ ] Incident: HIRE SIGNAL + DIMENSION SCORES / INVESTIGATION QUALITY / MISSED CLUES / STRONGEST MOMENT / ONE NEXT ACTION
- [ ] Debugging: SESSION ASSESSMENT / PER-LAB SUMMARY / STRONGEST SIGNAL / BIGGEST GAP / ONE NEXT ACTION (no hire signal)
- [ ] Coding: APPROACH QUALITY / COMPLEXITY ANALYSIS / COMMUNICATION / EDGE CASES / OPTIMAL vs CANDIDATE / ONE NEXT ACTION
- [ ] Mock: PrepOps rubric signal / DIMENSION SCORES / STRONGEST SIGNAL / BIGGEST CONCERN / INTERVIEW VERDICT / ONE NEXT ACTION
- [ ] Whiteboard: SESSION ASSESSMENT / DESIGN ASSESSMENT / STRONGEST SIGNAL / BIGGEST GAP / ONE NEXT ACTION (no hire signal)
- [ ] System Design: SESSION ASSESSMENT / DESIGN SCORECARD / STRONGEST SIGNAL / BIGGEST GAP / ONE NEXT ACTION (no hire signal)
- [ ] Rapid Fire: results grid / STRONGEST AREA / WEAKEST AREA / ONE NEXT ACTION (no hire signal)
- [ ] Mixed: hire signal (if 10+ exchanges) / MIXED MODE SUMMARY / ONE NEXT ACTION

---

## Security constraints

- [ ] Server makes no calls to Anthropic API
- [ ] Server makes no calls to external search APIs
- [ ] No database, no session storage
- [ ] Session tokens are HMAC-SHA256 signed
- [ ] Unsigned or tampered tokens are rejected with "Invalid or expired session token"
- [ ] SESSION_SECRET is set via `wrangler secret put` (never in wrangler.toml or .dev.vars commits)
- [ ] Engine assets do not expose hidden state (incident root cause, unrevealed clues) in tool responses

---

## CLI continuity

- [ ] `skills/claude/SKILL.md` still works unchanged via `/interview-coach`
- [ ] Existing PrepOps flows in Claude Code are unaffected
- [ ] `interactive-app/stage4.html` is unchanged and still works as a Claude.ai artifact
