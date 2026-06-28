# Contributing to PrepOps

## Knowledge Base Contributions

The PrepOps knowledge base is what makes the coach effective. Each file defines rubrics, scenarios, and evaluation criteria for a specific topic. Claude uses this to generate dynamic questions and evaluate responses — not as a fixed question bank.

### What Makes a Good Knowledge File

- **Curriculum, not questions** — define what should be understood at each level, not a list of questions
- **Production-first** — scenario seeds from real incidents, not textbook examples
- **Rubric clarity** — strong signals and red flags that distinguish real understanding from memorized answers
- **Common misconceptions** — what most candidates get wrong; helps Claude probe effectively

---

## Adding a New Topic

### 1. Check if the topic is appropriate

Topics should be:
- Relevant to Infrastructure, DevOps, SRE, Cloud, MLOps, or AIOps interviews
- Substantial enough to support 30+ minutes of coaching
- Distinct from existing topics (check `knowledge/` before duplicating)

### 2. Create the YAML file

File path: `knowledge/{domain}/{topic}.yaml`

Use the schema template below. All required fields must be present. Validate against `schema/knowledge.schema.yaml`.

```yaml
topic: your-topic-slug          # matches filename without .yaml
display_name: "Human Readable Name"
domain: kubernetes              # kubernetes | linux | terraform | aws | networking | sre | docker | gcp | cicd
category: "Category Name"
version: "1.0"
contributors:
  - your-github-username

prerequisites:
  - domain/related-topic        # optional

learning_objectives:
  - "What the learner will be able to do after this session"
  # 4-6 objectives, action-verb prefixed (Explain, Design, Debug, Implement, ...)

key_concepts:
  - name: "Concept Name"
    summary: "One-sentence explanation for the coach"
    production_relevance: critical | high | medium | low

common_misconceptions:
  - "Misconception — Correction"
  # 3-5 entries, format: "[what people think] — [what's actually true]"

difficulty:
  beginner:
    expected_understanding:
      - "What someone at this level should know"
    key_concepts_to_mention:
      - "concept"

  intermediate:
    expected_understanding:
      - "..."
    key_concepts_to_mention:
      - "..."

  senior:
    expected_understanding:
      - "..."
    key_concepts_to_mention:
      - "..."

  # staff and principal are optional but appreciated

interview_angles:
  - angle: "Debugging | Production scenario | Conceptual | Trade-offs | Design"
    prompt: "The actual question Claude will ask"
  # 3-5 angles, covering different question types

debugging_commands:
  - command: "the actual command"
    purpose: "What it shows and why it's useful in this context"
  # Only for topics where CLI debugging is relevant

scenario_seeds:
  - title: "Short descriptive title"
    setup: "Observable symptoms only — what the on-call engineer sees first"
    hint: "The root cause and how it maps to symptoms — used by Claude to guide without giving away the answer"
    difficulty: beginner | intermediate | senior | staff

scoring_rubric:
  technical_accuracy:
    strong_signals:
      - "Specific thing a good answer includes"
    red_flags:
      - "Specific mistake that reveals misunderstanding"

  reasoning:
    strong_signals:
      - "..."
    red_flags:
      - "..."

  production_thinking:
    strong_signals:
      - "..."
    red_flags:
      - "..."

  communication:
    strong_signals:
      - "..."
    red_flags:
      - "..."

follow_up_questions:
  - trigger: "User mentions X"
    question: "The follow-up question Claude asks when triggered"

references:
  - title: "Title"
    url: "https://..."
```

### 3. Update SKILL.md domain map

If your topic is in an existing domain, add it to the Domain → Knowledge File Map table in `skills/claude/SKILL.md`.

If it is a new domain, add a new section to the map.

### 4. Submit a PR

```
git checkout -b knowledge/your-topic
# write your YAML
git add knowledge/your-domain/your-topic.yaml
git commit -m "Add knowledge: Your Topic Name"
gh pr create --title "Add knowledge: Your Topic" --body "..."
```

---

## Quality Bar

PRs to the knowledge base are reviewed for:

- [ ] All required fields present
- [ ] Scenario seeds use only observable symptoms (no hints in setup)
- [ ] Rubric red_flags are specific, not generic
- [ ] At least 3 interview angles covering different question types
- [ ] Misconceptions are accurate (the "correction" side must be precise)
- [ ] References point to official or high-quality sources

---

## Code Contributions

For changes to skills, prompts, or the plugin infrastructure:

- Open an issue first for significant changes
- Keep prompt files focused — each mode should have one clear behavioral contract
- Test your changes against actual Claude Code sessions before submitting

---

## Topics We Need

High-priority knowledge files not yet written:

- `kubernetes/storage.yaml` — PV, PVC, StorageClass, CSI drivers
- `kubernetes/security.yaml` — RBAC, PSA, network policies, secrets
- `kubernetes/scheduling.yaml` — affinity, taints, tolerations, priority
- `docker/containers.yaml` — container fundamentals, Dockerfile, layers
- `terraform/testing.yaml` — Terratest, terraform test, validation
- `aws/eks.yaml` — EKS cluster management, node groups, Fargate
- `gcp/gke.yaml` — GKE modes, Autopilot vs Standard
- `prometheus/alerting.yaml` — alertmanager, alert rules, routing
- `cicd/pipelines.yaml` — GitHub Actions, GitLab CI, Jenkins, ArgoCD
- `mlops/model-serving.yaml` — KServe, Triton, serving patterns
