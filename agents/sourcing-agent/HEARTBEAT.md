# Sourcing Agent Heartbeat

Run every 4 hours and on manual sourcing requests. The sourcing-agent finds
founders and teams that fit the accelerator thesis, stores the knowledge in
Mimir first, and mirrors structured results into Paperclip for the dashboard.

## Tools Available

- `memory_search`, `memory_store`, `memory_graph`, `memory_update`,
  `memory_delete`
- `web_search`
- `browse`
- `github_search`
- `xiaohongshu_search`
- `wechat_article_search`
- `extract_contact`
- `screenshot`

## Secret Handling

- Never inline `PAPERCLIP_API_KEY` or any bearer token into a command, comment,
  or status message
- For Paperclip API calls, use the paperclip-api helper script already
  provisioned in the OpenClaw workspace runtime
- Paperclip result mirrors are best-effort only. Failures must be logged, but
  they must not roll back a successful Mimir write

## Execution Plan

### 1. Identity And Freshness

- Capture the current date/time for search freshness
- Load the current accelerator thesis from your injected prompt context
- Prefer assigned sourcing work first; use proactive discovery only when no
  manual request exists

### 2. Get Work

- Check Paperclip inbox first and prioritize assigned sourcing tasks
- If no task is assigned, scan Mimir for recent employee signals that imply a
  sourcing need
- Use the triggering task description or the strongest repeated signal as the
  sourcing thesis for this heartbeat

### 3. Load Existing Context

- `memory_search` for recent sourcing-related event logs, entities, and prior
  founder/company discoveries tied to the current thesis
- Use existing Mimir results to avoid duplicate founder/company records before
  you browse the web
- Preserve prior source attribution when a candidate already exists in Mimir

### 4. Execute Search

- Search across English and Chinese channels as appropriate to the thesis:
  - `web_search`
  - `github_search`
  - `xiaohongshu_search`
  - `wechat_article_search`
  - `browse`
- For each promising candidate:
  - confirm founder + company identity
  - extract domain and stage signals
  - collect contact data when available
  - summarize why the candidate matches the thesis
- Skip weak or noisy results below the 60-point relevance threshold

### 5. Curate, Deduplicate, And Store In Mimir

- Deduplicate cross-platform results before storing anything
- Store HIGH-value candidates with full profile detail
- Store MEDIUM-value candidates with concise but useful summary detail
- Keep Mimir as the source-of-truth write:
  - write to Mimir first
  - only mirror to Paperclip after the Mimir write succeeds

### 6. Mirror Structured Results To Paperclip

- Require runtime env before any Paperclip write:
  - `PAPERCLIP_API_URL`
  - `PAPERCLIP_COMPANY_ID`
  - `PAPERCLIP_SOURCING_PARENT_ISSUE_ID`
  - `PAPERCLIP_API_KEY` when Paperclip auth is enabled
- Use the paperclip-api helper script for issue lookup, issue creation, and
  `documents/result` writes
- Mirror each stored candidate as a child issue under
  `PAPERCLIP_SOURCING_PARENT_ISSUE_ID`
- Deduplicate by stable candidate key:
  - prefer `result.id`
  - otherwise use `Sourcing: {companyName} / {founderName}` as the fallback
    identity
- Issue title format:
  - `Sourcing: {companyName} / {founderName}`
- Issue status mapping:
  - `new -> todo`
  - `reviewed -> in_review`
  - `converted -> done`
  - `dismissed -> cancelled`
- Write or update `documents/result` with a top-level JSON body that matches
  the dashboard `SourcingResult` contract:

```json
{
  "id": "company:founder",
  "founderName": "Alice Chen",
  "companyName": "Acme AI",
  "domain": "AI Infra",
  "stage": "Seed",
  "relevanceScore": 92,
  "sources": ["GitHub", "X"],
  "contactEmail": "alice@acme.ai",
  "contactTwitter": "@alicechen",
  "contactLinkedin": "https://www.linkedin.com/in/alicechen",
  "matchReason": "Strong distribution fit with the current sourcing thesis",
  "createdAt": "2026-04-01T07:45:00Z",
  "status": "new",
  "requestedBy": "CTO"
}
```

- Do not wrap the result payload inside `{"SourcingResult": ...}`. The
  dashboard reads the top-level fields directly from `documents/result`

### 7. Notify And Update

- Send the requesting employee a concise Feishu result summary when a manual
  sourcing task triggered the run
- Comment on the triggering Paperclip task with a short summary of candidates,
  search gaps, and any mirror failures
- If there are no credible candidates, say so explicitly instead of writing
  placeholder records

### 8. Proactive Scan

- When no manual task exists, look for repeated thesis signals in recent Mimir
  event logs and run a smaller sourcing sweep
- Keep proactive results scoped and high-signal; avoid generic founder lists

### 9. Exit

- Report candidates reviewed, candidates stored, Paperclip result issues
  created/updated, and blockers
- Leave the task `in_progress` when follow-up work remains
- Mark `blocked` only when a concrete dependency prevents further progress
