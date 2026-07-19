# Local Development

## Prerequisites

- Node.js 20+
- npm 10+
- Cloudflare account (free tier is enough)
- Wrangler CLI (installed by `npm install`)

## Setup

```bash
cd mcp-server
npm install
```

## 1. Bundle engine assets

The MCP server bundles PrepOps prompts, personas, incidents, and rubrics into a single file at build time. Run this once before starting the server, and any time you change files in `prompts/`, `personas/`, `incidents/`, or `rubrics/`.

```bash
npm run bundle
# ✓ engine.ts written (333KB) — 12 prompts, 9 personas, 5 incidents
```

## 2. Set the session secret

The session token uses HMAC-SHA256. For local dev, set the secret in a `.dev.vars` file (never commit this file):

```bash
# mcp-server/.dev.vars
SESSION_SECRET=dev-secret-replace-in-production
```

## 3. Start the dev server

```bash
npm run dev
# Wrangler starts on http://localhost:8787
```

Test the health endpoint:

```bash
curl http://localhost:8787/health
```

Test the MCP server:

```bash
curl -X POST http://localhost:8787/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'
```

Test a tool:

```bash
curl -X POST http://localhost:8787/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_home_options","arguments":{}}}'
```

## Architecture notes

- **No LLM calls from the server.** Tools are pure prompt compilers. Claude calls the tools and runs the returned prompts using its own reasoning.
- **No database.** Session state lives in a signed HMAC-SHA256 token. Pass `session_token` to every `continue_*` tool call.
- **No external APIs.** The server is completely self-contained. Web research (for role prep) is done by Claude using its built-in search capability.
- **Engine assets are bundled at build time.** Changing a prompt file requires running `npm run bundle` and restarting the server.

## Updating engine assets

When you modify `prompts/`, `personas/`, `incidents/`, `rubrics/`, or `knowledge/`:

```bash
npm run bundle   # regenerates src/assets/engine.ts
npm run dev      # restart picks up the new file
```

## TypeScript

```bash
npm run typecheck
```
