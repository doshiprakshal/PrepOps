# Incident Schema

Incident files define production scenario simulations. The user is the on-call engineer. PrepOps responds as the terminal, monitoring system, and incident timeline.

A good incident has a specific root cause that can be reached by a systematic investigator but is not obvious from the first symptoms. It has clues that reward the right investigation path, red herrings that punish guessing, and in-universe escalation pressure that simulates real on-call stress.

**Location:** `incidents/{domain}/{id}.yaml`

**Examples:**
```
incidents/kubernetes/mtu-mismatch.yaml
incidents/linux/disk-full-open-handles.yaml
incidents/sre/cascading-retry-storm.yaml
```

**Loaded by:** Production Scenarios mode. The incident file replaces the need to generate a scenario dynamically.

---

## Required Fields

### `id`
**Type:** string — slug, matches the filename without `.yaml`

```yaml
id: mtu-mismatch
```

---

### `title`
**Type:** string — short, specific, describes the root cause (not the symptom)

```yaml
title: "MTU Mismatch on Node"
```

The title reveals the root cause — that's fine, because the title is internal metadata. The user never sees the title before the incident; they see only `opening_message`.

---

### `domain`
**Type:** string — one of the defined domains

Values: `kubernetes`, `linux`, `terraform`, `aws`, `networking`, `sre`

```yaml
domain: kubernetes
```

---

### `difficulty`
**Type:** string

Values: `beginner`, `intermediate`, `senior`, `staff`

```yaml
difficulty: senior
```

---

### `topics`
**Type:** list — which knowledge domains this incident touches

```yaml
topics: [networking, kubernetes]
```

---

### `context`
**Type:** object — internal incident metadata. NOT shown to the user directly.

```yaml
context:
  service: "payment-processor"
  impact: "~20% of transactions timing out"
  slo_status: "Error budget at 40% — not yet critical"
  ticket_count: 31
  observable_symptoms:
    - "POST /charge returns 504 on roughly 1 in 5 requests"
    - "Retries succeed — so it's intermittent, not persistent"
    - "Started 8 minutes ago"
    - "No recent deployments"
```

`observable_symptoms` is the factual list of what the investigator can confirm. It feeds into `opening_message`.

---

### `opening_message`
**Type:** string (block scalar) — the exact text shown to the user when the incident starts

Format the opening consistently. Include the incident banner, key observables, and end with a question that invites action.

```yaml
opening_message: |
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚨  INCIDENT  ·  09:47 UTC
    Service: payment-processor
    Impact: ~20% of transactions timing out
    Tickets: 31 open · Duration: 8 minutes
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Payment processing is throwing 504 timeouts intermittently.
  Retries succeed — so it's not a total outage. No deployments
  in the last 4 hours. Monitoring shows nothing obviously broken.
  Where do you start?
```

**Rules for `opening_message`:**
- Observable symptoms only — no root cause hints
- No "the problem is in X layer" framing
- Must end with an action-inviting question
- Duration in minutes, not "at 09:39" — keeps the urgency alive

---

### `root_cause`
**Type:** object — the full internal answer the coach knows but doesn't reveal

```yaml
root_cause:
  component: "database connection pool exhaustion"
  layer: application
  explanation: |
    The connection pool size was reduced from 50 to 10 in a config change
    deployed 8 minutes ago. Under normal load, the pool can sustain 10
    concurrent connections. Occasionally, a slow query holds a connection
    for 2+ seconds, causing other requests to queue. At 1 in 5 requests,
    exactly 1-2 slow queries are always in flight, starving the pool.
    Retries succeed because the slow query completes before the retry.
  fix: "Revert connection pool size to 50 in the config and redeploy"
  prevention: "Add connection pool exhaustion metric and alert; review config changes for database parameters"
  postmortem_hint: "Config change did not go through the standard change review process which would have flagged the pool size reduction"
```

`postmortem_hint` is the one-sentence root cause for the postmortem — the process failure that allowed the technical failure to reach production.

---

### `clues`
**Type:** list — information revealed when the user investigates the right areas

Each clue requires `id`, `trigger_keywords`, and `response`.

```yaml
clues:
  - id: clue_1
    trigger_keywords: [timeout, slow, latency, response time, logs]
    response: |
      $ kubectl logs -n payments payment-processor-7d9f4-xkp2q --tail=30
      09:47:02 INFO  POST /charge 200 45ms
      09:47:03 INFO  POST /charge 200 51ms
      09:47:04 ERROR POST /charge 504 timeout after 30000ms
      09:47:04 INFO  POST /charge 200 49ms
      09:47:05 ERROR POST /charge 504 timeout after 30000ms
      09:47:05 INFO  POST /charge 200 52ms
      [WARN] Database connection pool: 10/10 connections in use
      [WARN] Connection request queued: 847ms wait
    reveals: "Intermittent 504s correlating with connection pool warnings — the pool is occasionally exhausting"

  - id: clue_2
    trigger_keywords: [config, configuration, change, history, deployment, recent change]
    response: |
      $ kubectl describe configmap payment-processor-config -n payments
      ...
      database.pool.maxConnections: 10   # was 50 before 09:39 UTC
      database.pool.timeout: 30000
      ...
      Last updated: 09:39 UTC (8 minutes ago)
    reveals: "Connection pool reduced from 50 to 10 in a config change 8 minutes ago — timing matches incident start"

  - id: clue_3
    trigger_keywords: [database, query, slow query, db latency, connection]
    response: |
      $ kubectl exec -it payment-processor-7d9f4-xkp2q -- db-cli query-stats
      Avg query time:    48ms
      P95 query time:   180ms
      P99 query time:  2340ms
      Slow queries (>1s): 1-2 per second
      Current connections: 10/10
    reveals: "P99 latency is 2340ms — occasional slow queries hold connections for 2+ seconds, starving the pool of size 10"
```

**Critical rule for trigger_keywords:** They must match what a real engineer would actually type. Include synonyms. An engineer investigating latency might type "slow", "timeout", "latency", "response time", "504" — all should trigger the relevant clue.

**Critical rule for response:** Must look exactly like real terminal output. Copy the format of actual commands. Fake-looking output breaks the simulation.

---

### `red_herrings`
**Type:** list — plausible things to check that turn out to be unrelated

Each requires `id`, `trigger_keywords`, `response`, and `note`.

```yaml
red_herrings:
  - id: rh_1
    trigger_keywords: [pod restart, crash, CrashLoopBackOff, restarts]
    response: |
      $ kubectl get pods -n payments
      NAME                              READY   STATUS    RESTARTS   AGE
      payment-processor-7d9f4-xkp2q    1/1     Running   0          2h
      payment-processor-7d9f4-m4n7r    1/1     Running   0          2h
      redis-cache-6f8c2-vxq9k          1/1     Running   1          4h
    note: "Redis restart was 4 hours ago from a scheduled rolling update — unrelated to incident"

  - id: rh_2
    trigger_keywords: [cpu, memory, node, resource, top]
    response: |
      $ kubectl top pod -n payments
      NAME                              CPU(cores)   MEMORY(bytes)
      payment-processor-7d9f4-xkp2q    220m         380Mi
      payment-processor-7d9f4-m4n7r    195m         362Mi
    note: "CPU and memory are well within limits — not a resource pressure issue"
```

**What makes a good red herring:** It should be plausible to check. A Redis restart is a reasonable thing to investigate in a payment timeout scenario. CPU pressure is a reasonable first check. The red herring must look real (realistic command output) but lead nowhere.

---

### `turn_budget`
**Type:** object — in-universe escalation messages keyed by turn number (as strings)

Turn budget messages create realistic pressure without breaking the simulation. They come from Slack, not from the coach.

```yaml
turn_budget:
  "3": |
    [Slack · #incidents] @oncall Finance needs an ETA for the payment issues.
    Card transactions are failing for some customers. How are we progressing?
  "6": |
    [Slack · #incidents] @oncall I noticed the payment processor config was
    updated at 09:39. Might be worth checking if that's related?
  "9": |
    [Slack · #incidents] @oncall The config change at 09:39 reduced the DB
    connection pool. Could that be causing the queueing we're seeing in the logs?
  "12": |
    [Slack · #incidents] @oncall I think the connection pool size is the issue.
    Pool is at 10 but should be 50. Can you confirm and revert?
```

**Turn budget structure:** Turns 3 and 6 add pressure but don't give away the answer. Turn 6 might point toward the right area. Turn 9 is a stronger signal. Turn 12+ reveals the root cause as a colleague discovery — the simulation isn't stuck, it progresses.

---

### `resolution_sequence`
**Type:** list of steps — what happens when the user identifies the root cause and applies the fix

```yaml
resolution_sequence:
  - step: confirm
    message: "Reverting the config restores pool to 50 — 504 error rate drops to 0 within 60 seconds"
  - step: remediate
    message: "kubectl rollout restart deployment/payment-processor → verify error rate drops → confirm with monitoring"
  - step: prevent
    message: "Add connection pool exhaustion alert; add DB configuration parameters to change review checklist"
  - step: postmortem
    message: "Config change bypassed standard review process. Pool reduction not flagged as risky. Standard review would have caught it."
```

---

## Optional Fields

### `lp_angle`
For Amazon-style incidents where the investigation should surface a Leadership Principle discussion:

```yaml
lp_angle:
  principle: "Dive Deep"
  discussion: "What would you add to the runbook so the next on-call knows to check connection pool config immediately?"
```

---

## Complete Example

```yaml
id: redis-oom-eviction
title: "Redis OOM Eviction Causing Cache Miss Cascade"
domain: sre
difficulty: senior
topics: [sre, kubernetes, linux]

context:
  service: "product-catalog-api"
  impact: "Response times 10x normal — P99 latency at 8 seconds"
  slo_status: "Burning at 5x rate — 20% error budget left for the month"
  ticket_count: 89
  observable_symptoms:
    - "P99 latency spiked from 120ms to 8000ms at 11:15 UTC"
    - "All pods Running, no restarts"
    - "Database CPU normal"
    - "Traffic volume is normal — no spike"

opening_message: |
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚨  INCIDENT  ·  11:22 UTC
    Service: product-catalog-api
    Impact: P99 latency 8 seconds — 10x normal · SLO burning at 5x
    Tickets: 89 open · Duration: 7 minutes
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Product catalog API is extremely slow. P99 is 8 seconds — normally
  120ms. No traffic spike. No deployment in 12 hours. Database says
  query times are normal. Where do you start?

root_cause:
  component: "Redis maxmemory reached — OOM eviction removing all cached data"
  layer: caching
  explanation: |
    Redis hit its maxmemory limit at 11:15 UTC. With eviction policy
    allkeys-lru, Redis began evicting all cached product data. Every
    request that would have been a cache hit is now a cache miss, going
    directly to the database. The database can handle the query load but
    each query takes ~200ms vs ~2ms for a cache hit. With 40 concurrent
    requests, the response time P99 reaches 8 seconds from queuing.
  fix: "Increase Redis maxmemory OR flush and restart to clear eviction; tune eviction policy"
  prevention: "Alert on Redis memory usage at 80%; add cache hit rate SLO; review maxmemory setting"
  postmortem_hint: "Redis maxmemory was set at initial deployment 18 months ago and never reviewed as data volume grew"

clues:
  - id: clue_1
    trigger_keywords: [cache, redis, hit rate, cache miss, caching]
    response: |
      $ redis-cli -h redis.prod.svc info stats | grep -E "hit|miss"
      keyspace_hits:847
      keyspace_misses:24891
      # Cache hit rate: 3.3% (normally ~95%)
    reveals: "Cache hit rate collapsed from 95% to 3.3% — almost all requests are hitting the database"

  - id: clue_2
    trigger_keywords: [redis memory, maxmemory, redis info, eviction]
    response: |
      $ redis-cli -h redis.prod.svc info memory
      used_memory_human:1.99G
      maxmemory_human:2.00G
      maxmemory_policy:allkeys-lru
      evicted_keys:1847293
    reveals: "Redis is at its 2GB memory limit; LRU eviction has removed 1.8M keys — wiped the cache"

  - id: clue_3
    trigger_keywords: [database, db latency, query, slow]
    response: |
      $ psql -h db.prod.svc -c "SELECT count(*), avg(duration) FROM pg_stat_activity"
       count  | avg
      --------+---------
        38    | 198ms
      # Normal concurrent queries: 2-3; normal avg: 45ms
    reveals: "38 concurrent database queries (vs normal 2-3) each taking 198ms — all cache traffic hitting the DB"

red_herrings:
  - id: rh_1
    trigger_keywords: [pod cpu, container cpu, resource limit]
    response: |
      $ kubectl top pod -n catalog
      NAME                              CPU(cores)   MEMORY(bytes)
      product-catalog-7f9d-xkp2q       380m         290Mi
      product-catalog-7f9d-m4n7r       420m         310Mi
    note: "CPU is elevated but within normal range for the workload — not the cause of latency"

  - id: rh_2
    trigger_keywords: [network, latency, ping, connectivity]
    response: |
      $ kubectl exec -it product-catalog-7f9d-xkp2q -- ping redis.prod.svc -c 3
      PING redis.prod.svc: 64 bytes, icmp_seq=0, time=0.4ms
      PING redis.prod.svc: 64 bytes, icmp_seq=1, time=0.3ms
      PING redis.prod.svc: 64 bytes, icmp_seq=2, time=0.4ms
    note: "Network connectivity to Redis is fine — the problem is what's in Redis, not how you reach it"

turn_budget:
  "3": |
    [Slack · #incidents] @oncall CTO is asking for an update. Product catalog
    is our highest-traffic service. ETA?
  "6": |
    [Slack · #incidents] @oncall I was looking at the Redis metrics dashboard
    and our cache hit rate chart is completely flat. That seems wrong.
  "9": |
    [Slack · #incidents] @oncall Redis memory usage graph shows it hit 2GB
    exactly at 11:15 and has been there since. Is it full?
  "12": |
    [Slack · #incidents] @oncall Redis is at maxmemory (2GB) and evicting
    everything. Cache is empty. That's why every request is hitting the DB.
    Can we increase maxmemory or flush and restart?

resolution_sequence:
  - step: confirm
    message: "Increasing maxmemory to 4GB and restarting Redis fills the cache within 2 minutes; P99 drops back to 120ms"
  - step: remediate
    message: "kubectl exec redis -- redis-cli config set maxmemory 4gb → monitor cache hit rate recovery → verify P99"
  - step: prevent
    message: "Alert on Redis memory at 80%; track cache hit rate as an SLI; review maxmemory quarterly as data grows"
  - step: postmortem
    message: "maxmemory set at initial deployment and never reviewed. Data volume doubled in 18 months. Add maxmemory review to quarterly infra review checklist."
```

---

## Quality Checklist

- [ ] `opening_message` describes only observable symptoms — no root cause hints
- [ ] `opening_message` ends with an action-inviting question
- [ ] Each clue's `trigger_keywords` includes synonyms a real engineer would use
- [ ] Each clue's `response` looks exactly like real terminal output — right format, right column names
- [ ] Red herrings are genuinely plausible to check, not obviously irrelevant
- [ ] `turn_budget` messages are in-universe (Slack format) — they're from colleagues, not the coach
- [ ] Turn 3 adds pressure only; turn 6 points toward an area; turn 9 is a stronger hint; turn 12+ reveals
- [ ] `resolution_sequence` includes prevention and postmortem, not just the fix
- [ ] `root_cause.postmortem_hint` is a process failure, not just a technical failure

---

## Common Mistakes

**Hints in the opening message.** The most common mistake. "After a config change to the networking layer..." has given away the layer before the investigation starts. All symptoms in the opening must be things a monitoring dashboard shows — error rates, latency, ticket count — not causes.

**Fake-looking terminal output.** If the command output doesn't look exactly like what the real command returns, it breaks the simulation. Check column names, whitespace, and output format against real command output before submitting.

**Red herrings that are too obvious.** "Checking the moon phase returns nothing relevant" is not a red herring — no one would check that. A good red herring is something a reasonable engineer would actually investigate given the symptoms.

**Turn budget messages that reveal too early.** Turn 3 should add pressure only: "Finance is asking for an ETA." Turn 6 can point toward an area: "I noticed the config changed at 09:39." Turn 9 can be more specific. Revealing the root cause at turn 3 removes all the diagnostic value.

**Resolution sequence that stops at the fix.** The three required steps are: fix, prevent, postmortem. The postmortem step is the most important — what process failure allowed this to reach production?

**Only one clue path.** A good incident can be reached multiple ways. A candidate who checks the database first should still be able to find the root cause — just slower than one who checks the cache first. Multiple clue paths make the incident replayable.
