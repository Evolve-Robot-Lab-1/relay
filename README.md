# Relay

**Live demo:** [https://relay.durgaai.com](https://relay.durgaai.com)  
**Tagline:** Say it better.

Relay is a human-controlled communication representative. A user privately explains what they want; Relay understands the goal, drafts a clear message in a chosen tone, and shares nothing until the user approves. The other person joins through a secure invite link. Private instructions stay private; both sides stay in control of commitments.

## OpenAI Build Week — Codex & GPT-5.6

Judges: this section is the required highlight of how **Codex** and **GPT-5.6** were used.

### Codex (primary build agent)

Codex was used as the main coding partner to build and harden Relay during Build Week:

- Map and reconstruct a fast-moving Cloudflare Workers + Durable Object codebase (`server.ts`, `backend.ts`, `ui.ts`)
- Design the conversation-state model (intent → draft → approve → invite → join → outcome)
- Implement secure single-use invite claiming and participant-specific private/shared serialization
- Build and debug real-time WebSocket sync between two participants
- Improve mobile-responsive UI and simplify invite-ready / goal / status chrome
- Add regression and smoke tests (`tests/`), including meeting-demo flows
- Recover from a broken production deploy with rollback, local-first checks, then verified production release
- Author Build Week docs (`RELAY_BUILD_WEEK.md`, `DEVPOST.md`) and keep an operational session record

### GPT-5.6

**GPT-5.6 was used through Codex sessions** for product reasoning and implementation work: goal/intent framing, approval and trust-boundary design, draft-prompt and validation strategy, UX simplification decisions, and edge-case review (false agreement, private-intent leakage, invite races).

**Production message drafting** is intentionally provider-routed so a free-tier outage cannot silently send private text. Live drafting currently uses **Groq** (`openai/gpt-oss-120b` / `openai/gpt-oss-20b` with sticky multi-key rotation) and **Cloudflare Workers AI** as fallback. The architecture can add OpenAI GPT-5.6 as a primary or independent drafting path without changing the Human → Representative → Representative → Human approval model.

Relay never silently books meetings, accepts prices, or treats silence/proposals as confirmation. Humans approve outbound messages and real-world next steps.

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

1. Open Relay and privately describe the intent.
2. Relay extracts a short **Goal** (and details like **Date:**) and drafts a message.
3. Choose tone (Professional / Friendly / Direct / Casual), review, and **approve**.
4. Share the secure invite link with one other participant.
5. Both sides continue the conversation; Relay tracks outcome toward goal reached, declined, or closed.
6. Private originals stay visible only to their author; only approved text is shared.

## Conversation Rule

Relay improves the user's conversation. It understands intent, improves wording, applies the selected tone, protects private thoughts, and keeps replies concise and natural without losing important meaning.

A clear result may be an agreement, answer, clarification, rejection, delivered request, communicated boundary, or closed conversation. Relay helps the conversation progress without forcing an outcome. Mutual confirmation appears only for an actual shared commitment; agreement is not the default destination.

Relay never invents facts, promises, commitments, consent, or enthusiasm. It never exposes a private instruction. Tone changes wording only, never meaning. With Representative OFF, Relay sends the user's exact words.

## Features

- Frictionless profile creation with an optional cross-device recovery code
- AI-assisted drafting with selectable tone
- One-time first-message approval with a tone that stays fixed for the conversation
- Per-conversation Representative ON/OFF control
- Private and shared conversation views
- Single-use, two-person invite links and permanent contacts
- Sender-only message deletion synchronized in real time
- Resolve, close, and conditional commitment-confirmation outcomes
- Durable Object-owned real-time WebSocket updates
- Durable Object persistence with legacy KV compatibility

## Stack

- TypeScript on **Cloudflare Workers**
- **Durable Objects** (SQLite) for authoritative conversation state
- WebSockets for real-time sync
- Workers KV (legacy read compatibility)
- Groq + Workers AI for drafting (see Build Week section above)
- Wrangler for local/dev/deploy

## Files

- `RELAY_BUILD_WEEK.md` - product vision, Build Week narrative, demo plan, submission copy, risks, and roadmap
- `DEVPOST.md` - paste-ready Devpost / Build Week project description
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

Production: [https://relay.durgaai.com](https://relay.durgaai.com)  
Worker: https://agent-network.salesagent.workers.dev

## Verify

```bash
npm run check

# With npm run dev active in another terminal
npm run test:e2e -- http://127.0.0.1:8787
npm run test:browser -- http://127.0.0.1:8787
```
