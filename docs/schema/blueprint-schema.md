# Blueprint Schema

Blueprints define what a specific company interview looks like for a specific role and level. They control topic weights, expected depth, the persona used, what the hiring bar actually is, and what mistakes candidates commonly make.

Blueprints are what makes `"Google SRE IC3"` feel different from `"Google SRE IC5"` and both feel different from `"Amazon DevOps L5"` — same coach, completely different calibration.

**Location:** `blueprints/{company}/{role}/{level}.yaml`

**Examples:**
```
blueprints/google/sre/ic3.yaml
blueprints/amazon/devops/l5.yaml
blueprints/netflix/platform/staff.yaml
```

**Loaded by:** Mock Interview mode (when user selects a target company), and optionally by any mode when blueprint context is requested.

---

## Required Fields

### `company`
**Type:** string — company name, display format

```yaml
company: Google
```

---

### `role`
**Type:** string — role name, display format

```yaml
role: Site Reliability Engineer
```

---

### `level`
**Type:** string — level code used in the filename and display

```yaml
level: IC4
```

---

### `level_display`
**Type:** string — human-readable level label

```yaml
level_display: "Senior SRE"
```

---

### `persona`
**Type:** string — the persona ID to load from `personas/{id}.yaml`

This is how the blueprint connects to an interviewer behavioral profile. The persona controls question style, follow-up intensity, and hints policy.

```yaml
persona: google_sre
```

Available personas: `google_sre`, `amazon_devops`, `netflix_sre`, `stripe_engineering`, `startup_devops`, `staff_engineer`, `principal_engineer`, `friendly_mentor`, `strict_bar_raiser`

---

### `topic_weights`
**Type:** object — percentage of the interview spent on each topic area. Must sum to 100%.

Topic areas are flexible — use what matches the actual interview. Common areas:

```yaml
topic_weights:
  coding: 20%
  linux: 20%
  networking: 15%
  troubleshooting: 20%
  system_design: 15%
  sre_concepts: 10%
```

**How the coach uses this:** topic_weights determine which knowledge files to draw questions from and how many questions to ask per area. A 30% weight means roughly 30% of session exchanges focus on that domain.

---

### `expected_depth`
**Type:** object — the level of depth expected per topic at this company/role/level

Values: `foundational`, `low`, `medium`, `medium-high`, `high`, `very-high`

```yaml
expected_depth:
  coding: medium-high
  linux: high
  networking: medium
  troubleshooting: high
  system_design: medium
  sre_concepts: medium
```

**How the coach uses this:** If `linux: high` is set, the coach probes deeper on Linux topics — expects kernel-level knowledge, not just command names. If `system_design: low`, the coach covers it briefly or skips it.

---

### `hiring_bar`
**Type:** object — what the verdict looks like at this specific company/level. Four sub-keys are required.

This is calibrated per-level. A STRONG HIRE at IC3 may be a LEAN HIRE at IC4 for the same performance.

```yaml
hiring_bar:
  strong_hire: >
    Shows production instinct despite limited experience. Debugging
    process is hypothesis-first even if slow. Can write working code
    for systems tasks under pressure. Asks about failure modes without
    being prompted.
  hire: >
    Solid Linux and networking fundamentals. Follows a debugging
    process with light prompting. Writes working code for systems tasks.
  borderline: >
    Knows concepts but can't apply them to scenarios. Can't debug
    without heavy guidance. Code works but has no error handling or
    edge case awareness.
  no_hire: >
    Cannot reason about Linux fundamentals. Debugging is random.
    Can't produce a working systems script under any conditions.
```

**Important:** Write these in terms of what the candidate demonstrates in the interview, not in terms of years of experience or job title.

---

### `common_mistakes`
**Type:** list of strings — what candidates at this level commonly get wrong in this specific interview

```yaml
common_mistakes:
  - "Jumping to solutions before forming a hypothesis — especially during troubleshooting"
  - "Not asking clarifying questions before starting a system design"
  - "Weak on Linux fundamentals despite applying for SRE — top reason for rejection at IC3"
  - "Memorized definitions with no production context"
  - "Writing pseudocode when the interviewer asked for working code"
```

Use this to describe patterns you've seen from real interview reports, engineering blogs, or credible first-hand accounts. Don't invent these.

---

### `prep_focus`
**Type:** object with `high`, `medium`, and `lower` sub-keys — what candidates should study

```yaml
prep_focus:
  high:
    - Linux process management and performance tools (use them, don't just describe them)
    - TCP/IP and DNS from first principles
    - Python scripting for log parsing and automation
    - Debugging methodology — hypothesis formation, systematic elimination
  medium:
    - Kubernetes basics (pods, services, deployments)
    - Monitoring concepts
    - Git and CI/CD basics
  lower:
    - Advanced Kubernetes internals
    - Large-scale distributed systems design
    - Deep protocol specifications
```

---

## Optional Fields

### `interview_structure`
Describes the round format. Useful context for users simulating a full interview loop.

```yaml
interview_structure:
  rounds: 4
  format: "Phone screen → 4 virtual onsite rounds"
  round_types:
    - "Coding (Python or Go scripting)"
    - "Linux and Systems"
    - "Networking and Troubleshooting"
    - "Behavioral"
```

### `topics_tested`
Specific sub-topics within each area. Useful when the area is broad.

```yaml
topics_tested:
  coding:
    - Python or Go scripting — log parsing, data processing, automation
    - Not LeetCode algorithms — practical systems scripting
  linux:
    - Process management (ps, top, signals, zombies)
    - Performance tools (iostat, vmstat, sar)
    - File descriptors, open files, lsof
```

### Company-specific context sections
Some companies have distinctive interview elements. Add a named section to capture them.

**For Amazon (Leadership Principles):**
```yaml
lp_focus:
  primary:
    - Ownership: "Takes accountability for outcomes, not tasks"
    - Dive Deep: "Gets into specific technical details"
  secondary:
    - Customer Obsession
    - Deliver Results
```

**For Netflix (Culture):**
```yaml
netflix_culture_signals:
  freedom_and_responsibility:
    - "Acts like an owner — makes decisions without asking permission"
    - "Gives and receives feedback directly"
```

---

## Complete Example

```yaml
company: Datadog
role: Site Reliability Engineer
level: Senior
level_display: "Senior SRE"
persona: google_sre

interview_structure:
  rounds: 5
  format: "Phone screen → 5 virtual onsite rounds"
  round_types:
    - "Coding (Python/Go)"
    - "Systems and Linux"
    - "Observability Deep Dive"
    - "System Design"
    - "Behavioral"

topic_weights:
  coding: 20%
  linux: 20%
  observability: 25%
  troubleshooting: 20%
  system_design: 10%
  behavioral: 5%

topics_tested:
  observability:
    - Prometheus metrics, PromQL, alerting
    - Distributed tracing concepts (spans, traces, context propagation)
    - Log aggregation patterns
    - Dashboards and SLO monitoring
  linux:
    - Performance analysis: top, vmstat, iostat, perf
    - Process management and signals
    - Network stack and socket debugging
  coding:
    - Python or Go — automation, log parsing, metric collection
    - Not algorithm-heavy — practical observability tooling

expected_depth:
  coding: medium
  linux: medium-high
  observability: high
  troubleshooting: high
  system_design: medium
  behavioral: low-medium

hiring_bar:
  strong_hire: >
    Deep observability instinct — doesn't just say "add monitoring,"
    knows what metrics and traces to look at first and why. Can
    design an alerting system with meaningful SLOs and actionable
    alerts. Debugging is systematic and uses the right tools.
  hire: >
    Solid Linux and observability fundamentals. Can debug a slow
    service using metrics and logs. Understands SLOs conceptually
    and can design a basic monitoring setup.
  borderline: >
    Knows Prometheus and Grafana exist but can't write a PromQL
    query or explain what a histogram vs summary measures. Linux
    debugging relies on top and not much else.
  no_hire: >
    Cannot reason about performance metrics. Debugging is random.
    Treats observability as "add more logs."

common_mistakes:
  - "Saying 'we'd add more monitoring' without specifying what metrics and what thresholds"
  - "Not knowing PromQL — Datadog uses Prometheus heavily internally"
  - "Weak on distributed tracing concepts despite applying for SRE at an observability company"
  - "Designing alerts without specifying SLOs or actionability"
  - "Treating logs as the only observability signal"

prep_focus:
  high:
    - PromQL: rate(), increase(), histogram_quantile(), label_replace()
    - Alertmanager: routing, grouping, inhibition rules
    - SLO design: picking the right SLIs, error budget calculation
    - Distributed tracing: spans, context propagation, sampling strategies
  medium:
    - Linux performance tools: perf, vmstat, iostat
    - Kubernetes monitoring: kube-state-metrics, cAdvisor, metrics-server
    - Log aggregation patterns: structured logging, log levels, sampling
  lower:
    - Datadog-specific products (relevant but not the technical bar)
    - Advanced algorithm challenges
```

---

## Quality Checklist

- [ ] `topic_weights` sum to 100%
- [ ] `persona` references an existing file in `personas/`
- [ ] `hiring_bar` describes observable interview behavior, not years of experience
- [ ] `common_mistakes` are based on real patterns — credible sources, not invented
- [ ] `expected_depth` values are calibrated relative to the level (IC3 vs IC5 should be meaningfully different)
- [ ] If `interview_structure` is included, round types match the `topic_weights` distribution

---

## Common Mistakes

**Topic weights that don't add up.** Check they sum to 100%. Common error: adding a category and forgetting to reduce another.

**Hiring bar descriptions based on experience, not behavior.** "5+ years of SRE experience" is not a hiring bar. "Can explain what breaks at 10x load without being asked" is.

**Common mistakes that are too generic.** "Doesn't know enough Linux" is not useful. "Can't explain what the vmstat 'b' column means, despite it being the first tool you'd reach for in an I/O saturation scenario" is.

**Copying topic weights from a similar company.** Google SRE IC3 and Amazon DevOps L5 are very different interviews — Amazon's behavioral weight (~35%) is much higher than Google's (~5%). Research the specific company before estimating weights.

**Missing the level calibration.** A blueprint for IC3 and IC5 at the same company should have meaningfully different `expected_depth` and `hiring_bar`. If they look the same, the blueprint isn't useful.
