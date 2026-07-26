# Relay

**Live demo:** [https://relay.durgaai.com](https://relay.durgaai.com)  
**Headline:** Know what to say. Anywhere on the web.

Relay is a browser copilot that understands the user's goal and focused context, then helps write the right message, reply, prompt, or form response inside the website already being used. The recipient never needs to join Relay. The user reviews every draft; Relay never sends automatically.

Relay also includes **Quick Relay** for the moment before a user sends a prompt or message. Open `/write`, type naturally, choose whether the recipient is an AI or a person, and copy the clearer version. Quick Relay requires no profile, does not send on the user's behalf, and does not persist message content.

The earlier shared Relay conversation protocol remains available as an optional experiment for negotiations or agreements that require both parties. It is not required by the browser copilot.

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

### Browser copilot

1. Focus a writing field on a website and choose the small **Relay** chip.
2. Select the goal: Reply, Follow up, Ask, Decline, Negotiate, Explain, Improve prompt, or Fill this field.
3. Relay uses the current draft, deliberately selected text, and a limited nearby excerpt to create a preview.
4. Choose **Insert**, **Copy**, or **Try another tone**. Relay never presses Send.
5. When the website receives a response, open Relay again to work from the latest focused context.

### Quick Relay

1. Open [relay.durgaai.com/write](https://relay.durgaai.com/write) on desktop or mobile.
2. Write a half-formed thought and choose **An AI** or **A person**.
3. Relay makes it clear while preserving the user's meaning and voice.
4. Review and copy it. Relay never presses Send.

The web app is installable on a phone from the browser's **Add to Home Screen** action. The Chromium extension in [`extension/`](./extension/) provides the goal-aware copilot across HTTP and HTTPS websites.

### Private conversations

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

- Profile-free Quick Relay at `/write`
- Installable mobile web app with `/write` as its start screen
- Manifest V3 browser copilot for writing-oriented fields across the web
- Eight goal-driven writing actions with focused context and explicit preview
- Insert, Copy, three-tone cycling, exact Undo, and no automatic sending
- Stateless compose and message-refinement endpoints with rate-limit controls
- Message-free anonymous usage events through Workers Analytics Engine
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

## Growth & store rollout

- Waitlist: [https://relay.durgaai.com/waitlist](https://relay.durgaai.com/waitlist)
- Pricing: [https://relay.durgaai.com/pricing](https://relay.durgaai.com/pricing)
- Partners: [https://relay.durgaai.com/partners](https://relay.durgaai.com/partners)
- Privacy / Support: `/privacy`, `/support`
- Use cases: `/use/whatsapp`, `/use/linkedin`, `/use/chatgpt`
- Playbooks: [`docs/GROWTH.md`](./docs/GROWTH.md), [`docs/PARTNERS.md`](./docs/PARTNERS.md), [`docs/PRICING.md`](./docs/PRICING.md)
- Store package: `npm run extension:package` → `dist/relay-extension.zip`
- Trust gate: [`extension/TRUST_GATE.md`](./extension/TRUST_GATE.md)

## Files

- `RELAY_BUILD_WEEK.md` - product vision, Build Week narrative, demo plan, submission copy, risks, and roadmap
- `DEVPOST.md` - paste-ready Devpost / Build Week project description
- `server.ts` - Worker entry point, security headers, and Durable Object routing
- `backend.ts` - authentication, persistence, AI drafting, contacts, waitlist/partners/plan quotas, and WebSocket protocol
- `ui.ts` - embedded browser application
- `extension/` - installable Chromium extension, privacy disclosure, and store listing copy
- `docs/` - global growth, partnership, and pricing playbooks
- `public/` - PWA manifest, marketing pages, and icons
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
npm run test:growth
npm run extension:package
npm run test:quick:local
npm run test:quick:local -- --ai  # includes one live model call
npm run test:quick:production -- --ai
npm run test:quick:browser

# With npm run dev active in another terminal
npm run test:e2e -- http://127.0.0.1:8787
npm run test:browser -- http://127.0.0.1:8787
```
