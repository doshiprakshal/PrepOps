# Google SRE IC3 — Mock Interview

## User Goal
Full mock interview for Google SRE IC3 (New Grad / Early Career). Targeting an upcoming onsite. Wants realistic interview pressure and honest feedback calibrated to the actual IC3 bar.

## Mode
Mock Interview

## Inputs
```
Blueprint:  blueprints/google/sre/ic3.yaml
Persona:    personas/google_sre.yaml
Mode:       Mock Interview
Topic:      Linux + Troubleshooting (per IC3 topic weights)
```

---

## Transcript

---

**Coach (Google SRE Interviewer):**
Thanks for coming in. I'm most interested in how you think, not just what you know — so think out loud.

Let's start with a scenario. It's 2pm on a Tuesday. A service you're responsible for starts returning 500 errors. You look at the host and see: load average is 18, CPU shows 12% utilization in top. What's happening and where do you start?

---

**User:**
Load average 18 with 12% CPU — that's weird. High load but low CPU means the processes aren't actually running, they're waiting for something. Probably I/O. I'd check vmstat to see the run queue and I/O wait.

```
vmstat 1 5
```

I'd look at the `b` column (processes blocked on I/O) and the `wa` percentage.

---

**Coach:**
Good instinct. vmstat shows `b` column at 12, `wa` at 65%. What does that tell you?

---

**User:**
12 processes are blocked waiting for I/O, and 65% of CPU time is idle-waiting for disk. So the system is I/O saturated — the load is all disk wait, not CPU work. The processes are piling up waiting for disk to respond.

---

**Coach:**
Correct. How do you figure out which disk and what's causing it?

---

**User:**
`iostat -xz 1` — gives per-device stats. I'd look at `%util` to see which device is saturated and `await` to see the I/O latency.

---

**Coach:**
You check iostat and see `/dev/xvda1` at 98% util, await 180ms. That's your disk. How do you find what's writing to it?

---

**User:**
`iotop` or `iotop -o` to see which processes are generating the I/O. Or I could look at `pidstat -d 1` for per-process disk stats.

---

**Coach:**
`iotop` shows a process called `log-compress` consuming 95% of disk writes. It's a cron job. How do you confirm this is the root cause and not a symptom of something else?

---

**User:**
I'd check when `log-compress` started and correlate it with when the 500 errors began. `grep log-compress /var/log/cron` or `systemctl status log-compress`. If the timestamps match, it's almost certainly the cause — the cron job is saturating disk I/O which is blocking the application.

---

**Coach:**
They match — cron started at 13:58, errors started at 14:00. What do you do?

---

**User:**
Short-term: kill or nice the `log-compress` process to release disk pressure. `kill <pid>` if it's safe to interrupt, or `ionice -c 3 -p <pid>` to drop it to idle I/O priority so it doesn't compete with the application.

Longer-term: schedule log compression for off-peak hours, or add an I/O rate limit to the cron job.

---

**Coach:**
You said "if it's safe to interrupt" — how do you know if it's safe?

---

**User:**
I'd check what `log-compress` is in the middle of — if it's mid-compression I might corrupt a log file by killing it. Better to use `ionice` to deprioritize rather than kill outright, so the service I/O gets priority and the job finishes in the background without competing.

---

**Coach:**
Good. Let's switch topics. I'm going to ask you to write some code.

You have a log file where each line looks like this:

```
2026-07-01T14:32:15Z ERROR upload failed size=2.1MB duration=450ms
2026-07-01T14:32:16Z INFO upload complete size=8KB duration=45ms
2026-07-01T14:32:17Z ERROR upload failed size=1.8MB duration=380ms
```

Write a Python script that reads this log file and prints the average duration of ERROR lines only, in milliseconds.

---

**User:**
```python
import sys
import re

def parse_duration_ms(duration_str):
    match = re.match(r'(\d+(?:\.\d+)?)(ms|s)', duration_str)
    if not match:
        return None
    value, unit = float(match.group(1)), match.group(2)
    return value if unit == 'ms' else value * 1000

def main(filename):
    durations = []
    with open(filename) as f:
        for line in f:
            if ' ERROR ' not in line:
                continue
            match = re.search(r'duration=(\S+)', line)
            if match:
                ms = parse_duration_ms(match.group(1))
                if ms is not None:
                    durations.append(ms)

    if not durations:
        print("No ERROR lines found")
        return

    avg = sum(durations) / len(durations)
    print(f"Average ERROR duration: {avg:.1f}ms ({len(durations)} errors)")

if __name__ == '__main__':
    main(sys.argv[1])
```

---

**Coach:**
This handles both `ms` and `s` units — why did you add that?

---

**User:**
The example showed `450ms` but real log files often mix units. If a request took 2 seconds it might be logged as `2s` not `2000ms`. I'd rather handle it upfront than have the script silently give wrong numbers.

---

**Coach:**
What happens if the log file is 50GB?

---

**User:**
The script is fine — it reads line by line with the `for line in f` iterator, so it never loads the whole file into memory. Python file objects are lazy iterators.

---

**Coach:**
Good. What if you needed to run this on 200 log files in parallel?

---

**User:**
I'd use `concurrent.futures.ProcessPoolExecutor` to parallelize across files. Each worker processes one file and returns `(total_duration, count)`, then the main process sums those to get the final average. Or just `xargs -P 8` with the script if I wanted to keep it simple.

---

**Coach:**
Last question. You've been on-call for 6 months. You notice the same disk saturation issue keeps happening every Tuesday at 2pm. Your manager says it's not a priority to fix right now. What do you do?

---

**User:**
I'd document it as toil — recurring manual work that doesn't improve the service. I'd track the time cost: how long does each incident take to resolve? If it's 30 minutes every Tuesday, that's 2 hours a month of interrupt work.

Then I'd propose a low-effort fix: `ionice` on the cron job takes 5 minutes to implement and eliminates the incidents entirely. Frame it in terms of SLO impact and engineer time cost, not just "it's annoying."

If my manager still doesn't prioritize it, I'd implement the `ionice` fix myself — it's low-risk and clearly within scope.

---

**Coach:**
If you had 6 months to redesign how this service handles log compression with no constraints, what would you do differently and why?

---

**User:**
Separate the disk — put application data and log compression on different volumes so they can't compete. Use a dedicated log aggregation pipeline that pulls logs to a centralized store instead of compressing locally; the application host shouldn't be doing compression at all. Add an SLO on log processing latency that's separate from the application SLO, so degradation is visible before it impacts users.

---

**Coach:**
Good. Thank you — I'll wrap up there.

---

## Final Report

```
╔══════════════════════════════════════════════════════════════════╗
║  PrepOps  ·  Interview Report                                    ║
║  Blueprint: Google SRE IC3  ·  Mode: Mock Interview              ║
║  Persona: Google SRE  ·  Calibrated against: IC3 hiring bar      ║
╚══════════════════════════════════════════════════════════════════╝

  HIRE SIGNAL  ·  STRONG HIRE ⬆

  ──────────────────────────────────────────────────────────────────

  CALIBRATION NOTE
  IC3 bar: solid Linux fundamentals, systematic debugging, working
  code for systems tasks, production instinct despite limited
  experience. This session is evaluated against that bar.

  ──────────────────────────────────────────────────────────────────

  DIMENSION SCORES

  Technical Knowledge    ★★★★★
  → Immediately identified load average / CPU mismatch as I/O wait
    — not CPU. Named the right columns (vmstat 'b', 'wa') and right
    tools in correct order. Zero wrong turns.

  Debugging Methodology  ★★★★★
  → Formed the hypothesis before picking a tool: "processes waiting
    for something, probably I/O." Tools followed the hypothesis.
    At IC3 level, this is exceptional.

  Production Thinking    ★★★★☆
  → "ionice instead of kill — don't corrupt the log file" showed
    genuine production instinct. Toil identification and SLO framing
    in the last question was above IC3 expectations.

  Communication          ★★★★☆
  → Clear, sequential reasoning. Narrated each step before executing.
    Could be more concise — occasionally over-explained.

  Coding                 ★★★★☆
  → Correct Python, handles edge cases (unit parsing), memory-safe
    (lazy iteration). Added ms/s handling unprompted — shows thinking
    about real-world variation. Knew about ProcessPoolExecutor for
    parallelism. Minor: no error handling for malformed lines.

  ──────────────────────────────────────────────────────────────────

  INTERVIEW VERDICT — Google SRE IC3
  "I would advance this candidate. The I/O debugging was textbook
  and the hypothesis came before the tool, which is rare at IC3.
  The ionice-vs-kill judgment call showed they've thought about
  production impact, not just how to make the problem stop. Code
  was solid — unit handling shows they've parsed real log files.
  The toil framing in the last question was impressive for the level.
  Would be a strong IC3, possibly stretching toward IC4."

  ──────────────────────────────────────────────────────────────────

  WHAT LANDED

  ✦ "High load but low CPU means processes aren't running, they're
    waiting for something" — hypothesis before tool selection
  ✦ "ionice instead of kill — if it's mid-compression I might
    corrupt a log file" — unprompted blast radius thinking
  ✦ Python script handled ms/s unit variation without being asked,
    and correctly identified memory-safe iteration for 50GB files
  ✦ Framed the recurring incident as toil with a time cost and
    SLO impact — above IC3 expectations

  GAPS IDENTIFIED

  ✗ No error handling in the Python script for malformed log lines
    What was missing: try/except around parse_duration_ms, or a
    note that real production code would handle/log malformed lines
  ✗ "Separate the disk" in the redesign question was correct but
    underexplained — didn't mention specific options (EBS volumes,
    instance store, log shipper agents like Fluent Bit)

  ──────────────────────────────────────────────────────────────────

  BEFORE YOUR NEXT SESSION

  Study:    Add error handling to log parsing scripts — malformed
            lines are common in real logs; know the try/except pattern
  Practice: One Rapid Fire session on Linux performance to reinforce
            iostat, vmstat, and sar interpretation under time pressure

╚══════════════════════════════════════════════════════════════════╝
```
