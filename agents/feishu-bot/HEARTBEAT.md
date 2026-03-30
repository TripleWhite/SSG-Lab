# feishu-bot — Heartbeat Procedure

The feishu-bot does NOT run on scheduled heartbeats. It runs in **reactive mode** — triggered by incoming Feishu messages (WebSocket events).

## Message Processing Flow

On every incoming Feishu message:

1. **Parse message** — Extract text, sender, chat type (1:1 vs group), attachments.
2. **Group chat filter** — In group chats, only process if @mentioned.
3. **Intent classification** — Determine: capture, search, task creation, or conversation.
4. **Search before store** — If capturing, search Mimir first to check for existing entities.
5. **Execute action** — Store memory, search memory, create Paperclip task, or reply.
6. **Acknowledge** — Send concise confirmation back to Feishu.

## Feishu Event Types

| Event | Action |
|-------|--------|
| im.message.receive_v1 (1:1) | Process message, full intent classification |
| im.message.receive_v1 (group, @mentioned) | Process message, full intent classification |
| im.message.receive_v1 (group, not mentioned) | Ignore |
| File/image attachment | Upload to Mimir, store metadata |

## Error Handling

- Mimir API timeout (>5s): Reply "Memory system is slow, retrying..." and retry once.
- Mimir API error: Reply "Could not save to memory: [error]. Please try again."
- Paperclip API error: Reply "Could not create task: [error]. Please try again."
- Unknown intent: Reply with guidance on available actions.
