# PrepOps Remote MCP Server

Cloudflare Worker that exposes the PrepOps interview engine as a Remote MCP server. Claude connects to it and gains all 10 PrepOps practice modes as structured tools.

```
GitHub → Cloudflare Worker → PrepOps Remote MCP → Claude (Web/Desktop/Mobile/Code)
```

## What it does

PrepOps provides the engine. Claude provides the intelligence.

The MCP server exposes 23 tools that are pure **prompt compilers** — they assemble the PrepOps engine prompts and return them to Claude. Claude runs the prompts using its own reasoning, web search, and conversation context.

The server makes **no LLM calls**, **no external API calls**, and uses **no database**. Session state is encoded in a signed HMAC-SHA256 token passed between tool calls.

## Available tools

| Tool | Description |
|------|-------------|
| `get_home_options` | List all available modes, personas, difficulties |
| `resolve_topic` | Check curriculum coverage for a topic |
| `prepare_research_request` | Extract JD fields + generate research questions for Claude's web search |
| `build_runtime_blueprint` | Assemble JD parser prompt → Claude generates the runtime blueprint |
| `start_concept_session` | Begin Concept Prep (Learn / Flashcard / MCQ) |
| `continue_concept_session` | Continue a Concept Prep session |
| `start_incident` | Begin Production Scenario (incident simulation) |
| `continue_incident` | Continue an incident session |
| `start_debugging_lab` | Begin Debugging Lab (K8s YAML, Terraform, Helm, PromQL, Linux) |
| `continue_debugging_lab` | Continue a debugging lab |
| `start_coding_reasoning` | Begin Coding Reasoning session |
| `continue_coding_reasoning` | Continue a coding session |
| `start_mock_interview` | Begin 5-phase Mock Interview |
| `continue_mock_interview` | Continue a mock interview |
| `start_whiteboard` | Begin Whiteboard Interview (2 phases) |
| `continue_whiteboard` | Continue a whiteboard session |
| `start_system_design` | Begin System Design (4 phases) |
| `continue_system_design` | Continue a system design session |
| `start_rapid_fire` | Begin Rapid Fire drill |
| `continue_rapid_fire` | Continue a rapid fire session |
| `start_mixed_mode` | Begin Mixed Mode session |
| `continue_mixed_mode` | Continue a mixed mode session |
| `generate_session_report` | Generate mode-appropriate session report |

## Quick start

```bash
cd mcp-server
npm install
npm run bundle     # generates src/assets/engine.ts from repo engine files
cp .dev.vars.example .dev.vars   # set SESSION_SECRET
npm run dev        # http://localhost:8787
```

Deploy:

```bash
npx wrangler secret put SESSION_SECRET   # one-time setup
npm run deploy
```

## Docs

- [Local Development](docs/local-dev.md)
- [Deployment](docs/deployment.md)
- [Connector Installation](docs/connector-install.md)
- [Parity Validation Checklist](docs/parity-checklist.md)

## Architecture

```
User → Claude → MCP tool call → Cloudflare Worker
                                      │
                                 assembles prompt
                                 from engine assets
                                      │
                              returns { prompt, session_token }
                                      │
                    Claude ← receives assembled prompt
                    Claude runs prompt using its own reasoning
                    Claude calls continue_* with transcript
```

Session tokens encode:
- Mode configuration (topic, difficulty, persona, etc.)
- Phase tracking
- Turn count
- Hidden state (incident clues not yet revealed, coding solution not yet shown)

Signed with HMAC-SHA256. Tampered tokens are rejected.

## Source of truth

The engine files in the repo root are the source of truth:

```
prompts/          ← interview mode logic
personas/         ← interviewer behavior
incidents/        ← handcrafted incident scenarios
incident-templates/ ← generated incident templates
knowledge/        ← topic-specific curriculum
rubrics/          ← scoring dimensions and hire signals
templates/        ← evaluation rubric template
engine/manifest.json ← mode-to-asset mapping
```

Neither this MCP server nor `interactive-app/stage4.html` duplicates or modifies this logic. Both consume it.
