# Incident Template Schema

Incident templates are reusable patterns for production scenario simulations. Instead of writing one handcrafted YAML file per scenario, a template defines a symptom class (e.g. "network latency"), multiple root causes for that symptom, a shared pool of clues and red herrings, and generation instructions. Claude generates a unique, complete incident from the template on demand.

**When to write a template vs. a handcrafted incident:**
- **Template:** When you have 4+ distinct root causes for the same observable symptom. The symptom is "network latency" or "pods not starting" — the cause is what changes.
- **Handcrafted incident:** When the scenario requires a very specific multi-hop failure chain or real terminal output from a specific system version. See `docs/schema/incident-schema.md`.

**Location:** `incident-templates/{type}.yaml`

**Examples:**
```
incident-templates/network-latency.yaml
incident-templates/pod-not-starting.yaml
incident-templates/high-cpu-or-memory.yaml
incident-templates/service-returning-errors.yaml
```

---

## Required Fields

### `template_id`
**Type:** string — slug, matches the filename without `.yaml`

```yaml
template_id: network-latency
```

---

### `display_name`
**Type:** string — shown in mode selection

```yaml
display_name: "Network Latency"
```

---

### `domain`
**Type:** string — the primary domain for this symptom class

```yaml
domain: networking
```

---

### `description`
**Type:** string — one sentence describing what goes wrong in this template's scenario

```yaml
description: >
  Service-to-service latency is elevated. Root cause is somewhere in
  the network layer.
```

---

### `root_causes`
**Type:** list — 4+ root causes for the symptom. Claude picks one when generating an incident.

Each root cause requires:

```yaml
root_causes:
  - id: mtu_mismatch
    display: "MTU Mismatch"
    difficulty: senior          # beginner | intermediate | senior | staff
    explanation: >
      One node or interface has a different MTU than the rest of the
      network. Large packets are dropped or fragmented.
    detection_path:
      - "Small pings pass; large-payload ping fails"
      - "ip link show reveals MTU mismatch on one interface"
    fix: "Align MTU across all nodes"
    postmortem_hint: "New node added without matching the cluster MTU standard"
```

**`detection_path`** is the ordered list of steps a good investigator follows. It's the internal answer key — it informs how Claude verifies the candidate's approach.

**`postmortem_hint`** is the process failure that allowed this to reach production. Always a people/process failure, not just the technical failure.

---

### `clue_pool`
**Type:** list — terminal output and metric responses, tagged by root cause relevance

Each clue requires:
- `id` — unique within the template
- `relevant_to` — list of root_cause IDs where this clue appears
- `trigger_keywords` — what the investigator must type or ask to receive this clue
- `template` — the command and output (with `{PLACEHOLDER}` variables)

Optional:
- `required_for` — list of root_cause IDs where this clue is mandatory (always included)
- `per_root_cause` — different `values` or `reveals` text per root cause when the same clue produces different output

```yaml
clue_pool:
  - id: ping_large_packet
    relevant_to: [mtu_mismatch]
    required_for: [mtu_mismatch]
    trigger_keywords: [ping, mtu, packet size, large packet, fragmentation]
    template: |
      $ ping {TARGET_HOST} -M do -s 1472 -c 3
      ping: local error: Message too long, mtu=1450
    reveals: "Small packets pass; large packets fail — classic MTU mismatch signature"

  - id: mtr_output
    relevant_to: [mtu_mismatch, tcp_retransmissions, packet_loss_noisy_neighbor]
    trigger_keywords: [mtr, traceroute, route, path, hops]
    template: |
      $ mtr --report {TARGET_HOST}
      HOST: {SOURCE_HOST}     Loss%   Snt  Last   Avg
        1. 10.0.0.1            0.0%    10   0.5   0.5
        2. {HOP_2}             0.0%    10   1.2   1.3
        3. {HOP_3}      {LOSS}%    10  {LAST}  {AVG}
    per_root_cause:
      mtu_mismatch:
        values: {LOSS: "0.0", LAST: "187", AVG: "185", HOP_3: "10.96.0.1"}
        reveals: "No packet loss — MTU issues show as latency spikes, not clean loss"
      tcp_retransmissions:
        values: {LOSS: "12.0", LAST: "312", AVG: "298", HOP_3: "10.96.0.1"}
        reveals: "12% packet loss at hop 3 — this is the lossy link"
```

**Critical rule for trigger_keywords:** Include synonyms. An engineer investigating latency might type "slow", "timeout", "mtr", "traceroute", "route", "path". All should trigger the relevant clue.

**Critical rule for template output:** Must look exactly like real command output. Use correct column headers, whitespace, and format. Fake-looking output breaks the simulation.

---

### `red_herring_pool`
**Type:** list — things that are plausible to check but turn out to be unrelated

4+ entries. These cross-cut all root causes — Claude picks 2 that are plausible for the current symptom.

Each requires:
- `id`
- `trigger_keywords`
- `template` — the command and (reassuring, normal) output
- `note` — internal: why this is a red herring, not shown to the candidate

```yaml
red_herring_pool:
  - id: cpu_normal
    trigger_keywords: [cpu, top, usage, processor]
    template: |
      $ kubectl top nodes
      NAME    CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
      node-01  312m         7%     2847Mi          35%
    note: "CPU is normal — not a resource pressure issue"
```

---

### `turn_budget_templates`
**Type:** object — keyed by turn number ("3", "6", "9", "12")

Turn budget messages simulate in-universe Slack escalation. They use `{PLACEHOLDER}` variables filled from `per_root_cause_turn_budget`.

```yaml
turn_budget_templates:
  "3": "[Slack · #incidents] @oncall {STAKEHOLDER} is asking for an ETA. How are we doing?"
  "6": "[Slack · #incidents] @oncall I'm seeing things in {DIAGNOSTIC_AREA} — worth checking?"
  "9": "[Slack · #incidents] @oncall I think it's {DIRECTIONAL_HINT}. Does that match?"
  "12": "[Slack · #incidents] @oncall Confirmed: {ROOT_CAUSE_SUMMARY}. Fix: {FIX_SUMMARY}"
```

**Pressure calibration:**
- Turn 3: pressure only — no directional information
- Turn 6: points toward an area, not the cause
- Turn 9: stronger signal — narrows to a subsystem
- Turn 12+: reveals — the simulation doesn't stay stuck

---

### `per_root_cause_turn_budget`
**Type:** object — fill-in values for `turn_budget_templates` keyed by root cause ID

Each root cause needs: `STAKEHOLDER`, `DIAGNOSTIC_AREA`, `DIRECTIONAL_HINT`, `ROOT_CAUSE_SUMMARY`, and any other placeholders used in the templates.

```yaml
per_root_cause_turn_budget:
  mtu_mismatch:
    STAKEHOLDER: "the network team"
    DIAGNOSTIC_AREA: "packet size distribution"
    DIRECTIONAL_HINT: "MTU settings — node-03 was added last week"
    ROOT_CAUSE_SUMMARY: "MTU mismatch on node-03 (1500 vs cluster standard 1450)"
  tcp_retransmissions:
    STAKEHOLDER: "the infrastructure team"
    DIAGNOSTIC_AREA: "network statistics — retransmit counters are elevated"
    DIRECTIONAL_HINT: "packet loss somewhere in the network path"
    ROOT_CAUSE_SUMMARY: "12% packet loss at the spine link — TCP retransmission backoff"
```

---

### `generation_instructions`
**Type:** string (block scalar) — plain text instructions Claude follows to generate a complete incident

This is the key field that enables template → unique incident generation.

```yaml
generation_instructions: |
  To generate a unique incident from this template:

  1. Select one root_cause from root_causes. Vary selection across sessions.
  2. Build clue set: all required_for clues + enough relevant_to clues to reach 3 total.
  3. Pick 2 red herrings from red_herring_pool — choose ones plausible for this symptom.
  4. Fill opening_message using observable symptoms only — no root cause hints.
     Include: service name, impact, ticket count, duration.
  5. Fill turn_budget from turn_budget_templates + per_root_cause_turn_budget values.
  6. Fill placeholders: {SERVICE}, {NAMESPACE}, {TARGET_HOST}, {HASH}, etc.

  Opening format:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚨  INCIDENT  ·  {TIME} UTC
    Service: {SERVICE_NAME}
    Impact: {IMPACT_DESCRIPTION}
    Tickets: {TICKET_COUNT} open · Duration: {DURATION} minutes
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {2-3 sentences of observable symptoms. No root cause. End with: "Where do you start?"}
```

---

## Optional Fields

### `topics`
If the template spans multiple domains:
```yaml
topics: [networking, kubernetes]
```

---

## Adding a New Template

A template is appropriate when:
- The symptom class has 4+ distinct root causes
- Clue output differs meaningfully per root cause
- Red herrings are plausible across all root causes

Start from `network-latency.yaml` as the reference implementation.

---

## Quality Checklist

- [ ] 4+ root causes with meaningfully different `detection_path` values
- [ ] Each clue's `trigger_keywords` includes at least 3 synonyms
- [ ] Each clue's `template` output looks like real command output
- [ ] `required_for` is set for clues that are essential to a given root cause
- [ ] 4+ red herrings in the pool — diverse enough that Claude has choices
- [ ] `turn_budget_templates` at keys "3", "6", "9", "12"
- [ ] Turn 3 has no directional information; turn 12 reveals the root cause
- [ ] `generation_instructions` includes the opening message format
- [ ] All `per_root_cause_turn_budget` entries have the same set of placeholder keys

---

## Common Mistakes

**Clues with only one relevant root cause.** Every clue in the pool should be relevant to at least one root cause. Clues that appear only in `required_for` and have no `relevant_to` are orphaned.

**Opening messages with root cause hints.** The `generation_instructions` must specify "observable symptoms only." Common slip: including "after a recent change" when the root cause IS a change.

**Missing `per_root_cause_turn_budget` entries.** If you have 6 root causes, you need 6 entries in `per_root_cause_turn_budget`. Missing one means Claude can't fill the turn budget templates for that root cause.

**Red herrings that are too similar.** Four "resource is normal" red herrings (CPU, memory, disk, network) are effectively one red herring repeated. Include different investigation types: resource checks, process checks, dependency checks, config checks.

**`per_root_cause` variants that are too similar.** If MTU mismatch and TCP retransmissions produce identical `mtr` output, the clue doesn't help the investigator differentiate. Make the per-root-cause output meaningfully different.
