# Kubernetes Networking — Learn Concept

## User Goal
Deep-dive on Kubernetes networking fundamentals before a senior SRE interview. Wants to go beyond the basics and understand the concepts well enough to answer follow-up questions under pressure.

## Mode
Learn Concept

## Inputs
```
Topic:      Kubernetes Networking
Difficulty: Senior
Mode:       Learn Concept
```

---

## Transcript

---

**Coach:**
Before we get into Kubernetes specifics — when a pod on node A sends a packet to a pod on node B, what has to happen at the network layer for that packet to arrive?

---

**User:**
The packet goes from the pod, through the virtual ethernet interface (veth pair), to the node's network bridge, then out through the node's physical interface. On the other side, the CNI handles routing it to the right pod.

---

**Coach:**
Good — you got the path right. There's one thing you didn't mention: if this cluster is using an overlay network like VXLAN, what happens to that packet between the two node physical interfaces?

---

**User:**
Oh right, the packet gets encapsulated. The original packet becomes the payload and gets wrapped with a new IP header — source is node A's IP, destination is node B's IP. So from the underlay network's perspective it's just regular node-to-node traffic.

---

**Coach:**
Correct. That encapsulation has a cost. What's the practical consequence of adding that VXLAN header to every packet?

---

**User:**
Extra overhead — CPU for the encapsulation/decapsulation. And I think it affects MTU? You'd have less space for payload in each packet because the header takes up some bytes.

---

**Coach:**
Exactly — the VXLAN header is about 50 bytes, which eats into your effective payload size. If your physical MTU is 1500 and your CNI sets pod MTU to 1500, what happens to a 1460-byte payload after VXLAN encapsulation?

---

**User:**
It would exceed the physical MTU... so the packet would need to be fragmented. Or if there's a "don't fragment" bit set, it'd get dropped silently.

---

**Coach:**
Right. That's why a well-configured VXLAN overlay sets pod MTU to 1450 — leaves 50 bytes for the VXLAN header. It's a class of silent production bug.

Now let's talk about DNS. A pod looks up `api.payments.svc.cluster.local`. Walk me through what happens before that name resolves to an IP.

---

**User:**
The pod sends a UDP DNS query to the CoreDNS service IP, which is in `/etc/resolv.conf`. CoreDNS looks up the service in its cache or queries the Kubernetes API for the service. It returns the ClusterIP of the service.

---

**Coach:**
You mentioned the pod queries CoreDNS. How does it know which IP to send that DNS query to?

---

**User:**
The `/etc/resolv.conf` file in the pod — Kubernetes injects it with the CoreDNS ClusterIP as the nameserver, plus search domains.

---

**Coach:**
Good. The search domains are key. What search domains does Kubernetes typically inject, and why do they matter for performance?

---

**User:**
Something like `payments.svc.cluster.local`, `svc.cluster.local`, `cluster.local`. They let you use short names like `api` instead of the full FQDN.

---

**Coach:**
That's right on the search domains. Now — if a pod resolves just `api` (not the fully qualified name), how many DNS queries actually happen before it gets the answer?

---

**User:**
Hmm. It'd try each search domain in order? So it'd try `api.payments.svc.cluster.local` first, then `api.svc.cluster.local`, then `api.cluster.local`... and if those fail, it'd try the bare name. So potentially four?

---

**Coach:**
Close — there's one more. Kubernetes sets `ndots: 5` by default, which means any name with fewer than 5 dots gets the search domain treatment before trying it as an absolute name. For `api` that means 4 search domain attempts before the absolute lookup. But there's an edge case: what happens when you look up an external name like `api.github.com`?

---

**User:**
`api.github.com` has 2 dots — less than 5 — so it still goes through all four search domains first? That seems... bad. Every external DNS lookup does 4 unnecessary queries?

---

**Coach:**
Exactly. That's the ndots:5 tax — every short external name incurs 4 failed searches before the real query. At scale, this can be a meaningful source of CoreDNS load. How would you reduce this?

---

**User:**
Use FQDNs with a trailing dot when you know the address is external? Or tune ndots down? But changing ndots would break the short name lookup for internal services...

---

**Coach:**
Correct trade-off. Adding a trailing dot — `api.github.com.` — makes the resolver treat it as absolute immediately. Some teams also add `options ndots:2` to pod specs for pods that are mostly making external calls.

One more area: NetworkPolicy. You apply a default-deny-all policy to a namespace. What breaks that you might not expect?

---

**User:**
It blocks all incoming and outgoing traffic to pods in that namespace. So any service that was accepting connections would stop working. Cross-namespace traffic too.

---

**Coach:**
What about traffic you'd expect to work that isn't from another pod or service?

---

**User:**
Oh — DNS. If egress is blocked, the pods can't reach CoreDNS on port 53. Every DNS lookup fails, which means the pods can't resolve any service names at all. Even services in the same namespace.

---

**Coach:**
Good catch. What does that tell you about the right order of operations when you apply a default-deny policy?

---

**User:**
You'd want to add the explicit DNS egress rule — allowing UDP 53 to the kube-system namespace — before or at the same time as the default-deny. Otherwise you'd break DNS for all new connections immediately.

---

**Coach:**
Exactly. One more: NetworkPolicy itself is just an API object — what actually enforces it?

---

**User:**
The CNI plugin. Kubernetes just stores the policy; it's the CNI that translates it into actual iptables rules or eBPF programs. So if you're running a CNI that doesn't support NetworkPolicy — like basic Flannel without Canal — applying a NetworkPolicy does nothing.

---

**Coach:**
Right. Flannel by itself ignores NetworkPolicies completely. This trips teams up when they migrate CNIs.

Let's close here. Last question: you're designing a Kubernetes cluster for 500 nodes. You're choosing between Calico in BGP mode and Flannel VXLAN. What's your call and why?

---

**User:**
Calico BGP at that scale. VXLAN overlay adds CPU overhead per packet and the MTU reduction — both become meaningful at 500 nodes with high throughput. BGP mode avoids the encapsulation entirely by advertising pod CIDRs as native routes via BGP to the underlying network. Calico also supports NetworkPolicy natively. The trade-off is that BGP requires your network team to be on board — you need BGP peering at the switch level. But for 500 nodes I'd take that operational complexity over overlay overhead.

---

**Coach:**
Strong answer. You identified the right trade-off and knew when the complexity cost is justified.

---

## Final Report

```
╔══════════════════════════════════════════════════════════════════╗
║  PrepOps  ·  Interview Report                                    ║
║  Topic: Kubernetes Networking  ·  Mode: Learn Concept            ║
║  Level: Senior                                                   ║
╚══════════════════════════════════════════════════════════════════╝

  HIRE SIGNAL  ·  LEAN HIRE ↑

  ──────────────────────────────────────────────────────────────────

  DIMENSION SCORES

  Technical Knowledge    ★★★★☆
  → Solid on CNI, VXLAN, NetworkPolicy enforcement. Got the ndots
    tax after one probe — didn't volunteer it unprompted.

  Production Thinking    ★★★★☆
  → Unprompted: identified MTU fragmentation as a silent production
    bug. Caught the DNS-break risk of default-deny without being told.

  Communication          ★★★★☆
  → Explained packet encapsulation clearly and the BGP trade-off was
    well-structured: named the benefit, the cost, and when to pay it.

  Debugging Methodology  ★★★☆☆
  → Strong conceptual knowledge but didn't initiate hypothesis-based
    debugging unprompted — followed the coach's questions rather than
    driving the investigation.

  Depth                  ★★★★☆
  → Went deeper when probed. Closing answer on Calico vs Flannel
    at 500 nodes was confident and reasoned.

  ──────────────────────────────────────────────────────────────────

  INTERVIEWER SIGNAL
  "Solid senior-level knowledge of Kubernetes networking. The
  candidate needed one probe to surface ndots — a detail that
  separates seniors from mid-levels. NetworkPolicy + CNI enforcement
  answer was strong and correct. Would advance."

  ──────────────────────────────────────────────────────────────────

  WHAT LANDED

  ✦ "If there's a don't fragment bit set, it'd get dropped silently"
    — correctly identified the production-silent failure mode
  ✦ Correctly identified that DNS egress must be explicitly allowed
    before applying default-deny
  ✦ BGP vs VXLAN trade-off answer named the right variables:
    CPU overhead, MTU impact, BGP peering requirement

  GAPS IDENTIFIED

  ✗ ndots: 5 behavior for external names not volunteered
    What was missing: external names with fewer than 5 dots go
    through all 4 search domains before the real query
  ✗ Debugging approach was reactive — followed prompts rather than
    forming hypotheses independently

  ──────────────────────────────────────────────────────────────────

  BEFORE YOUR NEXT SESSION

  Study:    DNS search domain chain and ndots tuning — understand
            the exact query sequence for internal vs external names
  Practice: One Production Scenario session on Kubernetes Networking
            at Senior difficulty — test if the debugging approach is
            hypothesis-driven without prompts

╚══════════════════════════════════════════════════════════════════╝
```
