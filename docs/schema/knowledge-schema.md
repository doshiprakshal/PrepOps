# Knowledge File Schema

Knowledge files define what PrepOps teaches and how it evaluates. They are **curriculum**, not question banks. Claude generates questions dynamically from this content — the file defines what a strong engineer knows at each level, what they commonly get wrong, and what signals separate real understanding from memorized answers.

**Location:** `knowledge/{domain}/{topic}.yaml`

**Loaded by:** All 10 modes. The knowledge file is the session's source of truth.

---

## Required Fields

### `topic`
**Type:** string — slug, must match the filename without `.yaml`

```yaml
topic: network-policies
```

---

### `display_name`
**Type:** string — human-readable, shown to users

```yaml
display_name: "Kubernetes Network Policies"
```

---

### `domain`
**Type:** string — one of the defined domains

Valid values: `kubernetes`, `linux`, `terraform`, `aws`, `networking`, `sre`, `docker`, `gcp`, `cicd`, `mlops`

```yaml
domain: kubernetes
```

---

### `category`
**Type:** string — the display category in the mode selection menu

```yaml
category: "Containers & Orchestration"
```

---

### `key_concepts`
**Type:** list — the core concepts Claude must understand to coach this topic

Each entry requires `name`, `summary`, and `production_relevance`.

`production_relevance` must be one of: `critical`, `high`, `medium`, `low`

```yaml
key_concepts:
  - name: "Default-Deny Policy"
    summary: "A NetworkPolicy selecting all pods with empty ingress/egress blocks all traffic to/from those pods"
    production_relevance: critical
  - name: "Namespace Selectors"
    summary: "Allow traffic from pods in specific namespaces; requires namespaceSelector in the policy"
    production_relevance: high
```

**What makes a good key_concept summary:**
- One sentence, precise
- Explains the *behavior*, not the definition ("A NetworkPolicy selecting all pods..." not "NetworkPolicy controls traffic")
- Production-relevant: mentions what breaks if you don't understand this

---

### `common_misconceptions`
**Type:** list of strings — what candidates commonly get wrong, format: `"[misconception] — [correction]"`

```yaml
common_misconceptions:
  - "NetworkPolicy is enforced by Kubernetes itself — it requires a CNI that supports it; basic Flannel ignores NetworkPolicies"
  - "A default-deny policy only blocks unexpected traffic — it also blocks DNS to CoreDNS on port 53 unless explicitly allowed"
  - "NetworkPolicy rules are additive per pod — they are, but the default is allow-all; once ANY policy selects a pod, unmatched traffic is denied"
```

**Rules:**
- The correction side must be precise — not just "that's wrong" but exactly what's true
- Based on things candidates actually say, not theoretical errors
- 3–5 entries minimum

---

### `difficulty`
**Type:** object — defines expected understanding at each level. Must include at least `beginner`, `intermediate`, and `senior`.

```yaml
difficulty:
  beginner:
    expected_understanding:
      - "A NetworkPolicy selects pods using podSelector and controls their ingress/egress"
      - "An empty podSelector matches all pods in the namespace"
    key_concepts_to_mention:
      - "podSelector"
      - "ingress / egress"

  intermediate:
    expected_understanding:
      - "How to write a policy allowing ingress from pods with a specific label in another namespace"
      - "Why default-deny blocks DNS and how to explicitly allow it"
      - "NetworkPolicy is additive — once a pod is selected, all unmatched traffic is denied"
    key_concepts_to_mention:
      - "namespaceSelector"
      - "default-deny"
      - "DNS egress exception"

  senior:
    expected_understanding:
      - "NetworkPolicy has no FQDN-based rules — you can't allow traffic to api.github.com"
      - "L7 filtering requires a service mesh (Istio, Cilium) not just NetworkPolicy"
      - "NetworkPolicy enforcement is CNI-dependent — not all CNIs support it"
    key_concepts_to_mention:
      - "FQDN limitation"
      - "L7 vs L4"
      - "CNI dependency"
```

Each level's `expected_understanding` describes what a candidate at that level should be able to say *without prompting*. If they need to be told, it's a gap.

---

### `interview_angles`
**Type:** list — distinct ways this topic is tested in interviews. Each requires `angle` and `prompt`.

`angle` must be one of: `Debugging`, `Production scenario`, `Conceptual`, `Trade-offs`, `Design`

```yaml
interview_angles:
  - angle: "Debugging"
    prompt: "Pod A can reach Pod B when running in the same namespace. After you add a NetworkPolicy to namespace B, Pod A can no longer connect. Walk me through your debugging process."
  - angle: "Production scenario"
    prompt: "You applied a default-deny NetworkPolicy to the payments namespace. 30 seconds later, all pods stop resolving DNS. What happened and how do you fix it?"
  - angle: "Trade-offs"
    prompt: "NetworkPolicy can't filter by FQDN. A team wants to restrict egress to specific external APIs. What are their options?"
  - angle: "Design"
    prompt: "Design a zero-trust networking strategy for a cluster with 50 namespaces and 20 teams."
```

**Minimum:** 3 angles. Cover `Debugging` and at least one of `Production scenario` or `Trade-offs` — those are where senior candidates differentiate.

---

### `debugging_commands`
**Type:** list — only include for topics where CLI investigation is relevant

Each requires `command` and `purpose`.

```yaml
debugging_commands:
  - command: "kubectl get networkpolicies -n <namespace>"
    purpose: "List all NetworkPolicies in a namespace — first step when traffic is unexpectedly blocked"
  - command: "kubectl describe networkpolicy <name> -n <namespace>"
    purpose: "Show the exact ingress/egress rules — verify podSelector, namespaceSelector, and port rules"
  - command: "kubectl exec <pod> -- nc -vz <target-pod-ip> <port>"
    purpose: "Test TCP connectivity from inside a pod — distinguishes NetworkPolicy block from DNS failure"
```

Commands must be real, runnable commands — not pseudocode. Use `<placeholder>` for variable parts.

---

### `scenario_seeds`
**Type:** list — production scenarios Claude can use for Production Scenario mode

Each requires `title`, `setup`, `hint`, and `difficulty`.

**Critical rule: `setup` must describe observable symptoms only.** The setup is shown to the user. The hint is internal — Claude uses it to guide without giving away the answer.

```yaml
scenario_seeds:
  - title: "The Blocked Service"
    setup: "Service A in namespace 'api' can no longer reach Service B in namespace 'data'. Both pods are Running. No recent deployments. Error: 'connection refused'."
    hint: "A new default-deny NetworkPolicy was applied to namespace 'data' 10 minutes ago. It has no ingress rules, so it blocks all traffic. The fix is to add an ingress rule allowing traffic from the 'api' namespace."
    difficulty: intermediate

  - title: "The Silent Policy"
    setup: "A team applied a NetworkPolicy they believe should restrict ingress to their pods. Traffic from unauthorized sources is still getting through."
    hint: "The cluster is running Flannel CNI without Canal. Flannel does not enforce NetworkPolicies. The policy exists in etcd but has no effect."
    difficulty: senior
```

---

### `scoring_rubric`
**Type:** object — specific signals the coach looks for when evaluating answers

Four sub-sections: `technical_accuracy`, `reasoning`, `production_thinking`, `communication`

Each requires `strong_signals` and `red_flags` as lists of strings.

```yaml
scoring_rubric:
  technical_accuracy:
    strong_signals:
      - "States that NetworkPolicy enforcement depends on the CNI — not all CNIs support it"
      - "Knows that a policy with empty ingress/egress blocks all traffic — not just unexpected traffic"
    red_flags:
      - "Believes Kubernetes itself enforces NetworkPolicy without a supporting CNI"
      - "Does not know that default-deny blocks DNS traffic to CoreDNS"

  reasoning:
    strong_signals:
      - "Tests DNS resolution separately from pod-to-pod connectivity when debugging"
    red_flags:
      - "Restarts pods without checking NetworkPolicy when connectivity fails"

  production_thinking:
    strong_signals:
      - "Adds DNS egress exception before applying default-deny"
      - "Tests the policy in staging with a non-critical namespace before applying to production"
    red_flags:
      - "Applies default-deny to production without understanding the blast radius"

  communication:
    strong_signals:
      - "Can trace exactly why a specific packet is allowed or denied given a policy"
    red_flags:
      - "Vague about what podSelector vs namespaceSelector controls"
```

**Strong signals must be specific** — "understands NetworkPolicy" is not a signal. "States that enforcement requires a supporting CNI" is.

---

## Optional Fields

### `prerequisites`
```yaml
prerequisites:
  - kubernetes/pods
  - kubernetes/services
```

### `version`
```yaml
version: "1.0"
```

### `contributors`
```yaml
contributors:
  - your-github-username
```

### `follow_up_questions`
Specific follow-ups Claude uses when a topic is mentioned:

```yaml
follow_up_questions:
  - trigger: "User mentions Cilium"
    question: "What does Cilium give you that a standard NetworkPolicy doesn't?"
  - trigger: "User mentions service mesh"
    question: "If you have Istio for mTLS and L7 traffic shaping, do you still need NetworkPolicy?"
```

### `references`
```yaml
references:
  - title: "Kubernetes Network Policies"
    url: "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
```

---

## Complete Example

```yaml
topic: network-policies
display_name: "Kubernetes Network Policies"
domain: kubernetes
category: "Containers & Orchestration"
version: "1.0"
contributors:
  - your-github-username

prerequisites:
  - kubernetes/pods
  - kubernetes/services
  - kubernetes/networking

learning_objectives:
  - "Write a NetworkPolicy that restricts ingress to specific source pods and namespaces"
  - "Explain why default-deny blocks DNS and how to add the required exception"
  - "Debug a connectivity failure caused by a misconfigured NetworkPolicy"
  - "Identify when NetworkPolicy is insufficient and a service mesh is needed"

key_concepts:
  - name: "Default-Deny Policy"
    summary: "A NetworkPolicy selecting all pods with empty ingress/egress rules blocks all traffic to/from those pods"
    production_relevance: critical
  - name: "Namespace Selectors"
    summary: "Allow traffic from pods in specific namespaces using namespaceSelector in the from/to block"
    production_relevance: high
  - name: "CNI Enforcement Dependency"
    summary: "NetworkPolicy is only enforced if the CNI plugin supports it — Flannel does not; Calico and Cilium do"
    production_relevance: critical
  - name: "L4 Only Limitation"
    summary: "Standard NetworkPolicy is limited to IP, port, and protocol — no FQDN rules, no L7 filtering"
    production_relevance: high

common_misconceptions:
  - "NetworkPolicy is enforced by Kubernetes itself — it requires a CNI that supports it; basic Flannel ignores NetworkPolicies"
  - "A default-deny policy only blocks unexpected traffic — it also blocks DNS to CoreDNS on port 53"
  - "You can write a NetworkPolicy to allow traffic to api.github.com — NetworkPolicy has no FQDN support"
  - "NetworkPolicy rules block traffic by default — the default is allow-all; once a pod is selected by any policy, unmatched traffic is denied"

difficulty:
  beginner:
    expected_understanding:
      - "A NetworkPolicy selects pods using podSelector and controls their ingress and egress"
      - "An empty podSelector in a NetworkPolicy matches all pods in the namespace"
      - "Ingress rules control incoming traffic; egress rules control outgoing traffic"
    key_concepts_to_mention:
      - "podSelector"
      - "ingress / egress"
      - "namespace"

  intermediate:
    expected_understanding:
      - "How to write a policy allowing ingress on port 8080 only from pods with a specific label in another namespace"
      - "Why default-deny blocks DNS and how to write the CoreDNS egress exception"
      - "Once a pod is selected by any NetworkPolicy, all traffic not explicitly allowed is denied"
    key_concepts_to_mention:
      - "namespaceSelector"
      - "default-deny blast radius"
      - "DNS egress exception on port 53"

  senior:
    expected_understanding:
      - "NetworkPolicy has no FQDN-based rules — you can't restrict egress to api.github.com"
      - "L7 filtering (path, header, method) requires a service mesh — NetworkPolicy is L4 only"
      - "CNI dependency: Flannel ignores NetworkPolicies; Calico and Cilium enforce them"
      - "Kubernetes v1.30+ adds AdminNetworkPolicy for cluster-wide policies that override namespace policies"
    key_concepts_to_mention:
      - "L4 only / FQDN limitation"
      - "CNI dependency"
      - "service mesh for L7"

interview_angles:
  - angle: "Debugging"
    prompt: "A Pod can reach another Pod when both are in the same namespace. You add a NetworkPolicy. The connection fails. Walk me through your debugging process."
  - angle: "Production scenario"
    prompt: "You applied a default-deny NetworkPolicy to the payments namespace. 30 seconds later, pods stop resolving DNS. What happened and what's the fix?"
  - angle: "Trade-offs"
    prompt: "NetworkPolicy can't filter egress by domain name. A team needs to restrict pods to only calling api.stripe.com. What are the options?"
  - angle: "Design"
    prompt: "Design a zero-trust networking strategy for a cluster with 50 namespaces. What's your rollout plan and how do you avoid breaking production?"

debugging_commands:
  - command: "kubectl get networkpolicies -n <namespace>"
    purpose: "List all NetworkPolicies — first check when connectivity unexpectedly breaks"
  - command: "kubectl describe networkpolicy <name> -n <namespace>"
    purpose: "Show exact ingress/egress rules — verify selectors and port rules"
  - command: "kubectl exec <pod> -- nc -vz <target-ip> <port>"
    purpose: "Test TCP connectivity from inside a pod — distinguishes blocked traffic from DNS failure"
  - command: "kubectl exec <pod> -- nslookup kubernetes.default"
    purpose: "Test DNS resolution — confirms whether DNS egress is blocked by a default-deny policy"

scenario_seeds:
  - title: "The Silent Block"
    setup: "All pods in the 'data' namespace stopped receiving traffic 5 minutes ago. Pods are Running. No restarts. No application changes. Error: 'connection refused' from all callers."
    hint: "A default-deny NetworkPolicy was applied to namespace 'data' 5 minutes ago with no ingress rules. All traffic is now blocked — including DNS from pods inside the namespace."
    difficulty: intermediate

  - title: "The Phantom Policy"
    setup: "A team applied a NetworkPolicy restricting ingress to their pods. Unauthorized traffic from other namespaces is still getting through despite the policy being visible with kubectl get networkpolicies."
    hint: "The cluster uses Flannel CNI which does not enforce NetworkPolicies. The policy exists in etcd but has zero effect on actual packet filtering."
    difficulty: senior

scoring_rubric:
  technical_accuracy:
    strong_signals:
      - "States that NetworkPolicy enforcement requires CNI support — Flannel doesn't enforce it"
      - "Knows that default-deny blocks DNS to CoreDNS on port 53"
      - "Can write a correct NetworkPolicy with namespaceSelector targeting a specific namespace"
    red_flags:
      - "Believes Kubernetes itself enforces NetworkPolicy"
      - "Does not know that default-deny affects DNS"
      - "Confuses podSelector (within the policy's namespace) with namespaceSelector"

  reasoning:
    strong_signals:
      - "Tests DNS resolution separately from pod-to-pod IP connectivity"
      - "Checks for existing NetworkPolicies before assuming the network is misconfigured"
    red_flags:
      - "Restarts pods without checking NetworkPolicy first"
      - "Applies default-deny to all namespaces simultaneously without testing incrementally"

  production_thinking:
    strong_signals:
      - "Adds DNS egress exception to CoreDNS before or with the default-deny rule"
      - "Rolls out default-deny to a non-critical namespace first to verify impact"
      - "Documents the blast radius of the policy before applying"
    red_flags:
      - "Applies default-deny to production without understanding what traffic it blocks"
      - "Does not check whether the CNI supports NetworkPolicy enforcement"

  communication:
    strong_signals:
      - "Can explain exactly why a specific packet is allowed or denied given a policy spec"
      - "Articulates the difference between L4 NetworkPolicy and L7 service mesh filtering"
    red_flags:
      - "Vague about what podSelector vs namespaceSelector controls"
      - "Cannot explain what happens to unmatched traffic once a pod is selected by any policy"

follow_up_questions:
  - trigger: "User mentions Cilium"
    question: "What does Cilium give you that standard NetworkPolicy doesn't?"
  - trigger: "User mentions service mesh"
    question: "If you have Istio for mTLS and L7 traffic control, do you still need NetworkPolicy? Why?"
  - trigger: "User mentions namespaceSelector"
    question: "Write a NetworkPolicy that allows ingress on port 8080 from any pod in a namespace labeled 'team=payments', and denies everything else."

references:
  - title: "Kubernetes Network Policies"
    url: "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
  - title: "Kubernetes AdminNetworkPolicy (v1.30+)"
    url: "https://kubernetes.io/docs/concepts/services-networking/network-policies/#adminnetworkpolicy"
```

---

## Quality Checklist

Before submitting a knowledge file PR:

- [ ] `topic` matches the filename exactly (without `.yaml`)
- [ ] `setup` in every `scenario_seed` contains only observable symptoms — no root cause hints
- [ ] Each `scoring_rubric` signal is specific, not generic ("states X" not "understands X")
- [ ] `common_misconceptions` corrections are precise — the right side must be exactly correct
- [ ] At least 3 `interview_angles` — covers `Debugging` and at least one `Production scenario` or `Trade-offs`
- [ ] `debugging_commands` use real command syntax with `<placeholder>` for variables
- [ ] `difficulty` covers at least `beginner`, `intermediate`, and `senior`
- [ ] `follow_up_questions` have specific trigger conditions, not "user mentions the topic"

---

## Common Mistakes

**Scenario seeds with hints in the setup.** The `setup` is shown to the user. If it says "after a CNI change," you've given away the layer. Observable symptoms only: what does the on-call engineer see on their monitoring dashboard?

**Generic rubric signals.** "Understands networking" is not a signal. "States that NetworkPolicy enforcement is CNI-dependent" is a signal — it's something a candidate either says or doesn't say.

**Definitions as key concepts.** `"summary: 'A NetworkPolicy is a Kubernetes resource that controls traffic'"` teaches nothing. `"summary: 'Once a pod is selected by any NetworkPolicy, all unmatched traffic is denied — the default flips from allow to deny'"` is useful.

**Interview angles that are just definitions.** `angle: Conceptual, prompt: "What is a NetworkPolicy?"` is not a useful angle. `"A Pod can reach another Pod. You add a NetworkPolicy. The connection fails. Walk me through your debugging process."` is.

**Missing the DNS egress issue.** Almost every NetworkPolicy knowledge file should mention that default-deny blocks DNS to CoreDNS. It's the most common production mistake and a reliable signal in interviews.
