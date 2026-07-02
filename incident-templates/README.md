# Incident Templates

Incident templates define reusable patterns for production scenario simulations. Instead of writing one incident file per scenario, each template defines:

- **Multiple root causes** for the same symptom type
- **A clue pool** — with per-root-cause output variants
- **Red herrings** that are plausible for the symptom class
- **Turn budget templates** with root-cause-specific fill-ins
- **Generation instructions** so Claude can produce a unique, complete incident on demand

One template → dozens of unique interview scenarios.

---

## Available Templates

| Template | Domain | Root Causes |
|----------|--------|-------------|
| `network-latency.yaml` | networking | MTU mismatch, slow DNS, firewall/ACL, TCP retransmissions, LB misconfiguration, noisy neighbor |
| `pod-not-starting.yaml` | kubernetes | Resource quota, image pull error, node resource pressure, PVC unbound, node taint, liveness probe |
| `high-cpu-or-memory.yaml` | linux | Memory leak, CPU throttling, runaway process, cache miss cascade, JVM GC pressure |
| `service-returning-errors.yaml` | sre | Upstream timeout, DB pool exhausted, TLS cert expired, rate limit, bad config |

---

## How Claude Generates an Incident

```
1. Load template: incident-templates/{type}.yaml
2. Pick one root_cause (vary across sessions)
3. Build clue set: required_for clues + enough relevant_to clues to reach 3 total
4. Pick 2 red herrings from red_herring_pool
5. Fill opening_message: symptoms only, no root cause
6. Fill turn_budget from templates + per_root_cause_turn_budget values
7. Fill placeholder values ({SERVICE}, {NAMESPACE}, etc.) with realistic names
```

The candidate is the on-call engineer. Claude responds as the terminal, monitoring system, and Slack.

---

## Handcrafted Incidents

Not all incidents fit neatly into a template. When a scenario needs a very specific multi-hop cause (e.g. MTU mismatch caused by a specific provisioning bug on a specific cloud provider), write a full handcrafted incident file under `incidents/{domain}/{id}.yaml`.

See `docs/schema/incident-schema.md` for the handcrafted incident format.

Use templates for breadth. Use handcrafted files for depth and specificity.

---

## Adding a New Template

A new template is appropriate when:
- There's a symptom class with 4+ distinct root causes
- The clues differ meaningfully per root cause
- The red herrings are shared across all root causes

Template structure: see `network-latency.yaml` as the reference example.

Required top-level fields:
- `template_id` — slug, matches filename
- `display_name` — shown in mode selection
- `domain` — one of the defined domains
- `description` — one-sentence description
- `root_causes` — list (4+ entries)
- `clue_pool` — list with `relevant_to` and `per_root_cause` variants
- `red_herring_pool` — list (4+ entries)
- `turn_budget_templates` — keys "3", "6", "9", "12"
- `per_root_cause_turn_budget` — fill-in values per root cause
- `generation_instructions` — plain text instructions for Claude

---

## Difficulty Distribution

Target distribution across root causes in a template:

| Level | % of root causes |
|-------|-----------------|
| beginner | 10-20% |
| intermediate | 40-50% |
| senior | 30-40% |
| staff | 10-20% (optional) |

Staff-level root causes involve cross-system failures or require architectural knowledge to diagnose correctly.
