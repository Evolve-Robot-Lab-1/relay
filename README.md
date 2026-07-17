# Relay

Relay helps two people conduct a difficult conversation through private AI representatives. Each participant keeps their original instructions private while approving the messages that are shared with the other side.

## Quick Start

```bash
# Install exactly from the lockfile
npm ci

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## How It Works

1. Open Relay and enter the conversation objective.
2. Relay drafts the first message for approval.
3. Share the generated conversation link with the other participant.
4. Each participant can use representative mode or communicate directly.
5. Private and shared tabs keep original instructions separate from transmitted messages.

## Features

- Anonymous local identity with no account signup
- AI-assisted drafting with selectable tone
- Approval and direct-reply modes
- Private and shared conversation views
- Shareable conversation links and saved contacts
- Real-time WebSocket updates with polling fallback
- Durable Object persistence with legacy KV compatibility

## Files

- `server.ts` - Worker, Durable Object, WebSocket protocol, API routes, and browser client
- `wrangler.toml` - Cloudflare config
- `package.json` / `package-lock.json` - scripts and pinned dependencies
- `SESSION_SAVE.md` - production state, incident recovery, and verification notes

## Deploy

```bash
# Authenticate once, then deploy
npx wrangler login
npm run deploy
```

Production: https://agent-network.salesagent.workers.dev
