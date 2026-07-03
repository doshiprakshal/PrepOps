#!/usr/bin/env bash
set -e

MARKETPLACE_NAME="doshiprakshal"
MARKETPLACE_URL="https://raw.githubusercontent.com/doshiprakshal/claude-skills/main/.claude-plugin/marketplace.json"
KNOWN_MARKETPLACES="$HOME/.claude/known_marketplaces.json"

echo ""
echo "PrepOps — AI Infra Interview Coach"
echo "==================================="
echo ""

# Require node
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org and re-run this script."
  exit 1
fi

# Register marketplace
node << SCRIPT
const fs = require('fs'), path = require('path');
const f = '${KNOWN_MARKETPLACES}';
const dir = path.dirname(f);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { marketplaces: [] };
if (d.marketplaces.find(m => m.name === '${MARKETPLACE_NAME}')) {
  console.log('Marketplace already registered — skipping.');
} else {
  d.marketplaces.push({ name: '${MARKETPLACE_NAME}', url: '${MARKETPLACE_URL}' });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Marketplace registered.');
}
SCRIPT

echo ""
echo "Next step — run this inside Claude Code:"
echo ""
echo "  /plugin install prepops@doshiprakshal"
echo ""
echo "Then start a session:"
echo ""
echo "  /interview-coach"
echo ""
