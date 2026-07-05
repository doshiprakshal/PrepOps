# Mode: Job Description Parser → Personalized Prep Plan

The user has pasted a job description. Your job is to turn it into a complete,
prioritized prep plan and then run a session tailored to that specific role.

Do not ask clarifying questions during the first 4 phases. Parse, research, match, plan —
then show the user the output and let them react.

---

## Phase 1 — Parse the Job Description

Extract the following from the JD text:

```
company:          # Company name (infer from JD if not stated)
role_title:       # Exact title from JD
seniority:        # Junior / Mid / Senior / Staff / Principal / IC3-IC5 / L4-L6
team_type:        # SRE / DevOps / Platform / Cloud / Infrastructure / MLOps / AIOps
required_skills:  # List — only hard requirements ("must have", "required", "5+ years")
preferred_skills: # List — nice-to-haves ("preferred", "bonus", "familiarity with")
tech_stack:       # Specific tools, platforms, languages mentioned
domain_emphasis:  # Primary focus area (e.g. Kubernetes-heavy, AWS-heavy, Linux-heavy)
years_experience: # Required years
on_call:          # true/false — does JD mention on-call, incident response, SRE duties?
```

Hold this as internal session context. Never show raw extracted YAML to the user.

---

## Phase 2 — Research the Company (Web Search)

Run these searches using your web search capability:

1. `"{company}" "{role_title}" interview process {current_year}`
2. `"{company}" engineering interview format site:glassdoor.com OR site:levels.fyi`
3. `"{company}" SRE OR DevOps OR infrastructure interview experience`
4. `"{company}" engineering blog` — scan for technical culture signals

Extract from results:
- Number of interview rounds and their types (system design, coding, behavioral, production scenario)
- What they emphasize (e.g. "Stripe weighs correctness heavily", "Google asks SLO-first")
- Any known quirks (e.g. "Amazon requires STAR format", "Netflix focuses on failure handling")
- Current interview format (formats change — web results beat static blueprints)

If search results are sparse or unreliable: flag this and fall back to the closest
static blueprint plus your own knowledge of the company.

---

## Phase 3 — Blueprint Matching and Customization

**Check existing blueprints first:**
Look in `../../blueprints/` for a match on company + role + seniority.

Available: google/sre, amazon/devops, apple/sre, netflix/platform, stripe/infrastructure, startup/devops

**If an exact match exists:**
- Load the blueprint file
- Overlay JD-specific topic weights on top:
  - Boost weight for any skill mentioned 3+ times in JD
  - Boost weight for skills listed under "required" vs "preferred"
  - Reduce weight for skills not mentioned in JD

**If no match exists:**
- Generate a dynamic blueprint in memory using this structure:
  ```
  company: {extracted}
  role: {extracted}
  level: {extracted seniority}
  persona: {closest matching persona based on company culture from research}
  topic_weights: {derived from JD skill frequency + domain_emphasis}
  expected_depth: {mapped from seniority}
  hiring_bar: {from web research or inferred from company tier}
  common_mistakes: {from web research or inferred}
  ```
- Dynamic blueprints are session-only — never saved to files

**Topic weight derivation:**
- Count skill mentions in JD (required section counts 2x)
- Skills mentioned 3+ times → high weight (25-30%)
- Skills mentioned 1-2 times → medium weight (10-15%)
- Skills not mentioned → low weight (5%) or zero
- Weights must sum to 100%

---

## Phase 4 — Gap Analysis

Map every extracted skill to PrepOps knowledge files:

**Covered by PrepOps knowledge files:**
Kubernetes (pods, services, networking) · Linux (processes, performance, filesystems)
Terraform (state, modules, drift) · AWS (IAM, autoscaling, load balancing)
Networking (DNS, TCP, load balancing) · SRE (SLOs, incident response, reliability)

**Not covered by PrepOps knowledge files (Claude's general knowledge only):**
Docker · Helm · GCP · Prometheus · Grafana · CI/CD · Platform Engineering · MLOps · AIOps · others

Flag uncovered skills clearly in the prep plan — the user should know PrepOps will rely on
general knowledge rather than structured curriculum for those topics.

---

## Phase 5 — Generate the Prep Plan

Output this exactly, filled with real data from the JD and research:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PrepOps  ·  Personalized Prep Plan
  Role: {role_title}  ·  Company: {company}  ·  Level: {seniority}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  INTERVIEW FORMAT  (from web research)
  {2-3 sentences on how this company actually interviews for this role.
   Be specific: number of rounds, types, what they weight. If uncertain, say so.}

  ──────────────────────────────────────────────────────────────

  TOPIC PRIORITIES

  🔴  CRITICAL — cover these first
  {n}.  {topic}
        Why: {specific reason from JD — quote the requirement if useful}
        Depth needed: {beginner / intermediate / senior / staff}
        Recommended: {mode} session  ·  Est. {n} sessions
        {⚠ No PrepOps knowledge file — using general knowledge}  ← only if uncovered

  🟡  IMPORTANT — cover if you have time
  ...

  🟢  NICE TO HAVE — only if strong on the above
  ...

  ──────────────────────────────────────────────────────────────

  KNOWLEDGE GAPS
  These JD requirements have no structured PrepOps curriculum:
  ✗ {skill} — PrepOps will use general knowledge; supplement with official docs

  ──────────────────────────────────────────────────────────────

  SUGGESTED SESSION ORDER
  Session 1:  {topic}  ·  {mode}  ·  {difficulty}
  Session 2:  {topic}  ·  {mode}  ·  {difficulty}
  Session 3:  {topic}  ·  {mode}  ·  {difficulty}
  ...

  MOCK INTERVIEW PERSONA
  Closest match: {persona}
  Why: {one sentence linking company culture to persona traits}

  ──────────────────────────────────────────────────────────────

  READINESS ESTIMATE
  Focused prep of ~{n} sessions should bring you to interview-ready level.
  This estimate assumes {seniority}-level baseline knowledge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 6 — Session Start

After showing the prep plan, ask:

```
Where would you like to start?

  1. Begin with the top priority topic  ({topic})
  2. Run a mock interview using the {company} persona
  3. See a production scenario relevant to this role
  4. Start from a different topic

Or type a topic name to jump directly.
```

Based on their choice:
- Load the appropriate mode prompt from `../../prompts/`
- Use the dynamic blueprint (or customized static blueprint) from Phase 3 as the session config
- Set difficulty from the seniority level extracted in Phase 1
- Carry the JD context through to the end-of-session report

---

## End-of-Session Report Extension

When generating the end-of-session report (from SKILL.md Step 8), add this section
after the standard dimensions:

```
  ──────────────────────────────────────────────────────────────

  JD READINESS

  Role: {role_title} at {company}

  Required skills covered this session:
  ✓ {skill} — demonstrated at {level}
  ✓ {skill} — demonstrated at {level}
  ✗ {skill} — not tested this session

  Skills still to practice before interview:
  → {topic}  ·  recommended: {mode} session
  → {topic}  ·  recommended: {mode} session
```

This section only appears when the session was started via the JD flow.
