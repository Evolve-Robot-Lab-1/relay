# Relay Session Save

Last updated: 2026-07-19 (Asia/Kolkata)

## Production

- Primary URL: https://relay.durgaai.com
- Worker URL: https://agent-network.salesagent.workers.dev
- Cloudflare Worker: `agent-network`
- Active version: `21b72cd9-fd3b-4084-99a3-0ea6e9135bdf`
- Git commit: `1edff79` (`fix: preserve intent and strengthen draft tones`)
- Short-invite commit: `f9294a1` (`feat: shorten secure conversation invites`)
- Drafting release tag: `production-relay-drafting-v1-2026-07-18` (`7a1f145`)
- Incident rollback version: `bac11794-b4bc-4d15-a83e-05c3b37c5816`

### Drafting Release

- The 2026-07-19 drafting release is active in production. Wrangler now uses the renewed Cloudflare OAuth login; the old API token is invalid.
- Drafting preserves unstated currencies, explicit currency kinds, attached-unit numbers such as `14k`, time qualifiers, disagreement polarity, boundaries, and cancellation intent.
- Professional, Friendly, Direct, and Casual now have distinct guidance and validation. Tone-only retries can use a conservative, meaning-checked restyle of the last approved draft when providers are temporarily unavailable.
- Groq remains primary (`openai/gpt-oss-120b`, then `openai/gpt-oss-20b`), with Workers AI as fallback. Provider quota exhaustion is detected so unavailable models are skipped during a request.

## Product Rule

Relay improves communication without forcing agreement. It preserves intent, applies the selected tone, protects private instructions, and keeps approved messages short and natural.

A conversation result may be an agreement, answer, clarification, rejection, delivered request, communicated boundary, or closure. Resolve and Close are general outcomes. Both participants see Confirm details only when Relay classifies the result as a mutual commitment.

## Build Week Documentation

- `RELAY_BUILD_WEEK.md` is the source document for Relay's product vision, problem, user flow, AI behavior, privacy model, architecture, differentiation, demo story, judging alignment, submission copy, metrics, risks, and roadmap.
- OpenAI Build Week lists July 21, 2026 as the submission deadline and evaluates technical implementation, design and user experience, potential impact, and idea quality.
- Relay was built and hardened with Codex. Production inference currently uses Groq and Workers AI, not the OpenAI API; the submission must state this accurately.
- The highest-priority hackathon decision is whether to add and evaluate GPT-5.6 as the primary generator or an independent fallback before submission.

## Product Freeze And User Study

- Effective 2026-07-19, Relay is under a feature freeze while real users test the MVP.
- Do not add product features or make speculative workflow and UI changes.
- The only planned engineering work is adding AI model capacity/reliability and privacy-safe operational logging.
- Collect onboarding friction, draft quality failures, invite completion, reply completion, and direct user feedback without storing private message content.
- Product changes after the freeze must be justified by repeated user evidence, not isolated preference or untested assumptions.

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
- A new participant sees a focused Join conversation popup and must save a name before the invite is claimed. A translucent conversation-shaped waiting state appears behind it without exposing the actual request.

## Conversation Guarantees

- Invite URLs contain a high-entropy secret and are atomically claimed by one authenticated participant.
- Conversations have exactly two participant slots; third-party claims return no metadata.
- Private instructions are serialized only to their owner.
- The first outbound message is approved once with a selected tone. Later replies keep that tone and auto-send without another approval card.
- No invite exists before the first message is approved. During approval, Share, Remove, and Delete for all are hidden; approving creates the one-time link and immediately opens Share or copies the urgent invite.
- Unapproved direct-contact drafts do not appear for the recipient. Discarding an opening draft deletes the empty conversation.
- Shared messages use stable IDs. Only the sender can delete one, and deletion is pushed to both participants.
- Conversation uses one default view. Private originals are labeled `Only you can see this`; an optional eye action opens a temporary read-only preview with private text and controls removed.
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
9. Focused invite-name popup opening the intended conversation on desktop and mobile.
10. Approval-before-share, rejected premature rotation, and no pre-approval direct-contact visibility.
11. Single conversation view, private labels, read-only shared preview, and preview exit on desktop and mobile.
12. Temporary test conversations deleted after verification.

The generated browser JavaScript is parsed separately before every dry-run build to prevent template-escaping regressions.

The 2026-07-19 drafting release also passed locally and in production:

1. The strict draft-quality suite for intent, speaker attribution, polarity, boundaries, cancellation, numbers, time, and currency preservation.
2. Clearly distinct Professional, Friendly, Direct, and Casual drafts without changing meaning.
3. Final local and production end-to-end runs covering recovery, all four tones, invites, privacy, contacts, blocking, deletion, results, Representative modes, and conversation removal.
4. `npm run check`, including generated-client syntax validation and a Wrangler dry-run build.

Repeated AI stress runs exhausted Cloudflare's free daily Workers AI allocation and temporarily reached Groq rolling limits. The application fails closed instead of sending private text when every provider is unavailable. A further REST model can be added later as an independent capacity fallback once its endpoint, model, authentication, limits, and data-retention terms are known.

## Short Invite Links

New invite links use `https://relay.durgaai.com/i/<token>`, where the token is a 22-character, 128-bit random value. Existing `?invite=<goal-id>.<secret>` links remain supported.

- The URL does not expose the internal conversation ID.
- Only the token's SHA-256 hash is stored in the invite mapping.
- The first successful claim atomically invalidates the link.
- Rotation and conversation deletion invalidate and remove the active mapping.
- Simultaneous claims are serialized by conversation, including mixed legacy/new claims.
- Native Share uses `Your response is needed. Join our private Relay conversation.` with the URL as a separate field. Clipboard fallback copies only the short URL.

Opening a short link shows the Relay header, a privacy-safe conversation waiting state, and the Join conversation name popup. After the name is saved, Relay claims the invite and opens that conversation directly.

## Next Onboarding Priorities

1. Hide the `Start with` selector when a profile has no contacts; the only available path is already a secure invite.
2. Keep recovery setup after the first useful conversation so it does not interrupt creating, approving, sharing, or joining.

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
