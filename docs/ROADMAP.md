# PrepOps Roadmap

## Phase 1 — Claude Code Skill (Current)

Zero-install coaching via Claude Code. No backend. No database. No signup.

**Status: ✅ Complete**

- [x] 10 learning modes (Learn, Flashcards, MCQ, Scenarios, Debugging, Mock, Whiteboard, System Design, Rapid Fire, Mixed)
- [x] 5 difficulty levels with adaptive adjustment
- [x] 18 knowledge YAML files across 6 domains
- [x] End-of-session scoring and recommendations
- [x] Self-hosted plugin marketplace registration
- [x] Multiple mock interview personas

**Knowledge base backlog (community contributions welcome):**

| Priority | Topic | Domain |
|----------|-------|--------|
| High | Kubernetes Storage (PV/PVC/CSI) | kubernetes |
| High | Kubernetes Security (RBAC/PSA) | kubernetes |
| High | Kubernetes Scheduling | kubernetes |
| High | Docker & Containers | docker |
| High | Prometheus & Alerting | observability |
| High | GitHub Actions / CI/CD | cicd |
| High | AWS EKS | aws |
| Medium | Helm | kubernetes |
| Medium | Ansible | infrastructure |
| Medium | GCP GKE | gcp |
| Medium | MLflow / MLOps | mlops |
| Medium | ArgoCD / GitOps | cicd |
| Medium | Istio / Service Mesh | kubernetes |
| Low | Chaos Engineering Tools | sre |
| Low | AIOps Platforms | aiops |
| Low | Feature Stores | mlops |

---

## Phase 2 — Python CLI

Cross-session memory, local models, and provider abstraction.

**Status: Planning**

### Core Features

- [ ] `prepops` CLI entry point (`pip install prepops`)
- [ ] Session state stored in `~/.prepops/` (JSON)
- [ ] Weak area tracking across sessions
- [ ] Performance trend analysis ("improving on Kubernetes, stalling on networking")
- [ ] Session history and review

### LLM Provider Support

- [ ] Claude via BYOK (bring your own Anthropic API key)
- [ ] Ollama local models (free, no API key)
- [ ] Provider abstraction layer for easy extension

### Export and Reporting

- [ ] CSV export of session performance
- [ ] PDF study plan generator based on weak areas
- [ ] Markdown session transcript export

### Team Features (stretch)

- [ ] Shared team knowledge base
- [ ] Manager view of team readiness
- [ ] Custom question bank per company

---

## Phase 3 — Web UI (Stretch)

Browser-based interface for those who prefer not to use the CLI.

**Status: Idea**

- [ ] React frontend with same 10 modes
- [ ] Visual performance dashboard
- [ ] Community question rating and flagging
- [ ] Interview calendar and study plan scheduling

---

## Contributing to the Roadmap

Found a feature missing? Open an issue with the `enhancement` label.
Willing to build something? Check `CONTRIBUTING.md` and claim an issue.
