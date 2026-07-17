# Relay Session Save

Last updated: 2026-07-18 (Asia/Kolkata)

## Production

- URL: https://agent-network.salesagent.workers.dev
- Cloudflare Worker: `agent-network`
- Active version: `6144d619-f60a-4e64-bcf6-847782fd7099`
- Emergency rollback version: `bac11794-b4bc-4d15-a83e-05c3b37c5816`

## Current Architecture

- `server.ts` contains the Worker, WebSocket protocol, AI drafting, API routes, and embedded browser client.
- `RELAY_STORE` is a SQLite-backed Durable Object and owns all new writable state.
- `AGENTS_KV` is retained as a read-only fallback for records created before the Durable Object migration.
- `AI` uses `@cf/meta/llama-3.1-8b-instruct-fp8` for message drafting.
- The browser uses WebSocket push when available and a 2-second poll as fallback.

## Incident And Recovery

The production rewrite initially contained invalid generated browser JavaScript and an undefined polling renderer. After those were repaired, Generate Link still failed because the Cloudflare KV daily write quota had been exhausted. The Worker attempted both its normal save and fallback save against KV, then returned no WebSocket response.

The recovery completed these changes:

- Repaired generated JavaScript escaping and browser script startup.
- Added missing `/api/threads` and `/api/contacts` routes.
- Prevented overlapping poll requests and pushed fresh thread snapshots through WebSocket.
- Migrated writable state from KV to a SQLite-backed Durable Object.
- Preserved legacy KV reads so existing users and conversations remain available.
- Added tombstones so deleted legacy records do not reappear.
- Deduplicated name writes and reduced polling from 500 ms to 2 seconds.
- Added Generate Link loading, timeout, and visible error states.
- Removed the orphaned `G89264f` entry from agent `A6101`.

## Verification

The deployed production flow was tested end to end:

1. WebSocket returns `welcome`.
2. Generate Link returns `goal-created` with a share URL.
3. `/api/poll` returns the persisted pending draft.
4. Goal deletion succeeds and the following poll returns `404`.
5. The temporary verification records were deleted.

## Local Development

```bash
npm ci
npm run dev
```

Wrangler local mode does not fully emulate the remote Workers AI binding. The raw-message fallback still allows the storage and WebSocket flow to be tested locally.

## Deployment

```bash
npx wrangler login
npm run deploy
```

After deployment, verify the version ID, the production page, `/api/threads`, `/api/contacts`, and one complete Generate Link transaction.
