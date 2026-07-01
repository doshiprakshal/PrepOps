# Kubernetes MTU Mismatch — Production Incident

## User Goal
Practice production incident investigation for a Kubernetes networking issue. Senior SRE interview prep — wants to build hypothesis-driven debugging instincts under time pressure.

## Mode
Production Scenario

## Inputs
```
Topic:      Kubernetes Networking
Difficulty: Senior
Mode:       Production Scenario
Incident:   incidents/kubernetes/mtu-mismatch.yaml
```

---

## Transcript

---

**Coach:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚨  INCIDENT  ·  14:32 UTC
  Service: image-upload-service
  Impact: ~30% of uploads failing · SLO burning at 3x rate
  Tickets: 47 open · Duration: 12 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Users are reporting upload failures. Error logs show connection reset
errors. Small files succeed. Files over ~1MB fail consistently.
No deployments in the last 2 hours. Where do you start?
```

---

**User:**
First I want to check if the pods are healthy — maybe they're crashing or restarting.

```
kubectl get pods -n upload -w
```

---

**Coach:**
```
$ kubectl get pods -n upload -w
NAME                          READY   STATUS    RESTARTS   AGE
image-upload-7d9f8c-xkp2q    1/1     Running   0          3h
image-upload-7d9f8c-m4n7r    1/1     Running   0          3h
logging-agent-ds-vxq9k       1/1     Running   1          4h
```

---

**User:**
Pods look healthy. The logging-agent restart is from 4 hours ago, probably unrelated. No crashes. Let me check if there's a resource issue — maybe a node is under pressure.

```
kubectl top node
```

---

**Coach:**
```
$ kubectl top node
NAME       CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
node-01    450m         11%    2Gi             26%
node-02    3200m        80%    4Gi             52%
node-03    420m         10%    1.8Gi           23%
```

---

**User:**
node-02 is at 80% CPU — that's elevated. Could be causing slowdowns. Let me check what's running there.

```
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-02
```

---

**Coach:**
```
$ kubectl get pods --all-namespaces --field-selector spec.nodeName=node-02
NAMESPACE    NAME                        READY   STATUS    RESTARTS   AGE
indexing     batch-indexer-7f4d9-xk2pl   1/1     Running   0          14m
upload       image-upload-7d9f8c-m4n7r   1/1     Running   0          3h
kube-system  kube-proxy-node02           1/1     Running   0          12d
```

The batch-indexer job runs on a schedule and started 14 minutes ago — that's why node-02 CPU spiked. It runs every day at this time and has never correlated with upload failures before.

---

**User:**
OK, so CPU is probably not the cause — the batch job is unrelated. Let me refocus. The symptom is really specific: small files work, large files fail with connection reset. That size-dependent pattern is interesting. This isn't a pod crash or CPU issue.

Let me check the application logs for the failing uploads.

```
kubectl logs -n upload image-upload-7d9f8c-xkp2q --tail=50
```

---

**Coach:**
```
$ kubectl logs -n upload image-upload-7d9f8c-xkp2q --tail=50
2026-07-01T14:32:14Z INFO upload started file=profile.jpg size=45KB
2026-07-01T14:32:14Z INFO upload complete size=45KB duration=120ms
2026-07-01T14:32:15Z INFO upload started file=banner.png size=2.1MB
2026-07-01T14:32:15Z ERROR upload failed: connection reset by peer size=2.1MB
2026-07-01T14:32:16Z INFO upload started file=icon.png size=8KB
2026-07-01T14:32:16Z INFO upload complete size=8KB duration=45ms
2026-07-01T14:32:17Z INFO upload started file=photo.jpg size=1.8MB
2026-07-01T14:32:17Z ERROR upload failed: connection reset by peer size=1.8MB
```

---

**User:**
"connection reset by peer" — that's a TCP RST. And it's consistent: every file over ~1MB fails, nothing under 100KB fails. This is almost certainly a network layer issue, not application.

The size threshold makes me think MTU. If the MTU is misconfigured somewhere, large packets would get silently dropped or fragmented incorrectly, causing connection resets. Let me check basic connectivity first.

```
ping 10.0.0.3 -c 3
```

---

**Coach:**
```
$ ping 10.0.0.3 -c 3
PING 10.0.0.3: 64 bytes, icmp_seq=0, time=0.3ms
PING 10.0.0.3: 64 bytes, icmp_seq=1, time=0.4ms
PING 10.0.0.3: 64 bytes, icmp_seq=2, time=0.3ms
--- 10.0.0.3 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
```

---

**User:**
Basic connectivity is fine. But that ping used 64-byte packets. The size-dependent failure means I need to test with large packets to confirm my MTU hypothesis.

```
ping 10.0.0.3 -s 1400 -c 5
```

---

**Coach:**
```
$ ping 10.0.0.3 -s 1400 -c 5
PING 10.0.0.3: 1408 bytes, icmp_seq=0, time=0.3ms
Request timeout for icmp_seq 1
Request timeout for icmp_seq 2
PING 10.0.0.3: 1408 bytes, icmp_seq=3, time=0.4ms
Request timeout for icmp_seq 4
--- 10.0.0.3 ping statistics ---
5 packets transmitted, 2 received, 60% packet loss
```

---

**User:**
There it is. Large packets are being dropped on the path to node-03. Inconsistent — some go through, some don't. That's exactly what you'd expect from an MTU mismatch: packets that happen to fit through, and ones that exceed the effective MTU and get dropped.

This is almost certainly the cluster overlay MTU not matching the physical MTU. Let me check the MTU configuration on all nodes.

```
ip link show eth0
```
(on each node)

---

**Coach:**
```
# On node-01, node-02, node-04, node-05:
$ ip link show eth0
eth0: mtu 1450 qdisc mq state UP mode DEFAULT

# On node-03:
$ ip link show eth0
eth0: mtu 1500 qdisc mq state UP mode DEFAULT
```

---

**User:**
Found it. node-03 has MTU 1500, all other nodes have MTU 1450. The cluster is using VXLAN overlay which needs MTU 1450 to leave room for the 50-byte encapsulation header. Any packet through node-03 that's over ~1400 bytes after encapsulation exceeds the physical MTU and gets silently dropped.

The fix:
```
ip link set dev eth0 mtu 1450
```
on node-03. Then I'd update the node provisioning config so this doesn't happen again.

---

**Coach:**
Correct. Before you apply the fix — what's your blast radius check?

---

**User:**
Setting MTU on a live node will affect all traffic through that node. Current connections that are in the middle of large transfers will likely get reset. But the MTU change itself is near-instant and non-destructive — we're fixing it to match the others. I'd do a quick `kubectl get pods --field-selector spec.nodeName=node-03` to see what's running there, document it, then apply the fix. I wouldn't drain the node for this.

---

**Coach:**
Good. Fix applied — upload success rate is back to normal. Failures drop to zero within 30 seconds.

Last: what goes in the postmortem?

---

**User:**
Root cause: node-03 provisioned with MTU 1500 instead of 1450, causing VXLAN encapsulation to exceed physical MTU for large packets.

Contributing factor: Node was provisioned manually, outside the standard automation that enforces MTU=1450.

Prevention: Add MTU validation to node provisioning automation. Ideally a node-level health check that alerts if MTU doesn't match cluster expectations.

Action items: Update provisioning runbook. Add MTU check to new node CI gate.

---

**Coach:**
```
[Slack · #incidents] @oncall Great work. SLO burn rate is back to 1x.
Postmortem draft looks solid. One thing to add: how did this stay
undetected for 12 minutes? What alert would have caught it earlier?
```

---

**User:**
We should have had a size-stratified upload success rate metric — not just overall error rate. If we tracked success rate for files over 1MB separately, the alert would have fired immediately when that cohort hit 100% failure. Our current alert just looks at overall error rate, which was diluted by all the small-file successes.

---

**Coach:**
That's the right lesson. Size-stratified metrics are a class of observability gap that shows up in file transfer, API payloads, and database queries. Adding that to the postmortem prevention section would make it stronger.

Incident closed.

---

## Final Report

```
╔══════════════════════════════════════════════════════════════════╗
║  PrepOps  ·  Interview Report                                    ║
║  Topic: Kubernetes Networking  ·  Mode: Production Scenario      ║
║  Level: Senior  ·  Incident: MTU Mismatch                        ║
╚══════════════════════════════════════════════════════════════════╝

  HIRE SIGNAL  ·  STRONG HIRE ⬆

  ──────────────────────────────────────────────────────────────────

  DIMENSION SCORES

  Technical Knowledge    ★★★★★
  → Correctly identified MTU as the hypothesis from the size-dependent
    failure pattern before any clue pointed there — came to it
    independently from "connection reset + large files" observation.

  Debugging Methodology  ★★★★★
  → Hypothesis-first from turn 2: "size threshold makes me think MTU."
    Used the small-packet ping first to confirm connectivity, then
    large-packet ping to confirm size-dependent loss. Systematic.

  Production Thinking    ★★★★★
  → Blast radius check before applying fix was unprompted. Size-
    stratified metrics insight at the postmortem stage was the
    strongest signal — shows systems-level observability thinking.

  Communication          ★★★★☆
  → Clear narration of reasoning at each step. Postmortem structure
    was complete. Minor gap: didn't name VXLAN specifically when
    describing why MTU 1450 is required — would be stronger with
    "50 bytes for VXLAN encapsulation overhead."

  Depth                  ★★★★★
  → The size-stratified metrics observation in the postmortem was
    unprompted and goes beyond what most candidates offer.

  ──────────────────────────────────────────────────────────────────

  INTERVIEWER SIGNAL
  "Strong hire. Identified MTU as the root cause before any hint at
  turn 4 — that's the key diagnostic leap. Blast radius check before
  fix and the size-stratified metrics insight show mature production
  thinking. This candidate has operated real systems."

  ──────────────────────────────────────────────────────────────────

  WHAT LANDED

  ✦ "Small files work, large files fail with connection reset —
    this is almost certainly a network layer issue, not application"
    — correct layer identification at turn 4 before any clue
  ✦ Large-packet ping to confirm hypothesis — right tool, right time
  ✦ "Size-stratified upload success rate metric" — unprompted
    observability improvement in the postmortem

  GAPS IDENTIFIED

  ✗ Didn't name VXLAN encapsulation overhead explicitly
    What was missing: "VXLAN adds a 50-byte header; cluster MTU
    must be 1450 to leave room for it on a 1500-MTU physical network"
  ✗ Spent 2 turns on CPU/node pressure before pivoting to network
    What was missing: The size-dependent symptom should have ruled
    out CPU earlier — CPU doesn't cause size-dependent failures

  ──────────────────────────────────────────────────────────────────

  BEFORE YOUR NEXT SESSION

  Study:    VXLAN encapsulation overhead and MTU calculation —
            know the numbers (50-byte header, 1450 vs 1500) cold
  Practice: Try another Senior networking incident without the
            CPU/resource detour — go to network layer immediately
            when you see size-dependent failures

╚══════════════════════════════════════════════════════════════════╝
```
