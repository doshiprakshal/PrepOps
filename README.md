# PrepOps

AI-powered interview simulator for SRE, DevOps, Cloud, Platform Engineering, and Infrastructure roles.

PrepOps helps engineers prepare through adaptive concept coaching, production incident simulations, company-style mock interviews, and structured hiring-style feedback.

---

## Why PrepOps Exists

Most interview prep tools give static questions.

PrepOps is different.

It combines:

- Structured infrastructure knowledge
- Company/role interview blueprints
- Interviewer personas
- Production incident simulations
- Adaptive questioning
- Hiring-style feedback reports

The goal is not memorization.

The goal is to help engineers think, debug, communicate, and reason like strong infrastructure engineers.

---

## What Makes PrepOps Different

| Traditional Interview Prep | PrepOps |
|---|---|
| Static questions | Adaptive questioning |
| Generic answers | Role and persona-aware feedback |
| MCQ-heavy | Production incident simulations |
| Memorization-focused | Reasoning-focused |
| No hiring signal | Strong Hire / Lean Hire / Borderline / Lean No Hire / No Hire |
| No replay value | Blueprint + persona + incident composition |

---

## Core Architecture

PrepOps composes an interview from five independent layers:

```
Blueprint → Persona → Incident → Knowledge → Rubric
```

### Blueprint

Defines company, role, level, topic weights, expected depth, and hiring bar.

```
blueprints/google/sre/ic3.yaml
blueprints/amazon/devops/l5.yaml
blueprints/netflix/platform/staff.yaml
```

### Persona

Defines interviewer behavior, questioning style, follow-up intensity, and hints policy.

```
personas/google_sre.yaml
personas/strict_bar_raiser.yaml
personas/friendly_mentor.yaml
```

### Incident

Defines production simulations with layered clues, red herrings, terminal-style responses, and a turn budget that escalates in-universe.

```
incidents/kubernetes/mtu-mismatch.yaml
incidents/sre/cascading-retry-storm.yaml
incidents/linux/disk-full-open-handles.yaml
```

### Knowledge

Defines topic concepts, common misconceptions, debugging commands, interview angles, and scenario seeds.

```
knowledge/kubernetes/networking.yaml
knowledge/sre/slos-error-budgets.yaml
knowledge/linux/performance.yaml
```

### Rubric

Defines scoring dimensions and hire signal thresholds with evidence requirements.

```
rubrics/dimensions.yaml
rubrics/hiring-signals.yaml
```

Each layer can be improved independently. A contributor can add a new incident without touching any other file.

---

## Features

- Adaptive concept coaching with Socratic follow-ups
- Flashcards with self-grading and gap probing
- Scenario-based MCQ practice
- Production incident simulations (you're on-call, Claude responds as the terminal)
- Debugging labs with broken configs, YAML, and shell output
- Mock interviews with 9 distinct interviewer personas
- Whiteboard interviews with architecture probing
- System design sessions with adversarial review phase
- Rapid-fire question sets
- Mixed-mode sessions
- Company/role/level interview blueprints
- Hiring-style end-of-session reports

---

## Example: Google SRE IC3 Mock Interview

```
/interview-coach

Blueprint: Google SRE IC3
Mode: Mock Interview
```

The session loads `blueprints/google/sre/ic3.yaml`, selects the Google SRE persona, and calibrates topic weights (30% coding, 25% Linux, 20% troubleshooting) against the IC3 hiring bar. At the end, the verdict is framed against what Google actually looks for at that level — not a generic rubric.

---

## Example: Production Incident Simulation

```
/interview-coach

Topic: Kubernetes Networking
Mode: Production Scenario
Difficulty: Senior
```

You get paged. The incident opens:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚨  INCIDENT  ·  14:32 UTC
  Service: image-upload-service
  Impact: ~30% of uploads failing · SLO burning at 3x rate
  Symptom: Large files fail. Small files succeed.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where do you start?
```

You type commands. Claude responds as the terminal. Clues are layered. Red herrings exist. At turn 6, a colleague drops a hint in Slack. At turn 9, you get a stronger signal. Find the root cause before it escalates.

---

## Example: End-of-Session Report

```
╔══════════════════════════════════════════════════════════════════╗
║  PrepOps  ·  Interview Report                                    ║
║  Topic: Kubernetes Networking  ·  Mode: Incident  ·  Level: Sr  ║
╚══════════════════════════════════════════════════════════════════╝

  HIRE SIGNAL  ·  LEAN HIRE ↑

  DIMENSION SCORES

  Technical Knowledge    ★★★★☆
  → Correctly identified DNS and CNI as likely failure domains before checking

  Debugging Methodology  ★★★☆☆
  → Checked pod status early but delayed network path validation by 4 turns

  Production Thinking    ★★★★☆
  → Raised blast radius and rollback strategy without prompting

  Communication          ★★★☆☆
  → Reasoning was correct but unstructured — hypothesis was implicit, not stated

  INTERVIEWER SIGNAL
  "Strong instincts on failure domain identification. Debugging approach was right
  but slow — needed 3 more turns than a senior should. Would advance with one more
  scenario to confirm the methodology signal."

  WHAT LANDED
  ✦ Identified size-dependent failure pattern on turn 2 — that's the key observation
  ✦ Proposed rollback before attempting the fix — good blast radius awareness

  GAPS IDENTIFIED
  ✗ Never checked MTU explicitly — got there via colleague hint at turn 6
    What was missing: ping with large payload (-s 1400) to isolate packet size

  BEFORE YOUR NEXT SESSION
  Study: Kubernetes CNI and overlay network MTU constraints
  Practice: One more Senior-level networking incident without hints
╚══════════════════════════════════════════════════════════════════╝
```

---

## Repository Structure

```
PrepOps/
├── knowledge/          # Topic YAMLs — what to teach and how to evaluate
├── blueprints/         # Company/role/level interview models
├── personas/           # Interviewer behavioral profiles
├── incidents/          # Production scenario definitions
├── rubrics/            # Hire signal and dimension scoring criteria
├── prompts/            # Mode behavior files (learn, MCQ, mock interview, etc.)
├── skills/claude/      # Claude Code skill entry point (SKILL.md)
├── schema/             # YAML schema definitions
└── docs/               # Contributing guide and roadmap
```

---

## Current Coverage

### Knowledge Domains

- Kubernetes (pods, services, networking)
- Linux (processes, performance, filesystems)
- Terraform (state, modules, drift)
- AWS (IAM, autoscaling, load balancing)
- Networking (DNS, TCP, load balancing)
- SRE (SLOs/error budgets, incident response, reliability patterns)

### Blueprints

- Google SRE — IC3, IC4, IC5
- Amazon DevOps — L5
- Apple SRE — ICT4
- Netflix Platform — Staff
- Stripe Infrastructure — Senior
- Startup DevOps — Senior

### Incidents

- Kubernetes MTU mismatch (networking, senior)
- Kubernetes OOM kill cascade (resources, intermediate)
- Linux disk full with open file handles (filesystems, senior)
- Networking DNS blackhole after NetworkPolicy change (intermediate)
- SRE cascading retry storm from misconfigured timeout (senior)

### Personas

Google SRE · Amazon DevOps · Netflix SRE · Stripe Engineering · Startup DevOps · Staff Engineer · Principal Engineer · Friendly Mentor · Strict Bar-Raiser

---

## Install

**Step 1 — Register the marketplace** (one time, requires Node.js):

```bash
curl -fsSL https://raw.githubusercontent.com/doshiprakshal/PrepOps/main/install.sh | bash
```

This registers the marketplace source and prints the next step.

<details>
<summary>No curl? Run the node script directly</summary>

```bash
node << 'SCRIPT'
const fs = require('fs'), path = require('path');
const f = path.join(require('os').homedir(), '.claude', 'known_marketplaces.json');
const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : { marketplaces: [] };
if (!d.marketplaces.find(m => m.name === 'doshiprakshal'))
  d.marketplaces.push({ name: 'doshiprakshal', url: 'https://raw.githubusercontent.com/doshiprakshal/claude-skills/main/.claude-plugin/marketplace.json' });
fs.writeFileSync(f, JSON.stringify(d, null, 2));
console.log('Registered doshiprakshal marketplace');
SCRIPT
```

> The `node -e "..."` form fails in zsh because `!` inside double quotes triggers history expansion. The heredoc form above works in both bash and zsh.

</details>

**Step 2 — Install PrepOps** (inside Claude Code):

```
/plugin install prepops@doshiprakshal
```

**Step 3 — Start a session:**

```
/interview-coach
```

---

## Contributing

PrepOps is designed to be community-driven.

Each layer is independently contributable. You can add a new incident without touching the coach logic. You can add a new company blueprint without touching knowledge files.

**What you can contribute:**

- New knowledge domain files
- New production incidents
- New company/role/level blueprints
- New interviewer personas
- New scoring rubrics
- Example interview transcripts

### Add a Knowledge File

```
knowledge/{domain}/{topic}.yaml
```

Follow the schema in `schema/knowledge.schema.yaml`.

### Add an Incident

```
incidents/{domain}/{incident-name}.yaml
```

Copy the structure from any existing incident file. The fields `opening_message`, `clues`, `red_herrings`, `turn_budget`, and `resolution_sequence` are required.

### Add a Blueprint

```
blueprints/{company}/{role}/{level}.yaml
```

Example: `blueprints/datadog/sre/senior.yaml`

Copy the structure from any existing blueprint. The fields `topic_weights`, `expected_depth`, `hiring_bar`, `common_mistakes`, and `persona` are required.

### Quality Bar

Good contributions are:

- Realistic — based on how production systems actually fail or how these companies actually interview
- Specific — named commands, real error messages, actual symptoms
- Scenario-driven — not trivia, not definitions
- Interview-relevant — maps to what SRE, DevOps, Cloud, or Platform Engineering roles actually test

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full guide.

---

## Roadmap

### Phase 1 (current)
Claude skill · 10 learning modes · 9 personas · 8 company blueprints · 5 production incidents · hiring-style reports

### Phase 2
Job description parsing · blueprint matching · personalized prep roadmap · mandatory web search for current interview formats

### Phase 3
Python CLI · session persistence · progress tracking · cross-session weak area tracking · provider abstraction (local models via Ollama)

### Phase 4
Web UI · interview history dashboard · readiness score · shareable reports

### Phase 5
Standalone prompt distribution (paste into any Claude conversation — no install required) · single-command curl installer · multi-provider support

---

## License

MIT

---

Built by [Prakshal Doshi](https://github.com/doshiprakshal)
