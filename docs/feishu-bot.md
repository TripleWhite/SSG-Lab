# feishu-bot Usage Guide

## What Employees Can Do

- Send meeting notes, founder updates, articles, and files.
- Ask what the team already knows about a person, company, or topic.
- Ask the system to create sourcing, follow-up, portfolio, or matching work.
- Mention the bot in a group chat when a shared reply is useful.

## How The Bot Behaves

- 1:1 messages are processed directly.
- Group messages are processed only when the bot is `@` mentioned.
- The bot searches before storing so it does not create obvious duplicates.
- High-value information is stored as curated memory.
- Task-like requests are routed into Paperclip instead of being handled ad hoc in chat.
- Responses stay short and match the employee's language, Chinese or English.

## Good Message Examples

- `Just met Zhang Wei from DesignAI. Team of 4 in Shenzhen, 500 MAU, wants enterprise customers.`
- `What do we know about DesignAI?`
- `Find AI infra startups building inference optimization.`
- `Who can help a founder get AWS credits?`
- `Create a follow-up task for FinanceAI next Friday.`

## What The Bot Intentionally Ignores

- Casual greetings and routine acknowledgements.
- Repeated information that is already stored.
- System configuration discussions.
- Ambiguous fragments with no recoverable context.

## Files And Attachments

- Files and screenshots are expected to be uploaded to Mimir and stored with metadata.
- If the memory backend is unavailable, the bot should answer with a clear retry message instead of pretending the save worked.

## Current Operational Notes

- The shipped Feishu channel uses websocket mode, not public webhooks.
- Group-chat replies require mention-based targeting to avoid noise.
- Resource-graph answers are only as good as the current seed data. The checked-in seed file is still placeholder content until SSG replaces it with real relationships.
