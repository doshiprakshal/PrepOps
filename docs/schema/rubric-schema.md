# Rubric Schema

Rubrics define how sessions are scored and what the hire signal thresholds mean. They are the scoring engine behind the end-of-session report.

Two rubric files currently exist:

| File | Purpose |
|------|---------|
| `rubrics/dimensions.yaml` | The five scoring dimensions and their ★ criteria |
| `rubrics/hiring-signals.yaml` | Hire signal definitions and thresholds |

These files are shared across all sessions. Knowledge files contain topic-specific rubrics (`scoring_rubric` field) that feed into the dimensions defined here.

**Location:** `rubrics/{name}.yaml`

**Loaded by:** The end-of-session report in all modes.

---

## `rubrics/dimensions.yaml` Schema

This file defines the five scoring dimensions and what each ★ rating means.

### Required Fields

#### `name`
```yaml
name: dimensions
```

#### `description`
```yaml
description: "Scoring dimensions for PrepOps session evaluation"
```

#### `dimensions`
**Type:** object — one key per scoring dimension

Each dimension requires:
- `label` — display name shown in the report
- `weight` — decimal weight (all dimensions must sum to 1.0)
- `description` — what this dimension measures
- `star_guide` — what each ★ rating means (keys: `5`, `4`, `3`, `2`, `1`)

```yaml
dimensions:
  technical_knowledge:
    label: "Technical Knowledge"
    weight: 0.25
    description: "Accuracy and depth of technical understanding"
    star_guide:
      5: "Exceptional — volunteered advanced concepts unprompted; went beyond the question"
      4: "Strong — covered all key points with minor gaps that didn't undermine the answer"
      3: "Adequate — understood the basics; missed depth or nuance expected at this level"
      2: "Developing — foundational gaps; needed significant prompting to reach key points"
      1: "Significant gaps — major misconceptions or inability to engage with core concept"
```

#### `scoring`
**Type:** object — how to calculate the final score and the evidence requirement

```yaml
scoring:
  how_to_calculate: |
    Weighted average across dimensions:
    score = (TK * 0.25) + (PT * 0.25) + (DM * 0.25) + (C * 0.15) + (D * 0.10)
    Map score to hire signal via hiring-signals.yaml thresholds.

  evidence_rule: |
    Every dimension score MUST include one specific quote or example from the session.
    Never write "★★★★☆ Strong" without following it with a one-line evidence citation.
```

---

## `rubrics/hiring-signals.yaml` Schema

This file defines what each hire signal means, what threshold triggers it, and what language the report uses.

### Required Fields

#### `name`
```yaml
name: hiring-signals
```

#### `description`
```yaml
description: "Hire signal definitions and threshold guidance for PrepOps sessions"
```

#### `signals`
**Type:** object — one key per hire signal level

Signal keys: `STRONG_HIRE`, `LEAN_HIRE`, `BORDERLINE`, `LEAN_NO_HIRE`, `NO_HIRE`

Each signal requires:
- `display` — the exact string shown in the report
- `threshold_stars` — minimum average star score to reach this signal
- `description` — one-line summary
- `characteristics` — observable behaviors that produce this signal
- `typical_interview_signal` — template language for the "Interviewer Signal" block

```yaml
signals:
  STRONG_HIRE:
    display: "STRONG HIRE ⬆"
    threshold_stars: 4.5
    description: "Exceptional depth and production thinking across all or almost all dimensions"
    characteristics:
      - "Volunteers advanced concepts before being asked"
      - "Thinks about failure modes, blast radius, and monitoring without prompting"
      - "Can explain trade-offs at multiple levels of abstraction"
    typical_interview_signal: >
      "I would go to bat for this candidate. They demonstrated mastery beyond the
      question and showed they think like someone who has operated real systems
      in production."
```

---

## Adding a New Dimension

If you want to propose a new scoring dimension (e.g., "Incident Command" for SRE sessions):

1. Add the dimension to `rubrics/dimensions.yaml`
2. Adjust weights so all dimensions still sum to 1.0
3. Update `scoring.how_to_calculate` with the new formula
4. Open a PR with rationale for the new dimension

**Before adding:** Consider whether the new dimension is truly separate from existing ones, or whether it's better captured in `production_thinking` or `debugging_methodology`.

---

## Adding a New Rubric File

For domain-specific scoring criteria (e.g., a rubric for system design sessions that weights architecture quality higher):

1. Create `rubrics/{name}.yaml`
2. Follow the dimensions schema above, adjusting weights for the specific context
3. Reference it from the relevant mode prompt file (`prompts/system_design.md`)

Example:
```yaml
name: system-design
description: "Scoring rubric for system design and whiteboard sessions"

dimensions:
  architecture_quality:
    label: "Architecture Quality"
    weight: 0.30
    description: "Does the design actually solve the stated problem at scale?"
    star_guide:
      5: "Correct, scalable design that handles the stated constraints and foreseeable growth"
      4: "Correct design with minor gaps — one component missing or underthought"
      3: "Mostly correct design; misses one significant concern (reliability, scalability, or cost)"
      2: "Design exists but has a fundamental flaw that would prevent it from working at scale"
      1: "Design doesn't solve the stated problem or is not deployable"

  trade_off_articulation:
    label: "Trade-off Articulation"
    weight: 0.20
    description: "Can the candidate explain why each decision was made?"
    star_guide:
      5: "Every component choice explained with alternatives considered and rejected"
      4: "Most decisions explained; one or two chosen without justification"
      3: "Some decisions explained; pattern of choosing without reasoning"
      2: "Rarely explains choices; mostly describes what without why"
      1: "Cannot articulate trade-offs for any decision"
```

---

## Quality Checklist

- [ ] All dimension weights sum to 1.0
- [ ] Each ★ rating in `star_guide` is specific — describes what the candidate said or did, not a quality level label
- [ ] `evidence_rule` is present in `dimensions.yaml` — this prevents generic ratings
- [ ] Hire signal `characteristics` are observable behaviors, not character traits
- [ ] `typical_interview_signal` language sounds like a real interviewer debrief, not a template

---

## Common Mistakes

**Star criteria that are just quality labels.** `"4: Good"` is not a criterion. `"4: Covered all key points with minor gaps that didn't undermine the overall answer"` is a criterion — it tells the coach what "good" looks like concretely.

**Weights that don't sum to 1.0.** Check the arithmetic. Adding a new dimension without adjusting others breaks the scoring.

**Generic `typical_interview_signal` language.** `"This was a good candidate"` could be said by anyone. `"Strong hire. Identified the root cause at turn 4 before any hint — that's the key diagnostic leap. Would advance."` sounds like a real debrief.

**Missing evidence_rule enforcement.** The evidence_rule is the most important quality gate in the rubric system. Every ★ score in the report must cite something specific from the session. Without it, reports become generic and unconvincing.
