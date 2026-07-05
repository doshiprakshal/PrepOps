# PrepOps — Blueprint Generator & Interview Engine

Triggers when the user pastes a job description, mentions a target role,
or says "I have a JD" / "prep me for this role".

The output blueprint exists only in memory. Nothing company-specific is saved.

---

## Step 0 — Resume Check

Before proceeding, ask once:

```
Got it. Do you have a resume you'd like to add?

Paste it here for a personalized gap analysis — PrepOps will map your
background against this role's requirements and tell you exactly where
you're weak.

Or press Enter to skip.
```

If they provide a resume text, hold it internally as `resume_text`.
Do not show raw extracted data. Parse it for:
```
resume_skills:          # Technologies, tools, platforms mentioned
resume_evidence:        # Specific signals: on-call, incident response,
                        # SLO ownership, capacity planning, distributed systems,
                        # production debugging, system design work
resume_years:           # Total YOE and per-domain YOE where visible
resume_level_signal:    # junior | mid | senior | staff inferred from experience
```

If they skip, set `has_resume: false` and continue.

---

## Step 1 — Extract from Job Description

Parse the JD text. Hold internally:

```
company:              # Infer from JD text, domain, or user input
role_title:           # Exact title from JD
level:                # junior | mid | senior | staff | principal
                      # IC3→mid, IC4→senior, IC5→staff, L3→mid, L5→senior, L6→staff
required_skills:      # Hard requirements ("must have", "required", "X+ years of")
preferred_skills:     # Nice-to-haves ("preferred", "bonus", "familiarity with")
responsibilities:     # What they'll actually do day-to-day
tech_stack:           # Tools, platforms, languages named in JD
domain_emphasis:      # kubernetes-heavy | linux-heavy | aws-heavy | sre-heavy | etc.
on_call:              # true/false
years_experience:     # Required years
```

---

## Step 2 — Mandatory Web Research

Run ALL searches. Do not skip even if you think you know the answer.

```
Search 1: "{company}" "{role_title}" interview process {current_year}
Search 2: "{company}" SRE OR DevOps OR infrastructure interview experience site:glassdoor.com OR site:levels.fyi
Search 3: "{company}" engineering interview loop topics recently
Search 4: "{company}" engineering blog
```

Hold internally:
```
interview_rounds:    # Number and type of rounds
known_emphasis:      # What this company explicitly tests
recent_signals:      # Recent changes to interview process
culture_signals:     # From engineering blog — technical values
bar_description:     # What "hire" looks like at this level
source_quality:      # Per-topic: official_jd | verified_reports | community | inference
```

`source_quality` drives the confidence stars shown in the output.
Rate each conclusion independently:
- ★★★★★ — explicitly in official JD or company engineering docs
- ★★★★☆ — confirmed across multiple verified interview reports
- ★★★☆☆ — community patterns (Glassdoor, levels.fyi, prep sites)
- ★★☆☆☆ — inference or single source; note uncertainty

---

## Step 3 — Generate Session Blueprint

Load `../../templates/interview_blueprint.yaml` for schema.
Fill every field using JD data + web research.

**interview_style** — from culture_signals:
- SLO/measurement culture → `hypothesis_driven`
- Failure-first/chaos → `scenario_based`
- Leadership principles → `lp_driven`
- Correctness/edge cases → `correctness_focused`
- Startup/breadth → `breadth_first`

**question_distribution** — derive weights:
1. List topics from required_skills + tech_stack
2. Count JD mentions (required section counts 2x)
3. Boost from known_emphasis (web research)
4. Normalize to 100
5. Add web-research-only topics at 5-10%

**preferred_persona**:
- Google/SLO → `google_sre`
- Amazon/LP → `amazon_devops`
- Netflix/failure → `netflix_sre`
- Stripe/correctness → `stripe_engineering`
- Startup → `startup_devops`
- Generic senior → `staff_engineer`
- Bar-raiser → `strict_bar_raiser`

**incident_focus** — top 1-2 topics by weight

**evaluation_focus** — from culture_signals:
- SLO culture → `[production_thinking, debugging_methodology]`
- Postmortem culture → `[communication, production_thinking]`
- Correctness → `[technical_knowledge, depth]`

**success_factors** — generate 5 items ranked by importance for this company+level.
Each is a dimension Google (or the target company) is known to weight.
Assign stars (★★★★★ to ★★★☆☆) based on how heavily each is evaluated.

**knowledge_gaps** — check `../../templates/knowledge_mapping.yaml`.
Collect topics where coverage: none.

**resume_gaps** — only if `has_resume: true`.
Cross-reference required_skills + responsibilities against resume_evidence.
Categorize each required skill as:
- ✓ Evidenced — clear experience in resume
- ⚠ Weak — mentioned but depth unclear
- ✗ Missing — no evidence at all

Identify missing_evidence: specific work signals the JD implies but resume lacks
(e.g. on-call, SLO ownership, capacity planning, incident command, production debugging).

---

## Step 4 — Output the Prep Plan

Keep it scannable. One line per insight. No multi-line "Why:" paragraphs.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PrepOps  ·  {role_title}  ·  {company}  ·  {level}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  INTERVIEW FORMAT                                     {★★★★☆}
  {1-2 lines max: rounds, types, known weighting}
  Source: {highest-quality source}

  ──────────────────────────────────────────────────────

  SUCCESS FACTORS  ·  what {company} weighs most at {level}
  ★★★★★  {factor 1}
  ★★★★★  {factor 2}
  ★★★★☆  {factor 3}
  ★★★★☆  {factor 4}
  ★★★☆☆  {factor 5}

  ──────────────────────────────────────────────────────

  🎯  TOP PRIORITIES

  1. {Topic}  ({weight}%)                              {★★★★★}
     {One line: why this matters for this role}
     {✅ Full curriculum | ⚠️ General knowledge only}

  2. {Topic}  ({weight}%)                              {★★★★☆}
     {One line}
     {✅ / ⚠️}

  3. {Topic}  ({weight}%)                              {★★★★★}
     {One line}
     {✅ / ⚠️}

  [continue for all topics, no lower limit on count]

  ──────────────────────────────────────────────────────

  [ONLY SHOW IF has_resume: true]
  YOUR GAPS  ·  resume vs this role

  Required skills:
  ✓  {skill}  ·  {skill}  ·  {skill}
  ⚠  {skill} — limited depth
  ✗  {skill} — no evidence

  Missing work signals:
  ✗  On-call / incident response
  ✗  SLO ownership
  ✗  {other signal from responsibilities}

  Focus here first — these are the gaps that will cost you the offer.

  ──────────────────────────────────────────────────────

  📅  PREP PLAN

  Today (2 hrs)
  → {highest-gap topic}  ·  {mode}

  Tomorrow (2 hrs)
  → {next topic}  ·  {mode}

  This weekend
  → {topic}  ·  {mode}
  → {topic}  ·  {mode}

  Next week
  → Mock Interview  ·  {persona} persona
  → Production Scenario  ·  {incident_focus[0]} domain

  Prep priority: {HIGH / MEDIUM / LOW}
  {One line reason — e.g. "Multiple critical areas with no PrepOps curriculum coverage."}

  ──────────────────────────────────────────────────────

  Confidence: ★★★★★ official JD  ★★★★☆ verified reports
              ★★★☆☆ community    ★★☆☆☆ inference

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Rules for this output:**
- Never write a multi-line "Why:" block. One line per topic.
- Never show a readiness estimate in sessions. Not enough information without resume history.
- Confidence stars appear inline next to the claim they rate, not in a separate section.
- Resume gap section only appears when `has_resume: true`. Never show it empty.
- Prep plan uses time labels (Today / Tomorrow / This weekend / Next week), not Session 1/2/3.
- Sessions in the plan: earliest slots = highest gaps. Mock interview always near end.

---

## Step 5 — Session Start

After the prep plan, ask:

```
Where would you like to start?

  1. {highest-gap topic}  ·  {recommended mode}
  2. Mock interview  ·  {persona}  ·  {level}
  3. Production scenario  ·  {incident_focus[0]}
  4. Something else — type it
```

---

## Step 6 — Run the Session

Load the appropriate mode prompt from `../../prompts/`.
The blueprint drives the session. It replaces Steps 3-5 of SKILL.md.

**Curriculum:** look up each topic in `../../templates/knowledge_mapping.yaml`.
`coverage: full` → read the knowledge file. `coverage: none` → general knowledge, flag it.

**Incidents:** follow priority order in `../../templates/incident_generation.yaml`.

**Flow:** follow `../../templates/interview_flow.yaml`.

**Scoring:** follow `../../templates/evaluation_rubric.yaml` with evaluation_focus boost.

If `has_resume: true`: weight resume_gaps higher when selecting topics.
Cover ✗ Missing and ⚠ Weak skills before ✓ Evidenced ones.

---

## Step 7 — End-of-Session Report

Generate the standard report from SKILL.md Step 8.
Append after the standard dimensions:

```
  ──────────────────────────────────────────────────

  JD READINESS  ·  {role_title} at {company}

  Covered this session:
  ✓ {skill} — demonstrated at {level}
  ✗ {skill} — not tested

  Still to practice:
  → {topic}  ·  {mode}

  [IF has_resume: true]
  Resume gap progress:
  ✓ {gap} — addressed this session
  ✗ {gap} — still needs work
```

---

## Non-JD Entry: Quick Blueprint

If only company + role provided (no JD, no resume):
- Skip Step 0 and Step 1
- Run Step 2 (web research still mandatory)
- Generate blueprint from web research alone
- Note in output: "No JD provided — topic weights based on web research only" (★★★☆☆)
