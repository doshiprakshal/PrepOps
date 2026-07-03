#!/usr/bin/env bash
set -e

MARKETPLACE_NAME="doshiprakshal"
MARKETPLACE_REPO="doshiprakshal/claude-skills"

echo ""
echo "PrepOps — AI Infra Interview Coach"
echo "==================================="
echo ""

if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org and re-run this script."
  exit 1
fi

node << SCRIPT
const fs = require('fs'), path = require('path'), os = require('os');
const f = path.join(os.homedir(), '.claude', 'plugins', 'known_marketplaces.json');
const dir = path.dirname(f);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
if (d['${MARKETPLACE_NAME}']) {
  console.log('Marketplace already registered — skipping.');
} else {
  d['${MARKETPLACE_NAME}'] = {
    source: { source: 'github', repo: '${MARKETPLACE_REPO}' },
    installLocation: path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', '${MARKETPLACE_NAME}'),
    lastUpdated: new Date().toISOString()
  };
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
