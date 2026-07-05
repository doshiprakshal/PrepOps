# PrepOps — Blueprint Generator & Interview Engine

This flow triggers when the user pastes a job description, mentions a target role,
or says "I have a JD" / "prep me for this role".

The output is a session blueprint that exists only in memory.
It is never saved to a file. Nothing company-specific lives in the repository.

---

## Step 1 — Extract from Job Description

Parse the JD text and extract the following. Hold as internal session context:

```
company:              # Company name (infer from JD text, domain, or user input if not stated)
role_title:           # Exact title from JD
level:                # Map to: junior | mid | senior | staff | principal
                      # IC3→mid, IC4→senior, IC5→staff, L3→mid, L5→senior, L6→staff, etc.
required_skills:      # Hard requirements ("must have", "required", "X+ years of")
preferred_skills:     # Nice-to-haves ("preferred", "bonus", "familiarity with")
responsibilities:     # What they'll actually do day-to-day
tech_stack:           # Specific tools, platforms, languages named in JD
domain_emphasis:      # Primary domain: kubernetes-heavy | linux-heavy | aws-heavy | sre-heavy | etc.
on_call:              # true/false — JD mentions on-call, incident response, SRE duties
years_experience:     # Required years (use to calibrate level if level is ambiguous)
```

Do not show raw extracted data to the user. Hold it internally.

---

## Step 2 — Mandatory Web Research

Run ALL of the following searches. Do not skip this step even if you think you know the answer.
Interview formats change. What you know from training may be outdated.

```
Search 1: "{company}" "{role_title}" interview process {current_year}
Search 2: "{company}" SRE OR DevOps OR infrastructure interview experience site:glassdoor.com OR site:levels.fyi
Search 3: "{company}" engineering interview loop topics recently
Search 4: "{company}" engineering blog   (scan for technical culture and values signals)
```

Extract and hold internally:
```
interview_rounds:       # Number and type of rounds (system design, coding, production, behavioral)
known_emphasis:         # What this company explicitly tests or values
recent_signals:         # Any notable recent changes to their interview process
culture_signals:        # From engineering blog — what they care about technically
bar_description:        # What "hire" looks like at this level, from data
```

If search results are sparse, conflicting, or low confidence:
- Flag this explicitly in the prep plan output
- Rely on your training knowledge, but note the uncertainty

---

## Step 3 — Generate Session Blueprint

Load `../../templates/interview_blueprint.yaml` for the schema.
Fill every field using the extracted JD data and web research.

**interview_style** — select based on culture_signals:
- Strong measurement/SLO culture → `hypothesis_driven`
- Failure-first, chaos culture → `scenario_based`
- Leadership principles in every question → `lp_driven`
- Correctness, edge cases, financial systems → `correctness_focused`
- Startup, breadth expected → `breadth_first`

**question_distribution** — derive weights:
1. List all topics from required_skills + tech_stack
2. Count mentions across the full JD (required section counts 2x)
3. Cross-reference with known_emphasis from web research (boost topics they're known to test)
4. Normalize to 100
5. Topics not in JD but known from web research as company-standard: add at 5-10%

**preferred_persona** — match company culture to closest persona:
- Google/measurement/SLO focus → `google_sre`
- Amazon/LP/ownership → `amazon_devops`
- Netflix/failure-first → `netflix_sre`
- Stripe/correctness/edge cases → `stripe_engineering`
- Startup/breadth → `startup_devops`
- Generic senior → `staff_engineer`
- Pushback-heavy bar-raiser culture → `strict_bar_raiser`

**incident_focus** — top 1-2 topics by weight from question_distribution

**evaluation_focus** — from culture_signals:
- Companies that write about SLOs → `[production_thinking, debugging_methodology]`
- Companies that value communication/postmortems → `[communication, production_thinking]`
- Correctness-focused → `[technical_knowledge, depth]`

**knowledge_gaps** — load `../../templates/knowledge_mapping.yaml`.
For each topic in question_distribution, check coverage field.
Collect all topics where coverage: none.

---

## Step 4 — Output the Prep Plan

Show this to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PrepOps  ·  Personalized Prep Plan
  {role_title}  ·  {company}  ·  {level}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  INTERVIEW FORMAT
  {2-3 sentences from web research. Be specific: rounds, types, what they weight.
   If data was sparse or uncertain, say: "Limited public data — based on [source]."}

  GENERATED BLUEPRINT
  Interview style:  {interview_style}
  Persona:          {preferred_persona}
  Evaluation focus: {evaluation_focus joined by ", "}

  ──────────────────────────────────────────────────────────────

  TOPIC PRIORITIES

  🔴  CRITICAL — cover these first
  {topic}  ·  {weight}%
    Why: {specific reason from JD or web research}
    Depth: {difficulty level}  ·  PrepOps coverage: {full / general knowledge only}

  🟡  IMPORTANT — cover if you have time
  ...

  🟢  NICE TO HAVE
  ...

  ──────────────────────────────────────────────────────────────

  KNOWLEDGE GAPS
  These topics appear in the JD but PrepOps has no structured curriculum:
  ✗ {topic} — session will use Claude's general knowledge
  (No gaps) ← if knowledge_gaps is empty

  ──────────────────────────────────────────────────────────────

  SUGGESTED SESSION ORDER
  Session 1:  {topic}  ·  Learn Concept  ·  {difficulty}
  Session 2:  {topic}  ·  Production Scenario  ·  {difficulty}
  Session 3:  {topic}  ·  Mock Interview ({persona})
  Session 4:  {topic}  ·  Debugging Lab  ·  {difficulty}
  ...

  READINESS ESTIMATE
  ~{n} focused sessions to reach interview-ready level.
  Assumes {level}-level baseline knowledge coming in.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 5 — Session Start

After showing the prep plan, ask:

```
Where would you like to start?

  1. Top priority topic  ({highest weight topic})
  2. Mock interview  ({persona} persona, {level} difficulty)
  3. Production scenario  ({incident_focus[0]} domain)
  4. Different topic — type it

Or ask me anything about the prep plan.
```

---

## Step 6 — Run the Session

Based on their choice, load the appropriate mode prompt from `../../prompts/`.
Pass the generated blueprint as session config. It replaces Step 3-5 of SKILL.md for this session.

**Curriculum matching:**
For each topic in question_distribution, look up `../../templates/knowledge_mapping.yaml`.
If file exists and coverage: full → read the knowledge file and use it.
If coverage: none → use Claude's general knowledge. Flag in session.

**Incident selection and generation:**
Follow the priority order in `../../templates/incident_generation.yaml`:
1. Check `../../incidents/{domain}/` for a matching file
2. Check `../../incident-templates/` for a matching template
3. Generate fresh using incident_generation.yaml rules

**Interview flow:**
Follow `../../templates/interview_flow.yaml` for phase structure and adaptive rules.

**Scoring:**
Follow `../../templates/evaluation_rubric.yaml`.
Apply evaluation_focus boost from the blueprint.
Calibrate hire signal against blueprint.hiring_bar.

---

## Step 7 — End-of-Session Report

Generate the standard report from SKILL.md Step 8.
Append this JD-specific section after the standard dimensions:

```
  ──────────────────────────────────────────────────────────────

  JD READINESS  ·  {role_title} at {company}

  Required skills covered this session:
  ✓ {skill} — demonstrated at {level} level
  ✓ {skill} — demonstrated at {level} level
  ✗ {skill} — not tested this session

  Still to practice before interview:
  → {topic}  ·  recommended: {mode}
  → {topic}  ·  recommended: {mode}

  Overall readiness for this role: {Not ready / Developing / Close / Ready}
  Based on: {1-2 sentences tying session performance to JD requirements}
```

---

## Non-JD Entry: Quick Blueprint

If the user provides only company + role (no full JD):
- Extract: company, role, level from their input
- Skip Step 1 (no JD to parse)
- Run Step 2 (web research is still mandatory)
- Run Steps 3-7 with reduced topic signal (weights derived from web research alone)
- Note in prep plan: "No JD provided — topic weights based on web research only"
