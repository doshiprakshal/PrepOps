# Connecting PrepOps to Claude

PrepOps works as a Remote MCP server. Once connected, Claude gains access to all 23 PrepOps tools and can run practice sessions across all 10 modes.

## What you need

- A Claude.ai account (Pro or Team)
- The PrepOps MCP endpoint URL:
  ```
  https://prepops-mcp.your-subdomain.workers.dev/mcp
  ```

---

## Claude.ai (Web / Desktop / Mobile)

1. Open Claude.ai
2. Go to **Settings → Integrations** (or **Connections**)
3. Click **Add MCP server**
4. Enter:
   - Name: `PrepOps`
   - URL: `https://prepops-mcp.your-subdomain.workers.dev/mcp`
5. Click **Connect**
6. Approve the tools when prompted

Claude will now have access to all PrepOps modes in every conversation.

**Start a session:**
> "I want to practice Kubernetes with PrepOps. Start a Senior-level Concept Prep session."

Claude will call `get_home_options`, then `start_concept_session`, then run the PrepOps prompt using its own reasoning.

---

## Claude Code (CLI)

Add to your `~/.claude/settings.json` (or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "prepops": {
      "type": "http",
      "url": "https://prepops-mcp.your-subdomain.workers.dev/mcp"
    }
  }
}
```

Restart Claude Code. The PrepOps tools are now available in `/tools`.

You can also use the CLI skill (`/interview-coach`) — it calls PrepOps directly from the file system and does not require the MCP server.

---

## Verifying the connection

Ask Claude:
> "What PrepOps modes are available?"

Claude should call `get_home_options` and list all 10 modes.

---

## No API key needed

PrepOps does not call Anthropic APIs. Claude is the intelligence layer. PrepOps provides:
- Interview engine
- Prompts and curriculum
- Personas
- Incidents and debugging labs
- Evaluation rubrics
- Session state management (via signed tokens)

Users do not enter an API key, create an account, or install a database.

---

## Security

Session tokens are signed with HMAC-SHA256 using a secret stored in Cloudflare. They cannot be modified by the client. The server never stores session data.

The server makes no outbound calls — no Anthropic API, no search APIs, no databases.
