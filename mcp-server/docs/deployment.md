# Deployment Guide

## Target architecture

```
GitHub
    │  push to main
    ▼
Cloudflare Worker (Free tier)
    │  serves MCP at https://prepops-mcp.your-subdomain.workers.dev/mcp
    ▼
Claude (Web / Desktop / Mobile / Claude Code)
    │  connects via Remote MCP
    ▼
User
```

## One-time setup

### 1. Authenticate Wrangler

```bash
npx wrangler login
```

### 2. Set the session secret

```bash
npx wrangler secret put SESSION_SECRET
# Enter a long random string when prompted (e.g. openssl rand -hex 32)
```

This secret is stored encrypted in Cloudflare. Never commit it.

### 3. Deploy

```bash
cd mcp-server
npm run deploy
# Bundles assets + deploys to Cloudflare Workers
```

Wrangler prints the worker URL, e.g.:
```
https://prepops-mcp.your-subdomain.workers.dev
```

Your MCP endpoint is:
```
https://prepops-mcp.your-subdomain.workers.dev/mcp
```

### 4. Verify

```bash
curl https://prepops-mcp.your-subdomain.workers.dev/health
curl -X POST https://prepops-mcp.your-subdomain.workers.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

You should see 23 tools listed.

## GitHub Actions (CI/CD)

Add `.github/workflows/deploy-mcp.yml`:

```yaml
name: Deploy PrepOps MCP

on:
  push:
    branches: [main]
    paths:
      - 'mcp-server/**'
      - 'prompts/**'
      - 'personas/**'
      - 'incidents/**'
      - 'rubrics/**'
      - 'knowledge/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd mcp-server && npm ci
      - run: cd mcp-server && npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Add `CLOUDFLARE_API_TOKEN` to your GitHub repository secrets (Settings → Secrets → Actions).

Create the token at: Cloudflare Dashboard → My Profile → API Tokens → Edit Cloudflare Workers template.

## Free tier limits

Cloudflare Workers Free tier includes:
- 100,000 requests/day
- 10ms CPU time per request (sufficent — tools are pure prompt compilers with no compute-heavy operations)
- No cold start latency

Bundled asset size: ~333KB — well within the 1MB limit.

## Updating

After any change to engine files or server code:

```bash
npm run deploy
```

The `npm run bundle` step runs automatically before deploy.

## Custom domain (optional)

```bash
npx wrangler route add "prepops.yourdomain.com/*" prepops-mcp
```

Then add a CNAME `prepops.yourdomain.com → your-subdomain.workers.dev` in your DNS.
