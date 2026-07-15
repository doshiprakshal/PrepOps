# PrepOps Interactive App

A Claude Artifact that runs PrepOps inside Claude.ai — no install, no API key, no backend.

## How it works

The app uses `window.claude.complete()` to call Claude from within a sandboxed browser artifact. Every AI call embeds the PrepOps engine prompts directly. The app is stateless — no persistence, no accounts, no database.

**Requirements:** User must be signed into Claude.ai. AI usage is billed to the user's Claude account.

## Files

```
interactive-app/
├── README.md       ← this file
└── stage1.html     ← Stage 1 artifact (paste into Claude to create artifact)
```

## Stages

| Stage | Status | What it covers |
|-------|--------|---------------|
| 1 | ✅ Done | Home screen · Concept Prep (Learn, Flashcards, MCQ) · Session report |
| 2 | Planned | Production Scenarios · Debugging Lab · Rapid Fire · Coding Reasoning |
| 3 | Planned | Mock Interview · System Design · Whiteboard |
| 4 | Planned | JD-Driven Prep (full JD parsing + web research + prep plan) |

## Architecture

The artifact is a single HTML file containing:
- React 18 + Tailwind CSS via CDN (no build step)
- PrepOps engine prompts embedded as JS constants
- Knowledge coverage lookup derived from `templates/knowledge_mapping.yaml`
- All views (Home, Setup, Session, Report) in one file

Each `window.claude.complete()` call passes the full conversation history as context — simulating a stateful session without any server or storage.

## Engine prompt reuse

Stage 1 embeds distilled versions of:
- `prompts/learn_concept.md` — Socratic dialogue logic
- `prompts/flashcards.md` — front/back card generation + self-grading
- `prompts/mcq.md` — scenario-based questions + reasoning explanations
- Report generation from `skills/claude/SKILL.md` Step 8
