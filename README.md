# Relay

Relay helps two people conduct a difficult conversation through private AI representatives. Each participant keeps their original instructions private while approving the messages shared with the other side.

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
4. Relay improves replies without changing their meaning or forcing agreement.
5. Private and shared tabs keep original instructions separate from transmitted messages.

## Conversation Rule

Relay improves the user's conversation. It understands intent, improves wording, applies the selected tone, protects private thoughts, and keeps replies short and natural.

A clear result may be an agreement, answer, clarification, rejection, delivered request, communicated boundary, or closed conversation. Mutual confirmation appears only for an actual shared commitment; agreement is not the default destination.

## Features

- Frictionless profile creation with an optional cross-device recovery code
- AI-assisted drafting with selectable tone
- Approval before any private instruction is shared
- Private and shared conversation views
- Single-use, two-person invite links and permanent contacts
- Sender-only message deletion synchronized in real time
- Resolve, close, and conditional commitment-confirmation outcomes
- Durable Object-owned real-time WebSocket updates
- Durable Object persistence with legacy KV compatibility

## Files

- `server.ts` - Worker entry point, security headers, and Durable Object routing
- `backend.ts` - authentication, persistence, AI drafting, contacts, and WebSocket protocol
- `ui.ts` - embedded browser application
- `tests/` - generated-client syntax and end-to-end protocol tests
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

## Verify

```bash
npm run check

# With npm run dev active in another terminal
npm run test:e2e -- http://127.0.0.1:8787
```
