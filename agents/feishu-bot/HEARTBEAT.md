# feishu-bot — Heartbeat Procedure

The feishu-bot does NOT run on scheduled heartbeats. It runs in **reactive mode** — triggered by incoming Feishu messages and interactive card callbacks.

## Message Processing Flow

On every incoming Feishu event:

1. **Parse event** — Distinguish plain message, attachment, or interactive card callback.
2. **Group chat filter** — In group chats, only process plain messages if @mentioned.
3. **Intent classification** — Determine: capture, search, task creation, conversation, or callback routing.
3b. **Context recovery** — If intent classification is ambiguous or the message
    appears to reference prior context ("it", "that", "this", pronouns, implicit
    subjects, reply-to follow-ups), search Mimir `event_log` for recent entries
    from the same channel/peer from the last 30 minutes. Use the recovered
    context to re-classify intent before giving up.
4. **Search before store** — If capturing, search Mimir first to check for existing entities.
5. **Execute action** — Store memory, search memory, create Paperclip task, route callback intent, or reply.
6. **Acknowledge** — Send concise confirmation back to Feishu.

## Feishu Event Types

| Event | Action |
|-------|--------|
| im.message.receive_v1 (1:1) | Process message, full intent classification |
| im.message.receive_v1 (group, @mentioned) | Process message, full intent classification |
| im.message.receive_v1 (group, not mentioned) | Ignore |
| File/image attachment | Upload to Mimir, store metadata |
| Interactive card callback (`portfolio_update`) | Create or update the corresponding portfolio follow-up task and acknowledge |

## Portfolio Update Callback Routing

When a callback comes from a `portfolio_update` card:

1. Extract the `action`, `project_id`, actor, and any embedded link metadata.
2. Preserve the human's confirmed intent in Paperclip instead of treating the
   callback as free-form chat.
3. Route the action to `portfolio-agent` with enough context to continue work:
   project id, project name if present, action clicked, triggering employee,
   and any free-form response text.
4. If the button is informational only (`view_dashboard`, `details`,
   `view_plan`), prefer returning the link directly when one is available.
5. If the button requests state change (`schedule_followup`, `snooze_1_week`,
   `mark_complete`, `modify_plan`, `discuss`), create a Paperclip task for
   `portfolio-agent` and acknowledge that the request was queued.

## Error Handling

- Mimir API timeout (>5s): Reply "Memory system is slow, retrying..." and retry once.
- Mimir API error: Reply "Could not save to memory: [error]. Please try again."
- Paperclip API error: Reply "Could not create task: [error]. Please try again."
- Unknown intent: If context recovery found recent activity, ask a clarifying
  question that references that context. Otherwise, reply with guidance on
  available actions.
