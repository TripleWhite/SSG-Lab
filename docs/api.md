# API Surface

This file documents the API surface that the current repo actually serves or calls during Phase 1 and the dashboard integration work.

## Next.js Routes In This Repo

### `GET /api/auth/feishu`

- Starts Feishu OAuth when `code` is absent.
- Sets a signed `ssg_oauth_state` cookie before redirecting to Feishu.
- Exchanges the Feishu code for a user session when `code` is present.
- Fetches the Feishu user profile and sets a signed `ssg_session` cookie on success.
- Redirects back to the requested `next` path after a successful login.
- Redirects to `/login?error=...` when Feishu auth is not configured, the OAuth state is invalid, or token exchange fails.

Required auth inputs:

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Optional role mapping: `BOARD_FEISHU_OPEN_IDS` as a comma-separated list of Feishu open IDs or emails that should receive board access.
- Feishu app security settings must allow the callback URL `https://dash.ssgaccelerator.com/api/auth/feishu`.

Production verification on `2026-03-31`:

- `GET https://dash.ssgaccelerator.com/api/auth/feishu` returned `307` to Feishu authorize.
- The response set `ssg_oauth_state` with `HttpOnly`, `Secure`, and `SameSite=Lax`.

### `POST /api/auth/logout`

- Clears the current session cookie.
- Clears the OAuth state cookie if it still exists.
- Redirects back to `/login` with `303 See Other`.

## External Services This App Calls

### Feishu Open Platform

Browser redirect and server-side auth flow:

- Browser redirect target: `GET https://open.feishu.cn/open-apis/authen/v1/authorize?...`
- Server token bootstrap: `POST https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/`
- Server OIDC exchange: `POST https://open.feishu.cn/open-apis/authen/v1/oidc/access_token`
- Server profile fetch: `GET https://open.feishu.cn/open-apis/authen/v1/user_info`

Runtime behavior:

- `GET /api/auth/feishu` now mints an `app_access_token` first, then uses `Authorization: Bearer <app_access_token>` for the OIDC code exchange.
- The dashboard still requires `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`; the extra Feishu hop is internal to the route handler.
- The deployed login page links directly to `/api/auth/feishu`, so the browser follows the server redirect to Feishu without a client-side navigation hop.

### Paperclip Control Plane

- Base URL: `PAPERCLIP_API_URL` or `http://localhost:3000`
- Auth: `Authorization: Bearer $PAPERCLIP_API_KEY`
- Public board health check: `GET https://board.ssgaccelerator.com/api/health`
- On-host health check: `GET http://127.0.0.1:3100/api/health`
- Required env:
  - `PAPERCLIP_API_URL`
  - `PAPERCLIP_API_KEY`
  - `PAPERCLIP_COMPANY_ID`

Confirmed paths used by the current dashboard code:

- `GET /api/companies/{companyId}/dashboard`
- `GET /api/companies/{companyId}/agents`
- `GET /api/companies/{companyId}/projects`
- `GET /api/companies/{companyId}/issues?projectId={projectId}`
- `GET /api/companies/{companyId}/heartbeat-runs?limit={limit}`
- `GET /api/companies/{companyId}/costs/by-agent`

Caching behavior:

- Dashboard fetches revalidate every 30 seconds by default.
- Agents page fetches can override revalidation to 15 seconds.
- Paginated fetches request pages of 100 items at a time.
- Operational verification after Caddy proxy or service-user changes should use `https://board.ssgaccelerator.com/api/health`.

Current feed gaps:

- `getSourcingResults()` currently returns an empty array in `src/lib/paperclip.ts`.
- `getMatches()` currently returns an empty array in `src/lib/paperclip.ts`.
- `/sourcing` and `/matching` intentionally show honest empty states until a live record source is wired.

### Mimir API

- Base URL: `MIMIR_API_URL` or `https://api.allinmimir.com`
- Auth: `Authorization: Bearer $MIMIR_API_KEY`
- Required env:
  - `MIMIR_API_URL`
  - `MIMIR_API_KEY`
  - `MIMIR_USER_ID`

Confirmed read paths used by the current dashboard code:

- `GET /api/v1/search?user_id=...&query=...&method=full&limit=20`
- `GET /api/v1/search?user_id=...&query=resource%20connection%20mentor%20LP%20partner&types=entity&method=full&limit=100`

Operational Mimir paths used by the deployed OpenClaw + `memory-mimir` runtime:

- `POST /api/v1/ingest/note`
- `POST /api/v1/search`
- `POST /api/v1/graph/traverse`
- `POST /api/v1/files/upload`

Runtime behavior:

- If `MIMIR_API_KEY` is missing or search returns no entities, the dashboard falls back to the checked-in seed graph from [`data/resource-graph-seed.json`](../data/resource-graph-seed.json).
- The deployed `memory-mimir` runtime can send `confidence` and `source` as client-side ingest hints, but the live EC2-A deployment does **not** require new Mimir server columns or a schema migration. Importance-based ranking remains the active behavior.

### OpenClaw Gateway

- The Next.js app does not call OpenClaw directly.
- Operational health is still checked at `http://127.0.0.1:18789/openclaw/`.
- Paperclip reaches OpenClaw through the `openclaw_gateway` adapter rather than through browser-side fetches.
