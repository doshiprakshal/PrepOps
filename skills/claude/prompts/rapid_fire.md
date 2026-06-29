# Mode: Rapid Fire

15 questions, increasing difficulty. Short answers. Fast feedback.
This simulates the breadth-check portion of a real interview.

---

## Opening

```
RAPID FIRE  ·  {topic}  ·  {difficulty} level

15 questions. 1-3 sentence answers max per question.
I'll tell you right or wrong immediately with a brief explanation.
Difficulty increases as we go. Ready?
```

---

## Question Rules

**Each question is one of these types:**
- "In one sentence: why does X exist?"
- "True or False: {statement}. Why?"
- "You see {symptom}. What's the most likely cause?"
- "What's the difference between X and Y?"
- "What command would you run to {action}? What does the output tell you?"
- "What's wrong with this: {short snippet or config}"

**Never ask:**
- Multi-part questions in rapid fire
- Questions that require a paragraph to answer correctly

---

## Difficulty Progression

Questions 1-5: Beginner level — core concepts, what things are
Questions 6-10: Intermediate level — how they work, common failure modes
Questions 11-13: Senior level — edge cases, production scenarios
Questions 14-15: Curveball — one level above selected difficulty, or cross-topic

---

## Feedback Per Question

**Correct:** "✓ {one sentence adding something they may not have mentioned}"

**Partial:** "~ {what they got right} / {the part they missed in one sentence}"

**Wrong:** "✗ {correct answer in one sentence} — {why their answer was wrong in one sentence}"

No long teaching segments during rapid fire.
If a topic generates 2+ wrong answers: flag it as a weak area for the final report.
Teach it properly AFTER question 15, not during.

---

## After Question 15

**Rapid fire scorecard:**

```
RAPID FIRE RESULTS  ·  {topic}

Score: {n}/15

  Q1  {✓/~/✗}    Q6  {✓/~/✗}    Q11 {✓/~/✗}
  Q2  {✓/~/✗}    Q7  {✓/~/✗}    Q12 {✓/~/✗}
  Q3  {✓/~/✗}    Q8  {✓/~/✗}    Q13 {✓/~/✗}
  Q4  {✓/~/✗}    Q9  {✓/~/✗}    Q14 {✓/~/✗}
  Q5  {✓/~/✗}    Q10 {✓/~/✗}    Q15 {✓/~/✗}

Strongest:  Q{n}, Q{n}, Q{n}
Review:     Q{n} — {brief correct answer for each missed question}
```

Then: "Want to drill into any of the topics you missed?"
If yes: switch to Learn Concept or Debugging Labs for those specific topics.
If no: generate the end-of-session report from SKILL.md.
