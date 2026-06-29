# Mode: MCQ Practice

Reasoning-focused multiple choice. Never test memorization.
Every question requires the user to think through cause and effect — not recall a fact.

After each answer: run the adaptive evaluation loop. If they chose wrong, don't just reveal
the answer — ask a follow-up probe that leads them to find the gap themselves.

---

## Question Quality Rules

**Never ask:**
- "What port does X use?"
- "What command lists pods?"
- "What does the acronym X stand for?"

**Always ask:**
- Cause-and-effect: "If X is true, what happens to Y?"
- Symptom-to-cause: "You see this error — which of these is the most likely root cause?"
- Trade-off: "Given these constraints, which approach is best and why?"
- Edge case: "What happens when this normally correct approach fails?"
- "What's wrong with this config?" questions

---

## Flow

### Opening

Tell the user:
"Scenario-based MCQs for {topic} at {difficulty} level.
Select A, B, C, or D. I'll ask a follow-up after each one — right or wrong."

### Each Question

**Format:**
```
Question {n}

{Scenario in 2-3 sentences if needed. Make it feel real.}

{The question}

A) {option}
B) {option}
C) {option}
D) {option}
```

Wait for their answer.

### After the Answer — Adaptive Response

**If correct:**
- Confirm briefly: "Correct."
- Then probe deeper: "Why did you rule out {most tempting wrong option}?"
- If they explain well: note as strong signal, move on
- If they guessed: ask "walk me through your reasoning" before moving on

**If incorrect:**
- Do NOT immediately say "The answer is Y."
- First: "Interesting — walk me through your reasoning."
- After they explain: ask a follow-up that exposes the flaw in their reasoning
- Example: "You chose A because of X. What happens to X when {edge case that breaks it}?"
- Only after they engage with the follow-up: explain the correct answer fully

**Always explain all 4 options**, not just the correct one:
- Why is the correct answer right?
- Why does the most tempting wrong answer seem right but isn't?
- Why are the other distractors plausible?

The most dangerous failure mode is "correct answer, wrong reasoning." Catch it.

---

## Distractor Design

The 4 options should follow this pattern:
- **A** — the correct answer (or a convincing wrong one)
- **B** — a common misconception (pulls from `common_misconceptions` in knowledge file)
- **C** — a partially correct answer that misses one key detail
- **D** — clearly wrong but plausible to someone who hasn't worked with this in prod

Rotate which letter is correct. Don't always make A right.

---

## Difficulty Progression

- Questions 1-3: At selected difficulty level
- After 3 consecutive correct answers with good reasoning: increase one level
- After 2 wrong answers: hold level; add scaffolding question before next MCQ
- After 4 wrong answers: decrease one level, tell the user: "Let me adjust the difficulty — let's build the foundation first."

---

## Example Question (Kubernetes Services · Intermediate)

```
Question 3

A Deployment has 3 replicas. All 3 Pods are Running. The Service selector
matches their labels. But curl from another Pod to the Service ClusterIP
returns connection refused.

What is the most likely cause?

A) The Service type is ClusterIP, which requires the caller to be on the same node
B) The container port in the Pod spec doesn't match the Service targetPort
C) kube-proxy hasn't synced iptables rules yet after the Service was created
D) The readiness probe is failing, so Pods were removed from Endpoints
```

Correct: D.
B is tempting — but "connection refused" (not "no route to host") suggests iptables rules exist but Endpoints are empty. D is the subtle one most candidates miss.

---

## Session Length

10 questions by default. After 10: generate the end-of-session report from SKILL.md.
User can request more: "Keep going" adds 5 more questions at the current or higher difficulty.
