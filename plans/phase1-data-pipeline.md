# Phase 1: Data Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Employee says something in Feishu → it arrives in Mimir within 30 seconds.

**Architecture:** EC2-B (t3.xlarge) hosts Paperclip (control plane) + OpenClaw (agent runtime) + Feishu WebSocket. OpenClaw's memory-mimir plugin connects to existing Mimir server on EC2-A (api.allinmimir.com). Employees interact only through Feishu — no new tools to learn.

**Depends on:** Phase 0 (Dashboard deployed on Vercel, Paperclip API structure defined)

**Infra:** EC2-B (t3.xlarge, 4 vCPU, 16GB RAM, 50GB gp3, us-east-1), Caddy reverse proxy, systemd services for Paperclip and OpenClaw, embedded Postgres for Paperclip.

> **2026-03-29 shipped note:** Use [`../docs/deployment-runbook.md`](../docs/deployment-runbook.md) for the real EC2-B procedure. This file remains the original implementation plan. The shipped stack differs in several important ways: OpenClaw runs from source as `openclaw-gateway.service` instead of a Docker image, Paperclip runs as `paperclip.service` on `127.0.0.1:3100` behind Caddy, the live host exposes only `22` and `443` publicly, the binary-fallback `caddy.service` now runs as `User=caddy` / `Group=caddy`, Task 5b / `MIM-313` was cancelled, `memory-mimir` currently sits at `v4.0.0-rc.1` with five tools, and the resource-graph seed file is still placeholder data. After any proxy or Caddy-user change, verify `https://board.ssgaccelerator.com/api/health`; the first restart after moving Caddy storage to the `caddy` user can trigger a one-time TLS reprovision. Re-run the E2E checklist after the post-deploy OpenClaw fix and after deciding whether to seed real SSG data or narrow the resource-graph acceptance criteria.

## Current Deployment Snapshot

- `board.ssgaccelerator.com` terminates TLS in Caddy and reverse proxies to Paperclip on `127.0.0.1:3100`.
- EC2-B public ingress is limited to `22` and `443`; `127.0.0.1:3100` and `127.0.0.1:18789` are not public endpoints.
- Paperclip is installed from `@paperclipai/server@2026.325.0` with embedded Postgres, local encrypted secrets, and a 30 second heartbeat scheduler.
- OpenClaw runs as a host systemd service on `127.0.0.1:18789` and exposes its control UI at `/openclaw/`.
- The binary-fallback `caddy.service` runs as `User=caddy` / `Group=caddy`.
- After any proxy or Caddy user/storage change, verify `https://board.ssgaccelerator.com/api/health`. The first restart after moving Caddy storage to `caddy` can trigger a one-time TLS reprovision.
- All four OpenClaw-backed agents need explicit session keys: `agent:feishu-bot:main`, `agent:sourcing-agent:main`, `agent:portfolio-agent:main`, and `agent:matching-agent:main`.
- Mimir remains on EC2-A with the existing importance-based ranking. No server schema migration shipped.
- `data/resource-graph-seed.json` is illustrative only and must be replaced before production seeding.

---

## Project References

- **Design Spec**: `/Users/arthur/Desktop/SSGLAB/ssg-accelerator-agent-system-design.md` (sections 4-8, 13)
- **EC2-A (Mimir)**: `api.allinmimir.com` — existing, no changes
- **EC2-B (New)**: Paperclip + OpenClaw + Feishu gateway
- **Mimir plugin**: `memory-mimir` npm package (needs redesign)
- **Mimir server**: `/Users/arthur/mimir` (Go, no changes needed — existing API fully supports all agent operations)

---

## Task 1: Provision EC2-B

**Goal:** Dedicated instance for Paperclip + OpenClaw + Feishu gateway.

- [ ] **Step 1: Launch EC2 instance**

```bash
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.xlarge \
  --key-name ssg-keypair \
  --security-group-ids sg-XXXXXXXX \
  --subnet-id subnet-XXXXXXXX \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ssg-agent-system}]' \
  --region us-east-1
```

Replace security group and subnet IDs with actual values. Public ingress should be limited to the ports that must face the internet. Keep Paperclip (`3100`) and OpenClaw (`18789`) loopback-only or restricted to trusted admin ingress.

- [ ] **Step 2: Configure DNS**

Add A record: `board.ssgaccelerator.com` → EC2-B public IP.

- [ ] **Step 3: Install base dependencies**

```bash
# SSH into EC2-B
sudo yum update -y
sudo yum install -y git docker nodejs npm
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Go 1.25
wget https://go.dev/dl/go1.25.6.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.25.6.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# Install Caddy
sudo yum install -y yum-plugin-copr
sudo yum copr enable -y @caddy/caddy
sudo yum install -y caddy
sudo systemctl enable caddy
```

- [ ] **Step 4: Configure Caddy reverse proxy**

```
# /etc/caddy/Caddyfile
board.ssgaccelerator.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

- [ ] **Step 5: Verify instance is reachable**

```bash
curl -I https://board.ssgaccelerator.com
```

---

## Task 2: Deploy Paperclip on EC2-B

**Goal:** Paperclip running with embedded Postgres, company + 4 agents created, heartbeat schedules configured.

> **Shipped variant:** the deployed host installs `@paperclipai/server` into `/home/ec2-user/paperclip-app` and writes runtime config to `/home/ec2-user/.paperclip/runtime.env` instead of cloning a separate Paperclip repo into `/home/ec2-user/paperclip`.

- [ ] **Step 1: Clone and build Paperclip**

```bash
cd /home/ec2-user
git clone <paperclip-repo-url> paperclip
cd paperclip
npm install
npm run build
```

- [ ] **Step 2: Configure environment**

```bash
# /home/ec2-user/paperclip/.env
DATABASE_URL=pglite:///home/ec2-user/paperclip-data
PORT=3000
API_KEY=<generate-secure-key>
OPENCLAW_GATEWAY_URL=http://localhost:18789
```

- [ ] **Step 3: Create company and agents via API**

```bash
# Create SSG Accelerator company
curl -X POST http://localhost:3000/api/companies \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SSG Accelerator",
    "description": "AI-powered investment accelerator"
  }'

# Note the returned company_id for subsequent calls
export COMPANY_ID=<returned-id>

# Create 4 agents
for agent in feishu-bot sourcing-agent portfolio-agent matching-agent; do
  curl -X POST http://localhost:3000/api/companies/$COMPANY_ID/agents \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$agent\",
      \"adapterType\": \"openclaw_gateway\",
      \"adapterConfig\": {
        \"gatewayUrl\": \"http://localhost:18789\",
        \"agentDir\": \"/home/ec2-user/openclaw-agents/$agent\"
      }
    }"
done
```

- [ ] **Step 4: Configure heartbeat schedules**

```bash
# Sourcing: every 4 hours
curl -X POST http://localhost:3000/api/companies/$COMPANY_ID/agents/sourcing-agent/heartbeats \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"schedule": "0 */4 * * *", "enabled": true}'

# Portfolio: daily 9am (UTC+8 = 1am UTC)
curl -X POST http://localhost:3000/api/companies/$COMPANY_ID/agents/portfolio-agent/heartbeats \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"schedule": "0 1 * * *", "enabled": true}'

# Matching: every 30 minutes
curl -X POST http://localhost:3000/api/companies/$COMPANY_ID/agents/matching-agent/heartbeats \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"schedule": "*/30 * * * *", "enabled": true}'
```

- [ ] **Step 5: Start Paperclip as systemd service**

```bash
# /etc/systemd/system/paperclip.service
[Unit]
Description=Paperclip Control Plane
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/paperclip
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable paperclip
sudo systemctl start paperclip
```

- [ ] **Step 6: Verify Paperclip health**

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/companies/$COMPANY_ID/agents
# Should return 4 agents
```

---

## Task 3: Deploy OpenClaw on EC2-B

**Goal:** OpenClaw gateway running with 4 agent directories, multi-agent config, LLM providers configured.

- [ ] **Step 1: Build OpenClaw from source**

```bash
cd /home/ec2-user
git clone https://github.com/openclaw/openclaw.git openclaw-src
cd openclaw-src
pnpm install
pnpm ui:build
pnpm build
```

- [ ] **Step 2: Create agent directories**

```bash
mkdir -p /home/ec2-user/openclaw-agents/{feishu-bot,sourcing-agent,portfolio-agent,matching-agent}
```

Each agent directory will contain:
- `SOUL.md` — agent identity and principles
- `HEARTBEAT.md` — heartbeat execution plan
- `settings.json` — agent-specific config (model, tools, plugins)
- `skills/` — skill directories (added in later phases)

- [ ] **Step 3: Configure multi-agent gateway**

```json
// /home/ec2-user/openclaw-config.json
{
  "port": 18789,
  "agents": {
    "feishu-bot": {
      "dir": "/home/ec2-user/openclaw-agents/feishu-bot",
      "model": "minimax-m2.7",
      "feishu": true
    },
    "sourcing-agent": {
      "dir": "/home/ec2-user/openclaw-agents/sourcing-agent",
      "model": "kimi-k2.5",
      "browser": true
    },
    "portfolio-agent": {
      "dir": "/home/ec2-user/openclaw-agents/portfolio-agent",
      "model": "minimax-m2.7"
    },
    "matching-agent": {
      "dir": "/home/ec2-user/openclaw-agents/matching-agent",
      "model": "minimax-m2.7"
    }
  },
  "llmProviders": {
    "minimax-m2.7": {
      "apiUrl": "<minimax-api-url>",
      "apiKey": "<minimax-api-key>"
    },
    "kimi-k2.5": {
      "apiUrl": "<kimi-api-url>",
      "apiKey": "<kimi-api-key>"
    }
  }
}
```

- [ ] **Step 4: Configure memory-mimir plugin for each agent**

```json
// /home/ec2-user/openclaw-agents/feishu-bot/settings.json
{
  "plugins": ["memory-mimir"],
  "memory-mimir": {
    "apiUrl": "https://api.allinmimir.com",
    "apiKey": "<mimir-api-key>",
    "maxRecallItems": 25,
    "maxRecallTokens": 2500,
    "autoCapture": true,
    "tools": [
      "memory_store",
      "memory_search",
      "memory_graph",
      "memory_update",
      "memory_delete"
    ]
  }
}
```

Repeat for sourcing-agent, portfolio-agent, matching-agent (same plugin config, different agent dirs).

- [ ] **Step 5: Run OpenClaw gateway as a systemd service**

```bash
sudo tee /etc/systemd/system/openclaw-gateway.service >/dev/null <<'EOF'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/openclaw-src
Environment=HOME=/home/ec2-user
Environment=OPENCLAW_STATE_DIR=/home/ec2-user/.openclaw
Environment=OPENCLAW_CONFIG_PATH=/home/ec2-user/.openclaw/openclaw.json
EnvironmentFile=-/home/ec2-user/.openclaw/.env
ExecStart=/usr/bin/env node /home/ec2-user/openclaw-src/openclaw.mjs gateway --port 18789
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable openclaw-gateway
sudo systemctl restart openclaw-gateway
```

- [ ] **Step 6: Verify gateway health**

```bash
curl http://127.0.0.1:18789/openclaw/
# Should return 200
```

---

## Task 4: Connect Feishu Channel

**Goal:** Employee messages in Feishu reach the feishu-bot agent via WebSocket.

- [ ] **Step 1: Install Feishu plugin in OpenClaw**

OpenClaw connects to Feishu via WebSocket long-connection (not webhooks). No public endpoint needed.

```bash
# In the feishu-bot agent settings, add Feishu adapter config
```

```json
// Update /home/ec2-user/openclaw-agents/feishu-bot/settings.json
{
  "feishu": {
    "appId": "<feishu-app-id>",
    "appSecret": "<feishu-app-secret>",
    "verificationToken": "<feishu-verification-token>",
    "encryptKey": "<feishu-encrypt-key>"
  }
}
```

- [ ] **Step 2: Configure Feishu app permissions**

In Feishu Developer Console:
- Enable: `im:message`, `im:message.group_at_msg`, `im:chat`, `contact:user.id:readonly`
- Set event subscription to WebSocket mode (not webhook)
- Add the bot to the SSG team group chat

- [ ] **Step 3: Test 1:1 message**

Send a test message to the bot in Feishu 1:1:
```
Test message: hello from Phase 1 setup
```

Verify in OpenClaw logs:
```bash
journalctl -u openclaw-gateway -n 20 --no-pager
# Should show received message event from Feishu
```

- [ ] **Step 4: Test group chat mention**

In SSG group chat, @mention the bot:
```
@SSGBot test group message
```

Verify the bot receives the mention event.

- [ ] **Step 5: Test bot response**

The feishu-bot should reply (even with a basic SOUL.md). Verify the response appears in Feishu.

---

## Task 5: Redesign memory-mimir Plugin

**Goal:** Restore active memory tools (store/search/graph/update/delete), add lifecycle hooks, implement hybrid capture model.

**Files to modify:**
- `memory-mimir/src/index.ts` — plugin entry, tool registration
- `memory-mimir/src/tools/` — new directory for tool handlers
- `memory-mimir/src/capture.ts` — autoCapture logic (modified)
- `memory-mimir/src/recall.ts` — auto-recall logic (unchanged)

**Mimir server (Go) — NO changes needed:**
Mimir's existing importance scoring and search ranking already handle quality differentiation.
Agent-curated content (via memory_store) is higher quality input → pipeline naturally assigns higher importance.
autoCapture content goes through same pipeline → lower quality input → lower importance scores.
No new fields, no schema changes, no deployment needed on EC2-A.

### 5a: Restore Memory Tools in Plugin

- [ ] **Step 1: Create tool handler for memory_store**

```typescript
// memory-mimir/src/tools/memory-store.ts
// Tool: memory_store
// Input: { content: string, type?: "event_log" | "entity" | "relation", metadata?: object }
// Behavior: Calls Mimir ingest API — content is pre-curated by the conversation LLM
// Returns: Confirmation with stored item ID
```

The tool schema:
```json
{
  "name": "memory_store",
  "description": "Store important information in long-term memory. Use this for meeting notes, insights, key facts about people/companies, and anything worth remembering. Information stored here is HIGH confidence — you have full context about its importance.",
  "input_schema": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "The information to store. Be specific: include names, numbers, dates, and context."
      },
      "type": {
        "type": "string",
        "enum": ["event_log", "entity", "relation"],
        "description": "Type of memory. event_log for facts/events, entity for people/companies, relation for connections between entities."
      },
      "metadata": {
        "type": "object",
        "description": "Optional metadata: { importance: 'high'|'medium', tags: string[] }"
      }
    },
    "required": ["content"]
  }
}
```

- [ ] **Step 2: Create tool handler for memory_search**

```typescript
// memory-mimir/src/tools/memory-search.ts
// Tool: memory_search
// Input: { query: string, types?: string[], limit?: number }
// Behavior: Calls Mimir search API (full mode: keyword + vector + graph-traverse)
// Returns: Formatted search results with source attribution
```

- [ ] **Step 3: Create tool handler for memory_update**

```typescript
// memory-mimir/src/tools/memory-update.ts
// Tool: memory_update
// Input: { id: string, content: string }
// Behavior: Calls Mimir update API to modify existing memory item
// Returns: Confirmation
```

- [ ] **Step 4: Create tool handler for memory_delete**

```typescript
// memory-mimir/src/tools/memory-delete.ts
// Tool: memory_delete
// Input: { id: string, reason?: string }
// Behavior: Soft delete with audit trail
// Returns: Confirmation
```

- [ ] **Step 5: Register tools in plugin entry**

```typescript
// memory-mimir/src/index.ts
// In the plugin init:
//   Register memory_store, memory_search, memory_update, memory_delete
//   Keep auto-recall in before_prompt_build (unchanged)
//   Modify autoCapture: set confidence=MEDIUM, source=auto_extracted
//   Add agent_end hook: final review — "anything important I should remember?"
//   Add before_reset hook: extract uncaptured important info before compression
```

### 5b: Mimir Server Changes (Cancelled)

The Mimir server change set was cancelled during Phase 1. EC2-A stays on the existing deployment and continues to rank results by importance. Keep this subsection only as historical context for why the original plan changed.

- [ ] **Step 6: No EC2-A schema migration required**
- [ ] **Step 7: No EC2-A deploy required**
- [ ] **Step 8: Keep plugin requests backward-compatible with the current Mimir API**
- [ ] **Step 9: Use existing importance-based ranking**
- [ ] **Step 10: Handle dedup inside the plugin**
- [ ] **Step 11: Publish updated memory-mimir plugin**

```bash
cd memory-mimir
npm version 4.0.0-rc.1
npm publish
```

*No Mimir server deployment needed — EC2-A stays untouched.*

---

## Task 6: Write feishu-bot SOUL.md

**Goal:** Define the feishu-bot agent identity — the employee gateway that curates memories and routes tasks.

- [ ] **Step 1: Create SOUL.md**

Write to `/home/ec2-user/openclaw-agents/feishu-bot/SOUL.md`:

```markdown
# feishu-bot — Employee Gateway

## Mission
Help SSG Accelerator employees capture information, trigger agent tasks,
and relay results — all through natural Feishu conversation.

## Principles

1. **You are a gateway, not a decision-maker.**
   Route functional work (sourcing, analysis, matching) to specialized agents
   via Paperclip tasks. Do not attempt their work yourself.

2. **Agent-as-curator: judge what matters and store it.**
   - Meeting notes, founder interactions, insights → memory_store immediately
   - Include specific details: names, companies, numbers, dates, stages
   - Extract entities (people, companies) and relations (MET_WITH, NEEDS, OFFERS)
   - Skip: chitchat, repeated info, config discussions, ambiguous fragments

3. **Be concise.** Employees are busy. Confirm captures in 1-2 sentences.
   Respond in the employee's language (Chinese or English).

4. **Create tasks for agents.** When an employee requests sourcing, follow-ups,
   or analysis, create a Paperclip task for the appropriate agent.

5. **Never modify system configuration.** Agent settings, heartbeat schedules,
   and tool configs are Board-only.

## Memory Curation Rules

### ALWAYS store (HIGH confidence via memory_store):
- Meeting notes with specific founder/company information
- Investment insights with data points (MAU, revenue, team size, stage)
- Explicit requests ("look for AI infra teams", "follow up with DesignAI")
- Article summaries with key takeaways
- Employee connections and resource mentions
- File metadata (uploaded documents, pitch decks, screenshots)

### NEVER store:
- Casual greetings or chitchat
- Repeated information already in memory (search first)
- System configuration discussions
- Ambiguous fragments without context ("that was interesting")

## Task Routing

| Employee says... | Action |
|---|---|
| Meeting notes / founder info | memory_store + acknowledge |
| "Find teams doing X" | Create sourcing task in Paperclip |
| "Follow up with X" | Create follow-up task in Paperclip |
| "What do we know about X?" | memory_search + reply |
| Article / insight | memory_store + acknowledge |
| File upload | Upload to Mimir + memory_store metadata |

## Response Format

- Acknowledge captures: "Got it. Recorded [entity] — [key detail]."
- Task creation: "Created [task type] task for [agent]. You'll get results in [timeframe]."
- Search results: Formatted list with source attribution.
- Errors: "I couldn't [action] because [reason]. Try [alternative]."
```

- [ ] **Step 2: Verify SOUL.md loads on agent startup**

```bash
journalctl -u openclaw-gateway -n 50 --no-pager | grep "feishu-bot.*SOUL"
```

---

## Task 7: Seed Resource Graph in Mimir

**Goal:** Pre-populate the accelerator's resource graph (employee connections, LPs, mentors, partners) so matching can work from day 1.

> **Current status:** `data/resource-graph-seed.json` still contains placeholder people and relationships. Replace it with real SSG data before treating resource-graph search as production-ready.

- [ ] **Step 1: Create seed script**

Write a script that calls Mimir ingest API to create entities and relations:

```bash
# seed-resources.sh
MIMIR_URL="https://api.allinmimir.com"
API_KEY="<mimir-api-key>"
USER_ID="system"

# Employee entities
curl -X POST $MIMIR_URL/api/v1/ingest \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "content": "Employee Alice - Investment Associate. Connections: AWS (Activate program contact), Sequoia (scout network), Google Cloud (startup program).",
    "confidence": "HIGH",
    "source": "user_explicit"
  }'

# Repeat for each employee, LP, mentor, partner program
```

- [ ] **Step 2: Seed employee connections**

Create entities for each of 5-8 employees with their external connections:
- Alice: AWS, Sequoia, Google Cloud
- Bob: YC Alumni Network, Hiring Pool
- Carol: Tencent, Alibaba Cloud, Matrix Partners
- Dave: Legal network, Accounting partners
- Eve: Mentor network, University connections

- [ ] **Step 3: Seed LP/investor entities**

- Sequoia Scout: AI, Fintech, Seed-Series A
- Matrix Partners: Enterprise SaaS, Series A-B
- Angel: Dr. Chen: Healthcare AI, Pre-seed
- (Add actual LP profiles as available)

- [ ] **Step 4: Seed partner programs**

- AWS Activate: Cloud credits up to $100k
- Google for Startups: Cloud credits, GDG access
- ZhangLaw: Incorporation, IP filing
- AccountingPro: Financial audit, tax filing

- [ ] **Step 5: Seed mentor profiles**

- James Wang: B2B Sales, SaaS GTM
- Dr. Li Ming: AI/ML, Robotics
- Sarah Zhou: Product Strategy, UX

- [ ] **Step 6: Verify resource graph via search**

```bash
curl "$MIMIR_URL/api/v1/search?user_id=system&query=AWS+credits&method=full" \
  -H "Authorization: Bearer $API_KEY"
# Should return Alice's AWS connection
```

---

## Task 8: End-to-End Verification

**Goal:** Verify the complete data pipeline: employee input in Feishu → Mimir storage → search retrieval.

- [ ] **Step 1: Test employee input → Mimir storage**

In Feishu 1:1 chat with the bot:
```
Just met with DesignAI founder Zhang Wei. Product is solid — AI-powered design
tool with 500 MAU. Looking for enterprise customers. Demo stage, planning
enterprise tier launch in Q3. Team of 4, based in Shenzhen. Zhang Wei is ex-Figma.
```

Expected bot response: "Got it. Recorded DesignAI (Zhang Wei) — AI design tool, 500 MAU, needs enterprise customers, demo stage."

- [ ] **Step 2: Verify Mimir storage**

```bash
curl "$MIMIR_URL/api/v1/search?user_id=<alice-user-id>&query=DesignAI&method=full" \
  -H "Authorization: Bearer $API_KEY"
```

Should return:
- Entity: DesignAI (company, AI design tool, demo stage)
- Entity: Zhang Wei (founder, ex-Figma, Shenzhen)
- Event_log: meeting notes with key details
- Relations: Alice MET_WITH Zhang Wei

- [ ] **Step 3: Verify ranking behavior**

Check that the curated meeting note and extracted entities rank near the top of the search result. Phase 1 uses the live Mimir deployment's existing importance-based ranking rather than new server-side `confidence` fields.

- [ ] **Step 4: Test task creation → Paperclip**

In Feishu:
```
Please find more AI infra teams — especially those building LLM serving or inference optimization.
```

Expected: Bot creates a sourcing task in Paperclip, responds with confirmation.

Verify:
```bash
curl "http://localhost:3000/api/companies/$COMPANY_ID/issues?type=sourcing" \
  -H "Authorization: Bearer $API_KEY"
# Should show the new sourcing task
```

- [ ] **Step 5: Test memory_search via Feishu**

In Feishu:
```
What do we know about AI design tools?
```

Expected: Bot searches Mimir, returns DesignAI info from Step 1.

- [ ] **Step 6: Test resource graph search**

In Feishu:
```
Do we have any AWS connections?
```

Expected: Bot returns the seeded employee's cloud-credits connection from the current resource graph data set.

- [ ] **Step 7: Measure latency**

Time the path from Feishu input to Mimir storage confirmation:
- Target: < 30 seconds end-to-end
- Measure: Feishu message timestamp → bot confirmation timestamp

---

## Phase 1 Completion Checklist

After all 8 tasks:

- [ ] EC2-B is running with Paperclip + OpenClaw + Caddy
- [ ] Paperclip has SSG company with 4 agents and heartbeat schedules
- [ ] OpenClaw gateway serves 4 agents with memory-mimir plugin
- [ ] Feishu bot receives and responds to 1:1 and group chat messages
- [ ] memory-mimir plugin exposes memory_store/search/update/delete tools
- [ ] autoCapture runs as fallback (lower quality input, Mimir's importance scoring handles ranking)
- [ ] feishu-bot SOUL.md defines agent-as-curator behavior
- [ ] Resource graph seeded with real employee connections, LPs, mentors, partners
- [ ] End-to-end: Feishu input → Mimir storage in < 30 seconds
- [ ] End-to-end: Feishu query → Mimir search results returned
- [ ] End-to-end: Task creation request → Paperclip issue created
- [ ] Updated memory-mimir published as `v4.0.0-rc.1` or newer
- [ ] Mimir server (EC2-A) untouched — zero changes

---

## Next Phase

Phase 2 (Sourcing Agent) builds on this pipeline. The sourcing-agent already exists in OpenClaw — Phase 2 adds its SOUL.md, HEARTBEAT.md, browser tools, and subagent search logic.
