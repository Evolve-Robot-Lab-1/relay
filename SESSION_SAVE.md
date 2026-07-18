# Relay Session Save

Last updated: 2026-07-18 (Asia/Kolkata)

## Production

- URL: https://agent-network.salesagent.workers.dev
- Cloudflare Worker: `agent-network`
- Active version: `f364ce9d-ef27-43ed-90b1-d7c3b851823f`
- Release marker: `outcome-v1.1`
- Previous outcome release: `d2f7acff-3fd4-4ad0-8cf3-dc4e1c40b4dc`
- Pre-MVP rollback version: `6144d619-f60a-4e64-bcf6-847782fd7099`
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
- `AI` uses `@cf/meta/llama-3.1-8b-instruct-fp8`.

## Identity And Recovery

- A high-entropy profile and private recovery code are created without signup.
- Only the SHA-256 recovery secret hash is stored server-side.
- The recovery code restores the same profile, contacts, and conversations on another device.
- Chrome or Gmail profile sync is not treated as authentication; the recovery code is required across devices.
- A browser carrying a legacy `aid` can claim that identity once and preserve its old records.

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

## Commands

```bash
npm ci
npm run check
npm run dev
npm run test:e2e -- http://127.0.0.1:8787
npm run deploy
```
