# Mode: Flashcards

Dynamic flashcards — not static. Generated fresh from the knowledge file.
After each card, run the adaptive evaluation loop. Never move on without engaging the gap.

---

## Opening

"I'll show the front of a card. Answer from memory — no looking things up.
After each answer I'll give feedback and one insight, then we move on.
Type 'skip' to see the answer without attempting it.
Type 'end' for your session report."

---

## Card Design Rules

**Front of card must require reasoning, not recall.**

Good fronts:
- "What happens to in-flight requests when a Pod is deleted?"
- "CPU limit is 500m. Container tries to use 600m. What happens?"
- "Service has no Endpoints. Three most likely causes?"
- "You just applied a default-deny NetworkPolicy. DNS stops working. Why?"

Bad fronts:
- "What is a Kubernetes Service?"
- "Define a Pod."
- "What does SIGTERM do?"

The front should make them think. If they can answer from a definition, the card is too easy.

---

## After Each Answer — Adaptive Loop

**Strong answer:**
"✓ Exactly. Worth adding: {one thing they didn't mention but should know}"
Ask: "Ready for the next card?"

**Partial answer (got the main point, missed something):**
"Almost — you covered {X}. What about {area they missed}?"
Wait for their answer. If correct: brief confirm + move on. If wrong: short teach (2 sentences) + move on.

**Wrong or missing answer:**
"Not quite. Let me probe first — {follow-up question that surfaces the gap}"
Wait for their response. Then explain fully. Then ask a quick check question.

**Skip (they didn't attempt):**
Show the answer. Ask: "Now that you've seen it — what part of this didn't you know?"
This turns a skip into a productive learning moment.

---

## Card Generation Rules

Generate from the knowledge file in this order:
1. `key_concepts` — test applied understanding, not the definition
2. `debugging_commands` — front: "you need to find X, what command?" back: the command + why
3. `interview_angles` — convert to card format
4. `common_misconceptions` — "True or False: {misconception}" then explain

Rotate through all categories before repeating.

**Difficulty adaptation:**
- After 3 consecutive strong answers: pull from next difficulty level in knowledge file
- After 2 wrong/skipped answers: pull from current or lower level

---

## Special Card Types

**Command card:**
Front: "You need to find which files a deleted-but-open process is holding. What command?"
Back: `lsof | grep deleted` — and why: "Space isn't freed until file descriptors are closed. This finds which process holds them."

**Scenario card:**
Front: "Pods are Running. Service selector matches. But there are no Endpoints. You haven't checked anything yet. What are the three things you check first, in order?"
Back: "1. kubectl describe pod — is readiness probe passing? 2. kubectl get pods -l {selector} — do labels match exactly? 3. kubectl describe service — is the port mapping correct?"

**Misconception card:**
Front: "True or False: You can CNAME your root domain (example.com) to an ALB DNS name."
Back: "False. CNAME at zone apex is invalid. Use ALIAS (Route 53) or ANAME records instead."

---

## Session Tracking

Silently track:
- Cards answered strongly (no follow-up needed)
- Cards answered partially (gap probed and addressed)
- Cards skipped or answered wrongly

Include this breakdown in the end-of-session report from SKILL.md.

Target: 12-15 cards per session. After 15: offer to continue or generate report.
