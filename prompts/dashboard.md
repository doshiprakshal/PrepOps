# PrepOps — Dashboard & Onboarding

Handles two cases: returning users (show dashboard) and first-time users (run onboarding).

---

## Case 1 — Returning User (profile.json exists)

Read the following files:
- `~/.prepops/profile.json`
- `~/.prepops/weaknesses.json`
- `~/.prepops/strengths.json`
- The most recent file in `~/.prepops/sessions/` (sort by filename, take last)

Show this. Keep it tight — the user wants to practice, not read.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PrepOps  ·  Welcome back
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Last session
  {mode}  ·  {topic}  ·  {difficulty}  ·  {hire_signal}
  {date formatted as "Monday, Jul 8"}

  Current focus
  [only show if weaknesses.json has items with status: needs_reinforcement]
  → {weakness topic}  ·  {recommended_mode}
  → {weakness topic}  ·  {recommended_mode}
  [show max 2 items]

  Strong areas
  [only show if strengths.json has items]
  ✓ {topic}  ·  {consecutive_strong} sessions strong
  [show max 2 items]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where would you like to start?

  1. Pick up where you left off  ({recommended_next from last session})
  2. Work on a weakness  ({top weakness topic if any, else skip this option})
  3. Something else — type it or paste a JD
```

**Dashboard rules:**
- If no weaknesses: skip the "Current focus" section entirely
- If no strengths: skip the "Strong areas" section entirely
- If last session was today: say "Earlier today" not the date
- If total_sessions is 1: say "1 session completed" not "last session"
- Always end with the 3-option prompt — never just show data and wait
- Never show raw JSON, file paths, or internal field names

---

## Case 2 — First-time User (profile.json does not exist)

Run onboarding. One question at a time. Do not ask everything at once.

```
Welcome to PrepOps — your AI interview coach for SRE, DevOps, Cloud, and Infrastructure roles.

Let's set up your profile so sessions are personalized from the start.
This takes about 60 seconds.

What's your current experience level?

  1. Junior  (0-2 years)
  2. Mid     (2-5 years)
  3. Senior  (5-10 years)
  4. Staff   (10+ years or principal-level scope)
```

After they answer:

```
What roles are you targeting? (type one or more, comma-separated)

Examples: SRE, Platform Engineer, DevOps Engineer, Cloud Engineer, MLOps
```

After they answer:

```
Any specific companies you're preparing for? (optional — press Enter to skip)
```

After they answer (or skip):

```
Which domains do you want to focus on? (type one or more)

  Available: Kubernetes · Linux · Terraform · AWS · Networking · SRE

Or type "all" to cover everything.
```

After they answer:

```
Got it. Creating your profile.
```

Write `~/.prepops/profile.json` conforming to `schema/profile.schema.json` with:
- `version: "1.0"`
- `created_at`: current timestamp
- `updated_at`: current timestamp
- `experience_level`: mapped from their answer
- `target_roles`: from their answer
- `target_companies`: from their answer (empty array if skipped)
- `favorite_domains`: from their answer
- `preferred_learning_modes`: `[]` (will fill in over time from session history)
- `settings`: defaults (`storage_backend: "local"`, `storage_path: "~/.prepops"`, `show_dashboard: true`, `adaptive_difficulty: true`)
- `total_sessions`: 0
- `last_session_at`: null

Then continue directly to Step 1 of SKILL.md (topic selection). Do not show the dashboard on first session.

---

## Skipping the Dashboard

If `profile.json` exists but `settings.show_dashboard` is `false`:
- Skip the dashboard entirely
- Load profile data silently (still used for adaptive difficulty)
- Proceed directly to Step 1 of SKILL.md
