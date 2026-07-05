# Contributing to PrepOps

PrepOps is open for community contributions to its **domain assets** — the content that makes sessions richer and more comprehensive.

The engine (prompts, templates, skills) is maintained by the project owners and is not open for community contribution. This keeps behavioral consistency across all sessions.

---

## The Four Contribution Types

| Type | Directory | What it adds |
|------|-----------|--------------|
| Knowledge | `knowledge/` | Curriculum for a new topic — what to know at each level, interview angles, common misconceptions |
| Incidents | `incidents/` | A new production scenario — symptoms, clues, red herrings, resolution |
| Personas | `personas/` | A new interviewer style and behavioral profile |
| Rubrics | `rubrics/` | New scoring dimensions or updated hiring-bar signals |

Each type is independently addable. A new incident does not require touching any other file.

---

## 1. Knowledge Files

**Path:** `knowledge/{domain}/{topic}.yaml`

**When to add one:**
- The topic is relevant to Infrastructure, DevOps, SRE, Cloud, MLOps, or AIOps interviews
- It supports at least 30 minutes of coaching
- There is no existing file covering it (check `knowledge/` before opening a PR)

**Schema — all required fields:**

```yaml
topic: your-topic-slug          # matches filename without .yaml
display_name: "Human Readable Name"
domain: kubernetes              # kubernetes | linux | terraform | aws | networking | sre
category: "Category Name"
version: "1.0"
contributors:
  - your-github-username

prerequisites:
  - domain/related-topic        # optional

learning_objectives:
  - "What the learner will be able to do after this session"
  # 4-6 objectives, action-verb prefixed (Explain, Design, Debug, ...)

key_concepts:
  - name: "Concept Name"
    summary: "One-sentence explanation"
    production_relevance: critical | high | medium | low

common_misconceptions:
  - "What people think — What is actually true"
  # 3-5 entries

difficulty:
  beginner:
    expected_understanding:
      - "What someone at this level should know"
    key_concepts_to_mention:
      - "concept"
  intermediate:
    expected_understanding: [...]
    key_concepts_to_mention: [...]
  senior:
    expected_understanding: [...]
    key_concepts_to_mention: [...]
  # staff and principal are optional but appreciated

interview_angles:
  - angle: "Debugging | Production scenario | Conceptual | Trade-offs | Design"
    prompt: "The actual question the coach will ask"
  # 3-5 angles covering different question types

debugging_commands:
  - command: "the actual command"
    purpose: "What it reveals and why it matters in this context"
  # Only for topics where CLI debugging is relevant

scenario_seeds:
  - title: "Short descriptive title"
    setup: "Observable symptoms only — what the on-call engineer sees first"
    hint: "Root cause and how it maps to symptoms — never shown to the candidate"
    difficulty: beginner | intermediate | senior | staff

scoring_rubric:
  technical_accuracy:
    strong_signals:
      - "Specific thing a strong answer includes"
    red_flags:
      - "Specific mistake that reveals misunderstanding"
  reasoning:
    strong_signals: [...]
    red_flags: [...]
  production_thinking:
    strong_signals: [...]
    red_flags: [...]
  communication:
    strong_signals: [...]
    red_flags: [...]

follow_up_questions:
  - trigger: "Candidate mentions X"
    question: "The follow-up the coach asks"

references:
  - title: "Title"
    url: "https://..."
```

**Quality bar:**
- Rubric red_flags must be specific — not "doesn't understand networking"
- Scenario seeds must use only observable symptoms in `setup` — no root cause hints
- At least 3 interview angles covering different question types
- Misconceptions: the correction side must be precise, not just "it's more complex"

**Also update:** `templates/knowledge_mapping.yaml` — add your topic slug with the correct file path and `coverage: full`.

---

## 2. Incidents

**Path:** `incidents/{domain}/{incident-name}.yaml`

Production scenarios for the on-call simulation mode. The coach responds as the terminal — revealing only what commands expose.

**Required fields:**

```yaml
id: short-kebab-id
title: "Human readable title"
domain: kubernetes | linux | networking | sre | aws
difficulty: intermediate | senior | staff
version: "1.0"
contributors:
  - your-github-username

opening_message: |
  [observable symptoms only — service name, timestamp, SLO burn rate,
   2-3 lines of monitoring data. End with: "Where do you start?"]

root_cause: "One sentence — not shown to candidate"

clues:
  - trigger: "candidate runs: kubectl get pods -n {ns}"
    output: |
      [exact realistic command output]
    reveals: "what this clue narrows down — domain, not root cause"

  - trigger: "candidate runs: kubectl describe pod {pod}"
    output: |
      [...]
    reveals: "narrows to the subsystem"

  - trigger: "candidate runs: {specific command}"
    output: |
      [...]
    reveals: "makes root cause clear when combined with clue 2"

red_herrings:
  - what: "CPU spike on adjacent service"
    how_it_appears: "monitoring shows 90% CPU on auth-service"
    why_unrelated: "auth-service is fine — unrelated load spike"

  - what: "Recent deploy"
    how_it_appears: "deployment 4 hours ago"
    why_unrelated: "deploy was successful and unrelated to this failure"

turn_budget:
  intermediate: 9
  senior: 12
  staff: 15

hint_sequence:
  turn_3: "Slack from on-call lead — customer impact mentioned, no hint"
  turn_6: "Colleague message — narrows to the right layer"
  turn_9: "More specific hint — subsystem"
  turn_12: "Colleague finds it — reveal, ask for fix and postmortem"

resolution_sequence:
  - "Step 1: identify root cause"
  - "Step 2: immediate mitigation"
  - "Step 3: permanent fix"
  - "Step 4: what to add to the postmortem / what monitoring was missing"
```

**Quality bar:**
- Root cause must be non-obvious from initial symptoms
- Red herrings must be plausible — they must look worth investigating
- Clue outputs must use realistic formatting (real `kubectl`, `ss`, `df`, `journalctl` output)
- Investigation must reward systematic thinking — random guessing should not work

---

## 3. Personas

**Path:** `personas/{persona-id}.yaml`

Interviewer behavioral profiles. Each persona controls tone, follow-up style, hint policy, and the closing question.

**Required fields:**

```yaml
id: persona-slug
display_name: "Human Readable Name"
description: "1-2 sentences on this interviewer's style"
version: "1.0"
contributors:
  - your-github-username

behavior:
  tone: neutral | warm | direct | challenging | formal
  first_question_style: "How the interview opens"
  followup_patterns:
    - "Pattern 1 — what triggers it and what the follow-up sounds like"
    - "Pattern 2"
  silence_handling: "What to do if candidate goes quiet for more than 30 seconds"

hints_policy:
  give_hints: true | false
  when: "under what conditions hints are given"
  how: "how hints are framed — what they sound like"

closing_question:
  question: "The exact closing question this persona asks"
  what_it_tests: "What dimension this probes"
  strong_signals:
    - "What a good answer to this question looks like"

push_back_style: "How this persona challenges weak answers"
```

---

## 4. Rubrics

**Path:** `rubrics/`

Scoring dimensions and hiring-bar calibrations. Contribute a new dimension or update an existing one.

**When to add a dimension:** A quality that interviewers consistently evaluate but PrepOps doesn't yet capture.

Check `rubrics/dimensions.yaml` for existing dimensions before adding. If you're updating existing criteria, open a PR with the change and explain why the current signal is wrong or incomplete.

---

## Branch and PR Conventions

```bash
# Knowledge
git checkout -b knowledge/{domain}/{topic}
git add knowledge/{domain}/{topic}.yaml templates/knowledge_mapping.yaml
git commit -m "Add knowledge: {Topic Display Name}"

# Incident
git checkout -b incident/{domain}/{short-name}
git add incidents/{domain}/{incident-name}.yaml
git commit -m "Add incident: {Title}"

# Persona
git checkout -b persona/{id}
git add personas/{id}.yaml
git commit -m "Add persona: {Display Name}"

# Rubric
git checkout -b rubric/{change-description}
git commit -m "Update rubric: {what changed}"
```

PR title format: `Add {type}: {Name}` or `Update {type}: {Name}`

---

## What PrepOps Needs Most

**Knowledge — not yet written:**
- `kubernetes/storage.yaml` — PV, PVC, StorageClass, CSI
- `kubernetes/security.yaml` — RBAC, PSA, network policies
- `kubernetes/scheduling.yaml` — affinity, taints, priority classes
- `docker/containers.yaml` — Dockerfile, layers, container fundamentals
- `aws/eks.yaml` — EKS node groups, Fargate, managed add-ons
- `prometheus/alerting.yaml` — alertmanager, alert rules, routing
- `cicd/pipelines.yaml` — GitHub Actions, ArgoCD, deployment patterns

**Incidents — high value:**
- Terraform state lock under concurrent apply
- EKS node not joining cluster
- Prometheus scrape target disappearing
- ArgoCD sync failing silently

**Personas:**
- Stripe-style correctness interviewer (edge cases, failure modes, idempotency)
- Startup generalist (breadth, speed, pragmatism over elegance)
