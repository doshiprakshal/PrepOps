# PrepOps Schema Reference

PrepOps composes an interview from five independent file types. Each type lives in its own top-level directory and can be improved without touching any other layer.

```
Blueprint → Persona → Incident → Knowledge → Rubric
```

---

## The Five Layers

| Layer | Directory | Controls |
|-------|-----------|----------|
| **Blueprint** | `blueprints/{company}/{role}/{level}.yaml` | Company/role/level expectations, topic weights, hiring bar |
| **Persona** | `personas/{id}.yaml` | Interviewer behavior, question style, follow-up intensity |
| **Incident** | `incidents/{domain}/{id}.yaml` | Production scenario, clues, red herrings, terminal output |
| **Knowledge** | `knowledge/{domain}/{topic}.yaml` | Topic curriculum, misconceptions, scoring rubric, scenario seeds |
| **Rubric** | `rubrics/{name}.yaml` | Hire signal thresholds, dimension scoring criteria |

A contributor can add a new incident without touching any other file. A blueprint contributor doesn't need to know how personas work. Each layer has a defined contract and schema.

---

## Schema Docs

- [Knowledge Schema](schema/knowledge-schema.md) — topic curriculum files
- [Blueprint Schema](schema/blueprint-schema.md) — company/role/level interview models
- [Persona Schema](schema/persona-schema.md) — interviewer behavioral profiles
- [Incident Schema](schema/incident-schema.md) — handcrafted production scenario files
- [Incident Template Schema](schema/incident-template-schema.md) — reusable scenario pattern templates
- [Rubric Schema](schema/rubric-schema.md) — scoring and hire signal definitions

---

## File Naming Conventions

| Layer | Pattern | Examples |
|-------|---------|---------|
| Knowledge | `{topic}.yaml` — lowercase, hyphens | `network-policies.yaml`, `slos-error-budgets.yaml` |
| Blueprint | `{level}.yaml` inside `{company}/{role}/` | `blueprints/google/sre/ic4.yaml` |
| Persona | `{id}.yaml` — lowercase, underscores | `personas/google_sre.yaml`, `personas/friendly_mentor.yaml` |
| Incident | `{id}.yaml` — lowercase, hyphens | `incidents/kubernetes/mtu-mismatch.yaml` |
| Rubric | `{name}.yaml` — lowercase, hyphens | `rubrics/dimensions.yaml`, `rubrics/hiring-signals.yaml` |

---

## How Layers Connect

**In mock interview mode:**
1. User selects blueprint (`blueprints/google/sre/ic4.yaml`)
2. Blueprint's `persona` field (`google_sre`) loads `personas/google_sre.yaml`
3. Blueprint's `topic_weights` determine which knowledge files to draw from
4. Session ends with verdict calibrated against blueprint's `hiring_bar`

**In production scenario mode:**
1. Coach loads an incident file (`incidents/kubernetes/mtu-mismatch.yaml`)
2. Incident's `clues`, `red_herrings`, and `turn_budget` drive the simulation
3. Knowledge file's `scoring_rubric` is used for the investigation score
4. End-of-session report uses `rubrics/dimensions.yaml` for star criteria

**In learn concept mode:**
1. Knowledge file loaded for selected topic
2. `difficulty.{level}.expected_understanding` sets the target depth
3. `common_misconceptions` shape what gaps the coach probes
4. `scoring_rubric` drives the final report

---

## What Good Contributions Look Like

**Knowledge files** are curriculum, not question banks. They define what a strong engineer knows at each level — Claude generates the actual questions dynamically.

**Blueprints** are researched, not guessed. Base topic weights and hiring bar descriptions on how that company actually interviews — public postmortems, engineering blog posts, credible interview reports.

**Personas** have a distinct voice. The strict bar-raiser and the friendly mentor should feel like completely different people. Generic personas add nothing.

**Incidents** use real terminal output. `kubectl get pods` output should look exactly like what the command returns. Fake-looking output breaks the simulation.

**Rubrics** require evidence anchoring. Every ★ rating must cite something the candidate actually said — not a generic description.

---

## Adding a New Domain

If your contribution spans a new domain (e.g. `gcp`, `mlops`, `cicd`):

1. Create `knowledge/{domain}/` directory
2. Add knowledge files following [knowledge-schema.md](schema/knowledge-schema.md)
3. Update the Domain → Knowledge File Map table in `skills/claude/SKILL.md`
4. (Optional) Add incidents in `incidents/{domain}/`
5. Open a PR — domain additions are always welcome

See [CONTRIBUTING.md](CONTRIBUTING.md) for the PR workflow.
