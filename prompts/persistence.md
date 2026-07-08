# PrepOps — Persistence Layer

Defines how PrepOps reads and writes candidate data across sessions.

The storage contract is defined by schemas in `schema/`. The backend is
swappable — today it's local JSON, future backends (SQLite, cloud) implement
the same file structure and schema contract.

---

## Storage Root

Default: `~/.prepops/`
Override: read `storage_path` from `~/.prepops/profile.json` settings if it exists.

```
~/.prepops/
├── profile.json          # Candidate identity and preferences
├── sessions/             # One file per completed session
│   └── {session_id}.json
├── weaknesses.json       # Recurring gaps (2+ sessions)
├── strengths.json        # Consistent strengths (3+ sessions)
└── settings.json         # Storage and display settings
```

---

## Reading Storage

Use the Read tool to load files. Always handle the file-not-found case gracefully:
- `profile.json` missing → first-time user, run onboarding (see dashboard.md)
- `weaknesses.json` missing → treat as empty: `{ "items": [] }`
- `strengths.json` missing → treat as empty: `{ "items": [] }`
- `sessions/` missing or empty → treat as no history

Never fail silently. If a file is malformed, note it and continue without that data.

---

## Writing Storage

Use the Bash tool to write files. Create directories if they don't exist.

**Creating a session file:**
```bash
mkdir -p ~/.prepops/sessions
cat > ~/.prepops/sessions/{session_id}.json << 'EOF'
{json content}
EOF
```

**Updating weaknesses or strengths:**
Read the existing file first. Merge the new data. Write back.
Never overwrite the full file blindly — always merge with existing items.

**Updating profile:**
Read existing `profile.json`. Update only the changed fields
(`updated_at`, `total_sessions`, `last_session_at`). Write back.

---

## Session Write — what to record

At the end of every session (Step 8 of SKILL.md), after generating the report:

1. Build the session record conforming to `schema/session.schema.json`:

```json
{
  "version": "1.0",
  "session_id": "{YYYY-MM-DDTHH-MM}",
  "date": "{ISO timestamp}",
  "topic": "{topic slug}",
  "mode": "{mode name}",
  "difficulty": "{difficulty}",
  "blueprint": {
    "company": "{company or null}",
    "role": "{role or null}",
    "level": "{level or null}"
  },
  "scores": {
    "technical_knowledge": {1-5},
    "production_thinking": {1-5},
    "debugging_methodology": {1-5},
    "communication": {1-5},
    "depth": {1-5}
  },
  "hire_signal": "{verdict}",
  "strengths": ["{specific thing they got right}"],
  "weaknesses": ["{specific gap identified}"],
  "recommended_next": "{single recommendation from report}"
}
```

2. Write to `~/.prepops/sessions/{session_id}.json`

3. Update `weaknesses.json`:
   - For each item in session `weaknesses`:
     - If topic already in `weaknesses.json`: increment `occurrences`, update `last_seen`, update `session_ids`
     - If topic is new and this is the SECOND time seeing it across all sessions: add entry with `occurrences: 2`
     - If topic is new and only seen once: do NOT add yet. Single-session mistakes are not tracked.
     - If a tracked weakness was NOT seen in last 3 sessions: set `status: resolved`
     - If occurrences are decreasing in frequency: set `status: improving`

4. Update `strengths.json`:
   - For each dimension scoring 4+ stars:
     - If this topic had 4+ stars in the previous 2+ sessions: increment `consecutive_strong`
     - At 3+ consecutive: add/update entry in `strengths.json`
     - At 5+ consecutive: upgrade `rating` to `consistently_excellent`
     - Update `recommended_next`: difficulty increase if ≥3 consecutive at same level

5. Update `profile.json`:
   - Increment `total_sessions`
   - Update `last_session_at`

---

## StorageProvider Contract

The schemas in `schema/` define the data contract. Any future backend must:
- Produce and consume the same JSON structures
- Implement the same merge semantics (never overwrite, always merge)
- Support the same file naming convention for sessions (`{session_id}.json`)

To swap backends in the future:
1. Add a new `storage_backend` value in `profile.json` settings
2. Implement a bridge script or CLI that speaks the same schema
3. No changes needed to prompt files — the schemas are the abstraction layer

---

## Privacy

All data is stored locally in `~/.prepops/`. Nothing is sent externally.
The session files contain only performance signals — no conversation transcripts.
