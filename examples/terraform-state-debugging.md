# Terraform State — Debugging Lab

## User Goal
Practice diagnosing and resolving Terraform state issues. Preparing for an infrastructure engineering interview where state management questions are common. Wants to work through real scenarios, not just describe concepts.

## Mode
Debugging Lab

## Inputs
```
Topic:      Terraform State
Difficulty: Intermediate
Mode:       Debugging Lab
```

---

## Transcript

---

**Coach:**
```
─────────────────────────────────────────────────────────────────
  LAB 1  ·  The Stuck Lock  ·  Intermediate
─────────────────────────────────────────────────────────────────

CONTEXT
Your team's CI/CD pipeline runs terraform apply automatically on
merge to main. A merge happened 3 hours ago. A developer just
tried to run terraform apply locally and got this:

  Error: Error acquiring the state lock

  Error message: ConditionalCheckFailedException: The conditional
  request failed
  Lock Info:
    ID:        8f3c2a11-d4e9-4b89-a132-9b7f1c30d45e
    Operation: OperationTypeApply
    Path:      s3://company-tfstate/prod/terraform.tfstate
    Who:       ci-runner@github-actions
    Version:   1.6.3
    Created:   2026-07-01 11:14:22.482134 UTC
    Info:

The CI pipeline status shows the apply job from 3 hours ago
completed with status: "Success".

─────────────────────────────────────────────────────────────────
What's wrong and what do you do?
```

---

**User:**
The state is locked. The lock was created by a CI runner 3 hours ago, but the CI job shows success. So either the apply finished but didn't release the lock properly, or the lock record in DynamoDB wasn't cleaned up.

I'd force-unlock it:

```bash
terraform force-unlock 8f3c2a11-d4e9-4b89-a132-9b7f1c30d45e
```

---

**Coach:**
Before you run that — you mentioned the CI job shows "Success". How confident are you that the apply is actually done and no process is still holding the lock?

---

**User:**
Hmm. CI showing success is a good signal, but it's not conclusive. A job could show success in the UI but still have a lingering process... actually, no — if the CI job completed 3 hours ago, the runner container would have exited. There's no way a process from 3 hours ago is still running.

That said, I should double-check. I'd look at the CI logs to confirm what the apply actually did — make sure it didn't just time out or get cancelled mid-run and have the pipeline mark it as success anyway. CI pipelines can sometimes misreport status.

---

**Coach:**
Good instinct. You check the logs — the apply ran to completion 3 hours ago, all resources show "Apply complete! Resources: 2 added, 0 changed, 0 destroyed." The runner exited cleanly. Now what?

---

**User:**
Now I'm confident it's a stale lock. The apply finished but something went wrong during lock release — maybe a transient DynamoDB error after the apply succeeded.

```bash
terraform force-unlock 8f3c2a11-d4e9-4b89-a132-9b7f1c30d45e
```

Terraform will ask me to confirm. After that, the next apply should be able to acquire the lock normally.

---

**Coach:**
What's the risk of force-unlock if you're wrong about the apply being done?

---

**User:**
If an apply was actually still running and I force-unlocked, two applies could run simultaneously against the same state file. They'd both read the current state, calculate their changes independently, and write conflicting state files. The state could get corrupted — resources tracked in state but not matching what's actually deployed, or vice versa. That's the worst case: Terraform thinks a resource exists when it doesn't, or thinks it's one thing when it's another.

---

**Coach:**
Correct. That's why "verify the apply is done" is the only safe first step before force-unlock.

Lock released. Apply succeeds for the developer.

```
─────────────────────────────────────────────────────────────────
  LAB 2  ·  The State Orphan  ·  Intermediate
─────────────────────────────────────────────────────────────────

CONTEXT
A new engineer joined 2 weeks ago and created some AWS resources
manually in the console while learning — including a security group
called "sg-app-prod" that now has real production traffic running
through it.

Your Terraform code is supposed to manage this security group.
You run terraform plan and see:

  # aws_security_group.app_prod will be created
  + resource "aws_security_group" "app_prod" {
      + name = "sg-app-prod"
      + description = "Production app security group"
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.

─────────────────────────────────────────────────────────────────
What's wrong and what do you do? Do NOT run terraform apply.
```

---

**User:**
Terraform wants to create the security group because it's not in state — it doesn't know the resource already exists in AWS. If I run `terraform apply` it'll try to create a new security group with the same name, which will probably fail with a "resource already exists" error. Even if it somehow succeeded, it would create a duplicate, and the original (with the production traffic) would be unmanaged.

The fix is `terraform import` to bring the existing resource into state without creating or destroying it.

I need to find the actual AWS resource ID first:

```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=sg-app-prod" \
  --query 'SecurityGroups[0].GroupId'
```

That gives me something like `sg-0a1b2c3d4e5f`. Then:

```bash
terraform import aws_security_group.app_prod sg-0a1b2c3d4e5f
```

---

**Coach:**
Good. After the import succeeds, what happens when you run `terraform plan`?

---

**User:**
Terraform will read the imported state and compare it against my Terraform code. If my code doesn't exactly match what's in AWS — like if I'm missing some rules the engineer added manually — plan will show changes to bring the resource in line with my code.

I need to be careful here. I'd run plan, review the diff carefully, and update my Terraform code to match the current resource before applying. I don't want to accidentally remove security group rules that production traffic depends on.

---

**Coach:**
Exactly right. What if your Terraform code tries to manage a property that's already set in the security group but your code has a different value?

---

**User:**
Plan would show it as a change — `~ description = "old value" -> "new value"` for example. I'd need to reconcile: either update my code to match what's in AWS (preserving the engineer's config) or accept that the apply will overwrite it (and confirm that's safe).

For security group rules specifically I'd be very cautious — I'd audit each rule and make sure my Terraform code captures all of them before running apply.

---

**Coach:**
Strong. One more: the new engineer also manually created an RDS instance. Can you import that too?

---

**User:**
Yes, same pattern. RDS import looks like:

```bash
terraform import aws_db_instance.main my-db-identifier
```

Where `my-db-identifier` is the RDS instance identifier. Same caution applies — after import, run plan, reconcile the diff between the live config and the Terraform code before applying.

The main risk with RDS is that certain properties trigger a replacement — changing `engine_version`, `instance_class`, or `storage_type` in code after import will cause plan to show a destroy + recreate. That needs a very careful review.

---

**Coach:**
Good flag on the replacement-triggering attributes. That's exactly where people get burned.

---

## Final Report

```
╔══════════════════════════════════════════════════════════════════╗
║  PrepOps  ·  Interview Report                                    ║
║  Topic: Terraform State  ·  Mode: Debugging Lab                  ║
║  Level: Intermediate                                             ║
╚══════════════════════════════════════════════════════════════════╝

  HIRE SIGNAL  ·  LEAN HIRE ↑

  ──────────────────────────────────────────────────────────────────

  DIMENSION SCORES

  Technical Knowledge    ★★★★☆
  → Knew force-unlock, terraform import, and the replacement-
    triggering RDS attributes. Missed one nuance: didn't mention
    that after import you need Terraform code to match the resource
    or plan will show drift changes — got there when prompted.

  Production Thinking    ★★★★★
  → The standout moment: "I'd audit each security group rule and
    make sure my code captures all of them before applying." Showed
    blast radius awareness for security group changes in production.
    Flag on RDS replacement attributes was unprompted and correct.

  Debugging Methodology  ★★★★☆
  → Initial force-unlock response jumped straight to the fix. After
    one probe, immediately self-corrected and identified the right
    verification step: check CI logs to confirm the apply actually
    completed. Good recovery, but the check should be instinctive.

  Communication          ★★★★☆
  → Clear explanation of why simultaneous applies corrupt state.
    "Terraform thinks a resource exists when it doesn't" is a good
    mental model articulated cleanly.

  Depth                  ★★★☆☆
  → Solid on the intermediate-level scenarios. Didn't raise state
    architecture concerns (should state be split? who has write
    access?) — those are senior-level, so not penalized here.

  ──────────────────────────────────────────────────────────────────

  INTERVIEWER SIGNAL
  "Good instincts on terraform import and the RDS replacement-
  attribute flag was impressive. The force-unlock question exposed
  a pattern to watch: jumping to the fix before the verification.
  One probe fixed it, which is a good sign — they reasoned through
  it correctly once prompted. Intermediate bar: cleared."

  ──────────────────────────────────────────────────────────────────

  WHAT LANDED

  ✦ "CI could misreport status — I should check the actual logs"
    — self-corrected after probe, reasoning was sound
  ✦ Identified duplicate security group risk before attempting apply
    — said "do NOT run terraform apply" context was respected
  ✦ "RDS replacement-triggering attributes" called out unprompted
    — a real production trap that many candidates miss

  GAPS IDENTIFIED

  ✗ Force-unlock was the first instinct — should be the last resort
    What was missing: "First, verify no process holds the lock"
    should precede any discussion of the unlock command itself
  ✗ Post-import plan reconciliation wasn't spontaneously raised
    What was missing: After import, plan will show drift if Terraform
    code doesn't match live config — always reconcile before applying

  ──────────────────────────────────────────────────────────────────

  BEFORE YOUR NEXT SESSION

  Study:    Force-unlock decision tree — the verification steps
            (check CI logs, check for running applies) before the
            unlock command; make this instinctive
  Practice: One Senior Terraform session covering state workspaces
            vs separate state files and state architecture at scale

╚══════════════════════════════════════════════════════════════════╝
```
