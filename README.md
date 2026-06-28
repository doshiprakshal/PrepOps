# PrepOps — AI Infra Interview Coach

An open-source adaptive AI coaching platform for Infrastructure, DevOps, SRE, Cloud, MLOps, and AIOps interview preparation.

## What It Does

PrepOps is a Claude Code skill that turns your terminal into an adaptive interview coach. No signup. No setup. Just install the plugin and start practicing.

The coach adapts to your level, asks before it tells, and teaches the way a Staff Engineer would mentor — through questions, production scenarios, and honest feedback.

---

## Install

**One-time setup** — register the marketplace:

```bash
node -e "
const fs = require('fs'), path = require('path');
const f = path.join(require('os').homedir(), '.claude', 'known_marketplaces.json');
const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : { marketplaces: [] };
if (!d.marketplaces.find(m => m.name === 'doshiprakshal'))
  d.marketplaces.push({ name: 'doshiprakshal', url: 'https://raw.githubusercontent.com/doshiprakshal/claude-skills/main/.claude-plugin/marketplace.json' });
fs.writeFileSync(f, JSON.stringify(d, null, 2));
console.log('Registered doshiprakshal marketplace');
"
```

**Install PrepOps:**

```
/plugin install prepops@doshiprakshal
```

---

## Usage

Once installed, start a coaching session:

```
/interview-coach
```

Or trigger it naturally:

```
practice kubernetes interview
coach me on SRE fundamentals
mock interview for DevOps
help me prepare for AWS questions
```

---

## Domains Covered

| Domain | Topics |
|--------|--------|
| **Kubernetes** | Pods & Workloads, Services, Networking |
| **Linux** | Processes, Performance Analysis, Filesystems |
| **Terraform** | State, Modules, Drift Detection |
| **AWS** | IAM, Auto Scaling, Load Balancing |
| **Networking** | DNS, TCP, Load Balancing Algorithms |
| **SRE** | SLOs & Error Budgets, Incident Response, Reliability Patterns |
| **+ More** | Docker, Helm, GCP, CI/CD, Prometheus, MLOps, AIOps |

---

## 10 Learning Modes

| Mode | What It Does |
|------|-------------|
| **Learn Concept** | Socratic teaching — ask before tell |
| **Flashcards** | Dynamic cards with self-grading |
| **MCQ Practice** | Reasoning-focused multiple choice |
| **Production Scenarios** | You're on-call. Incident in progress. |
| **Debugging Labs** | Broken configs and outputs to diagnose |
| **Mock Interview** | Real interview simulation, no hints |
| **Whiteboard Interview** | Architecture in text with probing questions |
| **System Design** | Design full infrastructure systems |
| **Rapid Fire** | 15 questions, increasing difficulty |
| **Mixed Mode** | Coach-selected mix based on your weak areas |

---

## Adaptive Difficulty

PrepOps adjusts in real time:
- 3 strong answers → difficulty increases
- 2 struggles → scaffolding kicks in
- 5 difficulty levels: Beginner, Intermediate, Senior, Staff, Principal

---

## Phase 2: Python CLI (Coming Soon)

- Cross-session weak area tracking in `~/.prepops/`
- Local models via Ollama (free, no API key needed)
- Claude (BYOK) or Claude Code subscriber support
- CSV export of performance history

---

## Contributing

We welcome knowledge base contributions. Each topic is a structured YAML file that teaches PrepOps what to test and how to evaluate answers.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the schema guide and contribution workflow.

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for planned features.

---

## Author

Built by [Prakshal Doshi](https://github.com/doshiprakshal)

---

## License

MIT
