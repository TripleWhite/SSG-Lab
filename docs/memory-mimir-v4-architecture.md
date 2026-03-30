# memory-mimir v4.0 — Architecture Spec

**Author:** CTO  
**Date:** 2026-03-29  
**Status:** Phase 1 implementation documented. Build verified for `v4.0.0-rc.1`.

## Overview

memory-mimir v4.0 restores explicit memory tools alongside the existing passive auto-recall/auto-capture system. This creates a **hybrid memory architecture** where:

- **Auto-recall** injects relevant memories before each agent turn (unchanged from v3.5.2)
- **Auto-capture** records conversations at session end with MEDIUM confidence (modified)
- **Explicit tools** allow agents to store HIGH-confidence curated memories, search with filters, traverse the knowledge graph, update existing items, and delete stale memories

## Architecture

```
                    ┌──────────────────────────────────┐
                    │         OpenClaw Agent            │
                    │                                   │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │ Auto-Recall │  │ LLM Tools  │ │
                    │  │ (passive)   │  │ (explicit) │ │
                    │  └──────┬──────┘  └─────┬──────┘ │
                    └─────────┼───────────────┼────────┘
                              │               │
                    ┌─────────┴───────────────┴────────┐
                    │       memory-mimir v4.0           │
                    │                                   │
                    │  Events:                          │
                    │  ├─ before_agent_start → recall    │
                    │  └─ agent_end → auto-capture      │
                    │                                   │
                    │  Tools:                           │
                    │  ├─ memory_store  (HIGH conf)     │
                    │  ├─ memory_search (filtered)      │
                    │  ├─ memory_graph  (traversal)     │
                    │  ├─ memory_update (entity attrs)  │
                    │  └─ memory_delete (soft delete)   │
                    └──────────────┬────────────────────┘
                                  │ HTTPS
                    ┌─────────────┴─────────────────────┐
                    │   Mimir Server (api.allinmimir.com)│
                    │                                    │
                    │  /api/v1/ingest/note               │
                    │  /api/v1/search                    │
                    │  /api/v1/graph/traverse            │
                    │  /api/v1/files/upload              │
                    └────────────────────────────────────┘
```

## Tool Definitions

### memory_store

Store important information as a curated, high-confidence memory.

```json
{
  "name": "memory_store",
  "description": "Store important information in long-term memory with high confidence. Use for meeting notes, insights, key facts about people/companies, and anything worth remembering.",
  "input_schema": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "The information to store. Be specific: include names, numbers, dates, and context."
      },
      "type": {
        "type": "string",
        "enum": ["note", "meeting", "insight", "contact"],
        "default": "note",
        "description": "Category hint for extraction."
      },
      "importance": {
        "type": "string",
        "enum": ["high", "medium"],
        "default": "high"
      }
    },
    "required": ["content"]
  }
}
```

Implementation: POST /api/v1/ingest/note with confidence=HIGH, source=agent_curated.

### memory_search

Search memories with optional filters.

```json
{
  "name": "memory_search",
  "description": "Search long-term memory. Use to recall facts, find people/companies, or check what is already stored.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Natural language search query." },
      "types": {
        "type": "array",
        "items": { "type": "string", "enum": ["event_log", "entity", "relation", "episode", "foresight"] },
        "description": "Filter by memory type. Omit to search all."
      },
      "time_range": {
        "type": "string",
        "description": "Time filter: 'today', 'this_week', 'this_month', or 'YYYY-MM-DD..YYYY-MM-DD'."
      },
      "limit": { "type": "number", "default": 10 }
    },
    "required": ["query"]
  }
}
```

Implementation: POST /api/v1/search with retrieve_method=full, apply filters.

### memory_graph

Explore entity relationships in the knowledge graph.

```json
{
  "name": "memory_graph",
  "description": "Explore connections between people, companies, and resources in the knowledge graph.",
  "input_schema": {
    "type": "object",
    "properties": {
      "entities": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Entity names to start traversal from."
      },
      "hops": { "type": "number", "default": 2, "description": "Relationship hops (1-3)." },
      "max_results": { "type": "number", "default": 50 }
    },
    "required": ["entities"]
  }
}
```

Implementation: POST /api/v1/graph/traverse.

### memory_update

Update an existing entity's attributes.

```json
{
  "name": "memory_update",
  "description": "Update information about an existing entity. Use when you learn new details about something already stored.",
  "input_schema": {
    "type": "object",
    "properties": {
      "entity_name": { "type": "string", "description": "Name of the entity to update." },
      "updates": { "type": "string", "description": "New information to merge." }
    },
    "required": ["entity_name", "updates"]
  }
}
```

Implementation: Search entity by name, then ingest update note with confidence=HIGH, source=agent_curated.

### memory_delete

Delete or tombstone a memory that should no longer be used.

```json
{
  "name": "memory_delete",
  "description": "Delete stale or incorrect memory items while preserving an audit trail.",
  "input_schema": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Memory identifier to delete." },
      "reason": { "type": "string", "description": "Optional reason for the tombstone." }
    },
    "required": ["id"]
  }
}
```

Implementation: Soft-delete the target memory and log the deletion reason when one is supplied.

## Auto-Capture Changes (v3.5.2 -> v4.0)

| Aspect | v3.5.2 | v4.0 |
|--------|--------|------|
| Confidence | Not set | MEDIUM explicitly |
| Source | Not set | auto_extracted explicitly |
| Dedup with curated | Hash-based only | Check entity overlap + hash dedup |

### Dedup with Agent-Curated Memories

Track content hashes from memory_store calls during session. In agent_end auto-capture, skip messages whose content hash is already in this set. Prevents double-storage.

## Configuration (v4.0)

```json
{
  "apiKey": "string (secret)",
  "mimirUrl": "string (default: https://api.allinmimir.com)",
  "userId": "string (auto-fetched if empty)",
  "groupId": "string (auto-fetched if empty)",
  "autoRecall": true,
  "autoCapture": true,
  "tools": true,
  "enabledTools": ["memory_store", "memory_search", "memory_graph", "memory_update", "memory_delete"],
  "maxRecallItems": 25,
  "maxRecallTokens": 2500,
  "defaultCaptureConfidence": "MEDIUM",
  "defaultCaptureSource": "auto_extracted",
  "displayName": "string"
}
```

## File Structure

```
memory-mimir/
├── src/
│   ├── index.ts              -- Plugin entry, event hooks, tool registration
│   ├── mimir-client.ts       -- HTTP client (unchanged)
│   ├── formatter.ts          -- Result formatting (enhanced)
│   ├── tools/
│   │   ├── memory-store.ts   -- memory_store handler
│   │   ├── memory-search.ts  -- memory_search handler
│   │   ├── memory-graph.ts   -- memory_graph handler
│   │   ├── memory-update.ts  -- memory_update handler
│   │   └── memory-delete.ts  -- memory_delete handler
│   ├── recall.ts             -- Auto-recall logic (extracted)
│   ├── capture.ts            -- Auto-capture logic (modified for dedup)
│   ├── cli.ts                -- CLI (unchanged)
│   └── test.ts               -- Tests (expanded)
├── skills/mimir-memory/SKILL.md
├── openclaw.plugin.json
├── package.json
└── README.md
```

## Migration

v3.5.2 -> `v4.0.0-rc.1` is backward compatible. `tools: false` disables explicit tools (v3.x behavior). All existing config works without modification.

## Dependencies

- No Mimir server schema migration is required for Phase 1.
- EC2-A stays on the existing Mimir deployment and continues to rank by importance.
- If the plugin sends `confidence` or `source`, treat them as client-side hints, not required server columns.

## Testing Requirements

1. Tool registration — All 5 tools register correctly
2. memory_store — HIGH confidence, agent_curated source
3. memory_search — Filtered results with confidence badges
4. memory_graph — Graph traversal returns connected entities
5. memory_update — Entity found and updated (or created if new)
6. memory_delete — Tombstone path leaves audit trail and removes the item from normal recall
7. Auto-capture dedup — memory_store content not re-ingested
8. Backward compat — tools:false disables all tools
9. Error handling — Mimir API failures return user-friendly messages
