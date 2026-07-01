# Linux Performance Analysis — Rapid Fire

## User Goal
Sharpen breadth and speed on Linux performance concepts before a Senior SRE interview. Wants to identify weak areas quickly and know exactly what to study.

## Mode
Rapid Fire

## Inputs
```
Topic:      Linux Performance Analysis
Difficulty: Intermediate → Senior (auto-escalates)
Mode:       Rapid Fire
```

---

## Transcript

---

**Coach:**
```
RAPID FIRE  ·  Linux Performance Analysis  ·  Intermediate → Senior

15 questions. 1-3 sentence answers. I'll correct immediately.
Difficulty increases as we go. Ready?
```

---

**User:**
Ready.

---

**Coach:**
**Q1** — In one sentence: what does load average actually measure?

---

**User:**
The average number of processes that are either running or waiting to run over the last 1, 5, and 15 minutes.

---

**Coach:**
~ Close but incomplete. Load average includes processes in **uninterruptible sleep** (waiting for I/O), not just runnable ones. That distinction is why load average can be high while CPU is idle.

---

**Coach:**
**Q2** — You see load average 20 on an 8-core machine. CPU shows 15% in top. In one sentence: what's most likely happening?

---

**User:**
The processes are I/O-bound — they're blocked waiting for disk or network, not using CPU, so CPU looks idle while load is high.

---

**Coach:**
✓ Exactly. 15% CPU confirms they're not computing — they're waiting.

---

**Coach:**
**Q3** — True or False: `free -m` showing low "free" memory means the system is under memory pressure.

---

**User:**
False — Linux uses "free" memory for page cache, so "free" is almost always low. The relevant metric is "available," which includes reclaimable cache.

---

**Coach:**
✓ Correct. "available" is the right column. Most junior engineers panic at low "free" — knowing this separates you.

---

**Coach:**
**Q4** — What's the difference between `%us` and `%sy` in top?

---

**User:**
`%us` is user-space CPU — time spent running application code. `%sy` is kernel (system) CPU — time spent in kernel calls like syscalls, memory management, network handling.

---

**Coach:**
✓ Right. High `%sy` often points to excessive syscalls, interrupt handling, or network I/O — not application logic.

---

**Coach:**
**Q5** — `vmstat 1` shows column `b` at 15. What does that mean?

---

**User:**
15 processes are currently blocked — waiting for I/O to complete. They're in uninterruptible sleep.

---

**Coach:**
✓ Correct. Combined with high `wa` in the CPU columns, that's your I/O saturation signal.

---

**Coach:**
**Q6** — You see `%wa` at 70% in top. What command do you run next and what are you looking for?

---

**User:**
`iostat -xz 1` — I'm looking for which device has high `%util` and what the `await` latency is. High `%util` means the disk is busy, high `await` means I/O requests are taking a long time.

---

**Coach:**
✓ Correct tool. The `-x` flag gives extended per-device stats; `-z` hides idle devices. Good flags to know.

---

**Coach:**
**Q7** — True or False: if `iostat` shows a disk at 100% `%util`, the disk is broken or failing.

---

**User:**
False — 100% `%util` means the disk is fully busy (saturated), not that it's failed. A healthy disk can sustain 100% utilization. The relevant signal is `await` — if latency is spiking, that's when you have a real problem.

---

**Coach:**
✓ Correct. 100% util with 5ms await is very different from 100% util with 500ms await.

---

**Coach:**
**Q8** — What command gives you historical CPU stats from 2 hours ago?

---

**User:**
`sar -u` — reads from the sysstat daily log at `/var/log/sa/`. You'd specify a time range with `-s` and `-e` flags.

---

**Coach:**
✓ Right. `sar -u -s 12:00:00 -e 14:00:00` for example. `sar` is often the only way to see what happened before you were paged.

---

**Coach:**
**Q9** — Escalating to Senior. What is CPU steal time and when does it appear?

---

**User:**
Steal time is time the hypervisor gives CPU to a different virtual machine while your VM is waiting for it. It shows up as `%st` in top. You see it in cloud environments when another VM on the same physical host is consuming CPU — a noisy neighbour problem.

---

**Coach:**
✓ Strong. And importantly: you can't fix it from inside your VM — it's an infrastructure-layer problem that requires either moving to a different host or contacting your cloud provider.

---

**Coach:**
**Q10** — Load average is 4 on a single-core machine. CPU shows 50% idle. What are those processes doing?

---

**User:**
They're mostly waiting for I/O. 4 processes in the run or wait queue on a single core, but only half the CPU is actually being used — means 2 processes are in uninterruptible sleep waiting for disk or network.

---

**Coach:**
✓ Correct. Load average of 4 on 1 core means 4x saturation — but half those processes are sleeping, not computing.

---

**Coach:**
**Q11** — `perf top` shows the hottest symbol is `[kernel.kallsyms]` consuming 80% CPU. In one sentence: what does that tell you?

---

**User:**
The kernel itself is consuming most of the CPU — probably heavy syscall activity, interrupt handling, or kernel operations like memory allocation.

---

**Coach:**
✓ Right. Common causes: heavy network I/O generating interrupts, memory pressure causing frequent page reclaim, or a software interrupt storm. The `[kernel.kallsyms]` line is the umbrella — you'd drill into `perf report` to see which kernel functions specifically.

---

**Coach:**
**Q12** — True or False: running `strace -p <pid>` on a production process is always safe.

---

**User:**
False — strace attaches to the process and can add significant overhead, sometimes 2-10x slowdown. It's one of the tools you use on a copy or a non-production instance, or very briefly with careful filtering in production.

---

**Coach:**
✓ Correct. `strace` is high-overhead. For production profiling, `perf` is much lower overhead. eBPF tools (bpftrace, bcc) are the modern answer — near-zero overhead.

---

**Coach:**
**Q13** — What is Transparent Huge Pages (THP) and why might you disable it for a database like Redis?

---

**User:**
THP lets the kernel use 2MB pages instead of 4KB pages for large allocations, which reduces TLB pressure. The problem is the kernel has to defragment memory to find or create huge pages — this defragmentation process causes periodic latency spikes that are unpredictable. For Redis (which is latency-sensitive) the periodic freeze from THP compaction is worse than the TLB benefit.

---

**Coach:**
✓ Excellent. Redis actually explicitly warns about THP in its startup logs for this reason. The `echo madvise > /sys/kernel/mm/transparent_hugepage/enabled` setting is a middle ground — enables THP only when the application explicitly requests it.

---

**Coach:**
**Q14** — Your application has intermittent 200ms latency spikes every few minutes. Everything else looks normal. What are two Linux-level things you'd check?

---

**User:**
THP compaction — if it's enabled, the compaction process can pause the process for tens to hundreds of milliseconds. And CPU steal time — if the hypervisor is occasionally stealing CPU for another VM, you'd see periodic latency spikes with no application-level explanation.

---

**Coach:**
✓ Both correct and both non-obvious. Good senior-level answers. A third to add: GC pauses if it's a JVM app — `jstat -gcutil <pid>` shows garbage collection frequency and pause time.

---

**Coach:**
**Q15** — Final question. You're paged at 3am: application response times doubled. Load average is normal. CPU is normal. Memory is normal. Disk is normal. Where do you look next?

---

**User:**
Network. Check `ss -s` for socket statistics — if there's a TCP connection backlog or TIME_WAIT accumulation, connections might be queuing. Check `netstat -s` for retransmission counts. Check if the upstream dependency (database, external API) is slower — sometimes "the application is slow" is actually "the database is slow" and the app is just waiting.

---

**Coach:**
✓ Right priorities. `ss -s` for socket state summary, then check upstream latency. Retransmission count in `netstat -s` is also a good signal — if it's climbing, packets are being lost somewhere in the path.

---

## Final Report

```
RAPID FIRE RESULTS  ·  Linux Performance Analysis

Score: 13/15  (✓ = correct, ~ = partial, ✗ = wrong)

  Q1  ~    Q6  ✓    Q11 ✓
  Q2  ✓    Q7  ✓    Q12 ✓
  Q3  ✓    Q8  ✓    Q13 ✓
  Q4  ✓    Q9  ✓    Q14 ✓
  Q5  ✓    Q10 ✓    Q15 ✓

Strongest:  Q9 (steal time), Q13 (THP + Redis), Q14 (latency spikes)
Review:     Q1 — load average definition missing "uninterruptible
            sleep"; the I/O component is the key interview distinction
```

---

```
╔══════════════════════════════════════════════════════════════════╗
║  PrepOps  ·  Interview Report                                    ║
║  Topic: Linux Performance Analysis  ·  Mode: Rapid Fire          ║
║  Level: Intermediate → Senior                                    ║
╚══════════════════════════════════════════════════════════════════╝

  HIRE SIGNAL  ·  LEAN HIRE ↑

  ──────────────────────────────────────────────────────────────────

  DIMENSION SCORES

  Technical Knowledge    ★★★★☆
  → 13/15 at intermediate-to-senior difficulty. Solid across all
    major performance tools. Load average definition was the only
    technical miss — a common but meaningful gap.

  Production Thinking    ★★★★★
  → THP + Redis answer named the actual mechanism (compaction pause)
    not just the symptom. The Q15 answer (network + upstream
    dependencies) showed correct instinct for real 3am incidents.

  Debugging Methodology  ★★★★☆
  → Q6 and Q8 answers showed correct tool-to-symptom mapping.
    Q15 showed layered thinking: sockets → upstream dependency.

  Communication          ★★★★☆
  → Concise throughout. Each answer had the right level of detail
    for the rapid-fire format — not over-explained.

  Depth                  ★★★★☆
  → Q13 (THP/madvise middle ground) and Q14 (steal time as latency
    spike source) show depth beyond surface knowledge.

  ──────────────────────────────────────────────────────────────────

  INTERVIEWER SIGNAL
  "Strong performance breadth at the Senior level. The THP/Redis
  answer and the steal time recognition are not things candidates
  recite from memory — they've thought about these failure modes.
  The load average gap is a one-sentence fix. Would advance."

  ──────────────────────────────────────────────────────────────────

  WHAT LANDED

  ✦ THP answer: "the compaction process causes periodic latency
    spikes that are unpredictable" — named the actual failure mode
  ✦ Q14: unprompted identification of steal time as an intermittent
    latency cause — a subtle, production-grade answer
  ✦ Q15: pivoted to network and upstream dependencies correctly
    when all standard metrics looked normal

  GAPS IDENTIFIED

  ✗ Load average definition missed "uninterruptible sleep"
    What was missing: "average number of runnable PLUS uninterruptible
    processes" — this is the key fact that explains high load with
    low CPU, and interviewers probe it specifically

  ──────────────────────────────────────────────────────────────────

  BEFORE YOUR NEXT SESSION

  Study:    Load average: memorize "runnable + uninterruptible sleep"
            and practice explaining why high load + low CPU = I/O wait
  Practice: One Production Scenario session on Linux Performance —
            the Mystery Slowdown scenario (high load, low CPU, I/O
            saturation from cron job) at Senior difficulty

╚══════════════════════════════════════════════════════════════════╝
```
