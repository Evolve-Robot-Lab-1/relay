# Relay Session Save

Last updated: 2026-07-18 (Asia/Kolkata)

## Production

- Primary URL: https://relay.durgaai.com
- Worker URL: https://agent-network.salesagent.workers.dev
- Cloudflare Worker: `agent-network`
- Active version: `06659b8f-fb82-47b2-9c7b-a43be912d1f3`
- Git commit: `07cd2b1` (`Require a name before claiming invites`)
- Drafting release tag: `production-relay-drafting-v1-2026-07-18` (`7a1f145`)
- Incident rollback version: `bac11794-b4bc-4d15-a83e-05c3b37c5816`

## Product Rule

Relay improves communication without forcing agreement. It preserves intent, applies the selected tone, protects private instructions, and keeps approved messages short and natural.

A conversation result may be an agreement, answer, clarification, rejection, delivered request, communicated boundary, or closure. Resolve and Close are general outcomes. Both participants see Confirm details only when Relay classifies the result as a mutual commitment.

## Architecture

- `server.ts` serves the nonce-protected client and forwards API/WebSocket traffic to one Durable Object.
- `backend.ts` owns recovery authentication, profiles, goals, contacts, blocks, AI drafting, and all WebSocket mutations.
- `ui.ts` is a DOM-safe browser client with no dynamic `innerHTML` or inline event handlers.
- `RELAY_STORE` is the SQLite-backed Durable Object and owns all writable state.
- `AGENTS_KV` remains a read-only fallback for legacy records.
- Drafting uses Groq first (`openai/gpt-oss-120b`, then `openai/gpt-oss-20b`) with Workers AI models as fallbacks.
- Draft output is checked for meaning preservation, privacy leakage, and excessive length before it can be shared.

## Identity And Recovery

- A high-entropy profile and private recovery code are created without signup.
- Only the SHA-256 recovery secret hash is stored server-side.
- The recovery code restores the same profile, contacts, and conversations on another device.
- Chrome or Gmail profile sync is not treated as authentication; the recovery code is required across devices.
- A browser carrying a legacy `aid` can claim that identity once and preserve its old records.
- A new participant must choose and save a name before an invite can be claimed. Unnamed profiles never enter a conversation.

## Conversation Guarantees

- Invite URLs contain a high-entropy secret and are atomically claimed by one authenticated participant.
- Conversations have exactly two participant slots; third-party claims return no metadata.
- Private instructions are serialized only to their owner.
- The first outbound message is approved once with a selected tone. Later replies keep that tone and auto-send without another approval card.
- Shared messages use stable IDs. Only the sender can delete one, and deletion is pushed to both participants.
- Remove hides a conversation for one profile. Delete for all is creator-only.
- Contacts are server-authoritative, survive recovery, and support Remove, Block, and Unblock.
- Legacy self-contact records are removed automatically.
- Mutations are serialized per conversation to prevent concurrent claim or reply overwrites.

## Verification

Both local and production end-to-end suites passed on the active release:

1. Recovery profile creation, restore, and authenticated bootstrap.
2. Owner-only private instructions.
3. Simultaneous invite claims with exactly one winner.
4. Permanent contacts for both participants and generic third-party denial.
5. First-card tone selection, fixed conversation tone, and automatic later replies.
6. Real-time sender deletion on both clients.
7. Result resolution, conditional confirmation, and reopening.
8. Remove for me and creator delete for everyone.
9. Temporary test conversations deleted after verification.

The generated browser JavaScript is parsed separately before every dry-run build to prevent template-escaping regressions.

## Proposed Short Invite Links (Not Implemented)

Current invite links use `?invite=<goal-id>.<secret>` and continue to work.

The proposed format is `https://relay.durgaai.com/i/<token>`, where `<token>` is a 22-character, 128-bit random value. The token would remain one-time and first-claimant-only. Only its SHA-256 hash would be stored, and old query-string invite links would remain supported.

Expected user impact:

- Links become substantially shorter and no longer expose the internal conversation ID.
- Opening the link still shows the required name step before joining.
- The first successful claim invalidates the link exactly as it does now.
- Existing links and active conversations are not migrated or broken.
- Relay can use the browser's native Share sheet when available, with Copy link as the fallback.

Implementation requirements before production: serve `/i/<token>` as the app shell, resolve token hashes to conversations, serialize simultaneous claims by token, remove mappings after claim/rotation/deletion, preserve legacy invite handling, and pass local E2E plus browser tests.

## Commands

```bash
npm ci
npm run check
npm run dev
npm run test:e2e -- http://127.0.0.1:8787
npm run deploy
```

## OpenCode NVIDIA Models

- OpenCode version: `1.18.3`.
- Global config: `~/.config/opencode/opencode.json` (mode `600`).
- Backup before the NVIDIA fix: `~/.config/opencode/opencode.json.bak-20260718`.
- NVIDIA credential remains in OpenCode's protected credential store at `~/.local/share/opencode/auth.json`; no secret was copied into the config or shell profile.
- Permanent model-list entries:
  - `nvidia/moonshotai/kimi-k2.6`
  - `nvidia/z-ai/glm-5.2`
- The empty `{env:NVIDIA_API_KEY}` override was removed so OpenCode uses its stored NVIDIA credential.
- Kimi has a local `beta` status override only to keep it visible in OpenCode because OpenCode/NVIDIA metadata marks the hosted endpoint deprecated.

### Current Provider Status

- NVIDIA's free hosted Kimi K2.6 production route is unavailable/deprecated. It appears in the catalog but calls return `Function not found for account`; this is not a local authentication problem.
- NVIDIA GLM 5.2 authentication works, but the free endpoint is currently slow and rate-limited. Local logs contain HTTP `429`, recent calls waited roughly 55–110 seconds, and a direct diagnostic connected immediately but returned no data before a 45-second timeout.
- For a fresh, smaller OpenCode context, run `/new`. Avoid concurrent requests after a `429` and wait before retrying.
- Reliable Kimi alternatives: connect Moonshot AI directly or use OpenRouter. Reliable GLM alternative: connect Z.AI directly or use OpenRouter.
