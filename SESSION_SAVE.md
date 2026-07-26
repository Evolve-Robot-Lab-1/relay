# Relay Session Save

## Session: 2026-07-22 DurgaMail Hostinger integration

- DurgaMail repository: `/home/evolve/AI PROJECT/Gmail_integeration`.
- Added local Hostinger IMAP/SMTP support for `contact@evolverobot.in`.
- Added process-only mailbox secrets, IMAP parsing, threaded replies, account selector, campaign sender allowlists, suppression/deduplication, terminal CLI, investor drafts, and tests.
- Existing accounts remain under business `default`: `evolverobotlabindia@gmail.com` (default) and `evolverobotlab@gmail.com`; contact@ is SMTP/IMAP and non-default.
- Contact mailbox configuration is saved in `campaign_analytics.db`; password is not stored. Backup before adding contact: `/tmp/durgamail-db-before-contact.bak`.
- Live Hostinger SMTP and IMAP authentication succeeded using the user-provided password. Do not repeat or persist that password; rotate it because it was pasted into chat.
- DurgaMail is currently running unlocked on `http://127.0.0.1:5003` in terminal session `1752`; port 5002 was occupied by another process.
- Read-only unread scan returned 25 messages. No credible investor reply was found. Latest actionable message: Vanessa Chen, subject `Re: Quick question on PCBA approach`, asking whether PCBA is in-house or outsourced. Do not reply until the user confirms the factual answer.
- Investor campaign draft files: `uploads/investor_subject.txt`, `uploads/investor_body.txt`; attachment source is `uploads/documents/anonymous_-_Durga_AI_Investor_Memo_v3.pdf` and terminal sends it as `Durga_AI_Investor_Memo.pdf`.
- First campaign defaults to contact@ only, strict investor CSV (23 valid unique leads), 3-email pilot, 120-second interval, explicit confirmation before send. No campaign or reply has been sent.
- Local usage guide: `DURGAMAIL_LOCAL_MAIL.md`; CLI: `durgamail_cli.py`.
- Verification passed: 5 focused tests, Python syntax, JavaScript syntax, Flask route smoke test, SMTP/IMAP live authentication, and read-only inbox fetch.
- To resume: verify session 1752 is still running; open `http://127.0.0.1:5003/inbox`. If the password is rotated, stop/restart `durgamail_cli.py serve --port 5003` and enter the new password through hidden input.

Last updated: 2026-07-22 (Asia/Kolkata)

## Session: 2026-07-22 user-testing hardening

### Drafting and tone

- Draft fact validation remains fail-closed for amounts, currencies, dates, times, boundaries, cancellations, and speaker ownership.
- Tone restyling now compares Professional, Friendly, and Casual drafts across the full approval-card history, rather than only against the immediately previous draft.
- A validated deterministic tone fallback runs after repeated unsafe model candidates so tone changes remain responsive without weakening meaning checks.
- The full live draft-quality matrix passed, including four visibly distinct tones and contextual-reply attribution.

### Goal update validation

- A single participant can no longer propose and confirm the same meeting by themselves.
- Confirmation must come from the other participant and match the current proposal.
- A changed date or time is treated as a counterproposal and remains `Proposed` until the other participant confirms it.
- Date/time displays now follow the latest proposal instead of the first time mentioned.
- Deleted confirmations are ignored; explicit unavailability remains `Declined`.
- Date and time indicators remain proposed until peer confirmation, then become confirmed.

### Verification

- `npm run test:goals` passed.
- `npm run check` passed (generated client syntax plus Wrangler dry run).
- `npm run test:e2e -- http://127.0.0.1:8793` passed.
- `npm run test:browser -- http://127.0.0.1:8793` passed after synchronizing stale assertions with the current routed conversation UI.
- `npm run test:drafts -- http://127.0.0.1:8793` passed after the final tone-fallback change.
- Deployed to production on 2026-07-22 from commit `a04170c`.
- Cloudflare Worker version: `d0c90000-772a-40af-8c6b-c00abbf981cb`.
- Production URLs: `https://relay.durgaai.com` and `https://agent-network.salesagent.workers.dev`.
- Both production health endpoints returned HTTP 200.
- Production API/WebSocket E2E and production browser E2E passed; temporary test conversations were cleaned up.

### Next phase: controlled user testing

1. Invite 5–10 testers to use `https://relay.durgaai.com` in real two-person conversations.
2. Cover three trust scenarios: arranging a meeting with a counterproposal, asking for money, and declining or setting a boundary.
3. Ask testers to try at least two tones and verify that their private wording is never shown to the recipient.
4. Record only safe product feedback: draft accuracy, tone fit, edits before approval, incorrect goal status, confusion, and invite/realtime failures. Do not collect private message text by default.
5. Treat invented facts, privacy leakage, false `Agreed` status, or failed approval/invite flows as release-blocking issues.
6. Run one fix-and-retest cycle, then begin the first connector: **Remind Me**. Follow with Google Calendar, then Google Meet, and only afterward the application/form agent.

## Session: 2026-07-22 hackathon video and submission

### Final video

- Final master: `/home/evolve/agent-network/video/output/relay-hackathon-final.mp4`
- Clean thumbnail: `/home/evolve/agent-network/video/output/relay-hackathon-final-thumbnail.jpg`
- YouTube: https://youtu.be/qs3XnxvhFiU
- Duration: `00:01:40.910`
- Delivery: 1920×1080, 30 fps, H.264 High Profile, stereo AAC at 48 kHz
- Final narration loudness: `-16.0 LUFS`, `-1.5 dBTP`
- Video SHA-256: `1edc88923c1081b32064ee769979ba03463b7bc4d2a8ec0521103699a364d0dc`
- Full decode, visual contact-sheet review, caption alignment, and loudness verification passed.
- The proposal → peer confirmation → agreed sequence excludes the raw range that showed agreement too early.
- Original recordings, audio, and pictures under `/home/evolve/Documents/relay_pic_vid/video` were not modified.

### Reproducible edit files

- Build script: `video/build_hackathon_video.sh`
- Captions: `video/relay_hackathon.srt`
- Build notes: `video/README.md`
- Run from the repository with `bash video/build_hackathon_video.sh`.
- `video/output/` is ignored in Git so the rendered binaries are not accidentally committed.

### Submission copy selected

- YouTube title: `Relay — Say It Better | Built with Codex + GPT-5.6`
- YouTube description now explains the product, human approval loop, private/shared boundary, Build Week use of Codex and GPT-5.6 through Codex, and links to https://relay.durgaai.com.
- Devpost contribution text states that the product concept, state model, approval flow, invitations, privacy boundary, WebSocket chat, AI routing, responsive UI, testing, and Cloudflare deployment were built end-to-end with Codex as the primary coding partner.

### Submission status

- The OpenAI Build Week Devpost project was submitted successfully with all five steps complete.
- The local Git state intentionally retains the uncommitted `video/` build files, `.gitignore` update, and this session record.

## Session: 2026-07-20 evening

- Full log: `/home/evolve/AI PROJECT/DURGA_PLANS/sessions/2026-07-20_Relay_UX_Freeze_MVP_Submit.md`
- Local UX shipped in working tree (intent review, structured Goal/Status, waiting banner) — **not deployed**
- Connector roadmap locked but deferred: Remind me → Google Calendar (+ Meet) after submission
- Freeze for Build Week submit: no OAuth/Calendar/Meet/Gmail; only break-fix if needed
- Priority: Test → Record demo → Submission → Publish
- Local UX polish 2026-07-20 late: empty-state starters, progress strip (Draft→Shared→Waiting→Goal reached), stronger privacy copy, friendlier errors, post-completion “Did Relay help?” + Coming next labels. Still local-only / not deployed.

## Production

- Primary URL: https://relay.durgaai.com
- Worker URL: https://agent-network.salesagent.workers.dev
- Cloudflare Worker: `agent-network`
- Active version: `bdea5ea6-b1c5-4423-8dd2-a670706389f8` (deployed 2026-07-20 — UI polish + sticky Groq keys; no speech-act)
- Stable rollback: `d40aebd3-f9da-4673-a1c8-43278ae03baa`
- Rolled-back mixed build: `cbdf0561` (rotation + intent guards — do not redeploy)
- Deployed: UI intent/review + sticky Groq keys. Speech-act / grounding removed. Prod meeting smoke passed (create→approve→join→10am reply→resolve).
- Older incident rollback: `bac11794-b4bc-4d15-a83e-05c3b37c5816`

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
- **2026-07-20 submit freeze:** MVP boundary is intent → communicate → approve → join → outcome. Do not add connectors before submission.
- Allowed fixes only: broken buttons/states, invite failures, mobile layout, incorrect intent extraction, approval/privacy confusion, goal status, loading/errors.
- Do not add: Google OAuth, Calendar, Meet, Gmail, more screens/tones, complex agreement logic, fake working connector buttons (label “Coming next” only if shown).
- Collect onboarding friction, draft quality failures, invite completion, reply completion, and direct user feedback without storing private message content.
- After submit: internal Remind me first, then one Google Calendar connector (events + Meet + reminders).

## Architecture

- `server.ts` serves the nonce-protected client and forwards API/WebSocket traffic to one Durable Object.
- `backend.ts` owns recovery authentication, profiles, goals, contacts, blocks, AI drafting, and all WebSocket mutations.
- `ui.ts` is a DOM-safe browser client with no dynamic `innerHTML` or inline event handlers.
- `RELAY_STORE` is the SQLite-backed Durable Object and owns all writable state.
- `AGENTS_KV` remains a read-only fallback for legacy records.
- Drafting uses Groq first (`openai/gpt-oss-120b`, then `openai/gpt-oss-20b`) with multi-key rotation (`GROQ_KEY_1`–`3`), Workers AI as fallback, and optional local-only NVIDIA when configured.
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

## Open GPU Video Network Plan

- Goal: an open network where participants both share idle GPUs and submit video-generation jobs.
- Workers install a signed, sandboxed agent/container; jobs are routed to a compatible worker, outputs go to object storage, and a credit ledger records completed work.
- Every verified user can receive a daily generation allowance; workers earn credits and redeem them on larger GPU tiers.
- Never allow arbitrary code or host filesystem access on contributor machines; use signed images, network restrictions, timeouts, quotas, and reputation/anti-abuse controls.
- Important technical limit: ordinary internet-connected GPUs cannot be pooled into one large VRAM device. A 12 GB + 12 GB network does not transparently become a 24 GB GPU.
- True model/tensor/pipeline parallelism requires tightly controlled machines on a fast, low-latency fabric (PCIe/NVLink/InfiniBand) and coordinated software. For an open network, route each job to one compatible GPU instead; use credits to access larger 24 GB/48 GB workers.
- MVP should support Wan/LTX small models on 12 GB cards and larger models on 24 GB+ workers, starting invite-only before public registration.
- Clarification: the open network can still use every participant's limited GPU by decomposing video work into frame/scene batches or pipeline stages and assembling the final MP4. This is distributed video processing, not transparent pooled VRAM; model-parallel synchronization across arbitrary internet nodes remains inefficient.

## Relay 0.2 Browser Copilot Checkpoint — 2026-07-23 (final session state)

Product direction is frozen as: **Know what to say. Anywhere on the web.** Relay works inside the website the user already uses, never requires the recipient to join, never sends automatically, and keeps the shared-conversation protocol separate.

### Frozen two-state product

Relay has only two initial states. Do not restore the eight-goal picker or add more first-screen choices.

1. If the focused field contains text: **Improve what’s already here** → **Improve**.
2. If the focused field is empty: **What do you want to write?** → one **Short instruction…** box → **Create draft**.

After generation, existing-text sessions show **Improved version** and empty-field sessions show **Draft ready**. Available actions are **Insert**, **Copy**, **Change tone**, and **Start over**. Natural, Warm, and Direct remain the only tones.

### Session lifecycle

- `−` minimizes without losing the session.
- `×` closes and discards the Relay session; closing before insertion never changes the website field.
- **Start over** clears the generated draft while preserving the untouched raw website text.
- **Insert** writes to the website field and automatically minimizes Relay.
- Reopening the Relay chip after insertion restores the **Inserted — not sent** state with **Undo insert** and **Done** only.
- **Undo insert** restores the exact raw text and returns to the review state.
- **Done** accepts the inserted field value and closes the cycle.
- Sending or externally editing/clearing the website field resets stale Relay state automatically.
- Relay never clicks or hides the host website’s Send button.

### Drafting backend

- `POST /api/compose` now receives only `create` or `improve_text` from the current extension. Older goal names remain accepted server-side only for compatibility with previously loaded extension copies.
- `improve_text` edits only the focused field: spelling, punctuation, grammar, accidental all-caps, broken sentence boundaries, and awkward fragments. It must not answer, expand, reinterpret, or invent.
- `create` infers message, reply, prompt, post, comment, or form-answer behavior from the short user instruction, page type, field metadata, selected text, and limited nearby context.
- User direction defines intent. Selected and nearby webpage text are untrusted reference context only.
- One clarification question is allowed when an essential fact or position is missing.
- Natural/Warm/Direct tone changes style only. Protected names, brands, numbers, dates, boundaries, and speaker ownership remain guarded.
- No focused message content is persisted. Product events remain message-free.

### Reply context

Copying is not required on supported sites. The context priority is:

1. A deliberate text selection made shortly before opening Relay.
2. A small number of recent visible messages near the focused composer.
3. Generic capped nearby page context.

Focused automatic readers now exist for:

- Gmail
- Outlook
- WhatsApp Web
- Slack
- LinkedIn messages
- Reddit posts and parent-comment chains
- Quora questions, answers, and discussions

Selection remains the precision override when replying to an older or specific message. Copy/paste is only the fallback for unsupported or changed site layouts. These adapters use website DOM structure and must be live-tested because third-party markup can change.

### Safety and UI boundaries

- Shadow DOM isolates Relay styling from host pages.
- The panel prefers adjacent space and avoids covering the focused composer when room exists.
- Password, payment, identity, contact, address, search, and short factual fields remain excluded.
- Context is read only after the user opens Relay and chooses Improve or Create draft.
- Generation never mutates the website field; only explicit Insert does.
- Immutable snapshots protect the original raw text and prevent tone retries from recursively rewriting AI output.

### Deployment and verification

- The updated Worker backend was deployed to production on 2026-07-23 at `https://relay.durgaai.com`.
- Production accepted `goal: "improve_text"` and returned normalized sentence-case output for the live all-caps/fragment smoke case.
- `npm run test:extension:browser` passed after the two-state UI, placement, minimize/resume, close/raw-preservation, and context-reader changes.
- Generated client syntax and Relay static safety checks passed.
- Wrangler dry runs recognized the Durable Object, KV, Workers AI, and asset bindings.
- `git diff --check` passed after the lifecycle changes.

### Resume instructions

1. Open `chrome://extensions` and reload the unpacked Relay extension.
2. Refresh every already-open target tab; content scripts do not update in existing pages automatically.
3. Test existing text in ChatGPT/Claude: type rough text → Relay → Improve → Insert; confirm automatic minimize, reopen, Undo, and Done.
4. Test an empty Gmail reply: open Reply → Relay → enter a short intended response → Create draft. Confirm it uses the recent thread without copying.
5. Test selection override by selecting one older message before focusing the reply box.
6. Live-test Reddit and Quora selectors and adjust only the site reader if their current DOM differs.
7. Package the `extension/` directory for Chrome Web Store only after these live-site checks.

The Worker is deployed, but the browser extension changes are still local/unpacked and are not published in the Chrome Web Store. Preserve unrelated dirty work in `.gitignore`, `ui.ts`, `video/`, and earlier shared-protocol files.

## Checkpoint: 2026-07-24 — Dashboard redesign (pre-edit)

Before redesigning the dashboard, the state was:

ui.ts (dashboard at `/`):
- Header (lines 252–255): brand group on the left ("RELAY" + "say it better." tagline), single profile icon button on the right. No nav, no Install Extension button in header.
- `#home-view` (lines 262–280):
  - `#protect-banner` recovery prompt.
  - Three `.quick-entry` ad-style cards at lines 267–269: "Improve one message" (→ /write), "Get the browser extension" (→ /waitlist), "Free, Pro, and Team" (→ /pricing). These are the "three advertisements above an empty app" being removed.
  - `.home-tabs` with Conversations | Contacts (line 270).
  - `#home-conversations-panel` (thread-list) and `#home-contacts-panel` (contact-list).
  - `#home-fab` new-conversation button.
- `renderThreads()` empty state (lines 834–846): "No conversations yet." + starter chips (Ask for money back / Arrange a meeting / Decline politely / Discuss a payment) + a "Start a conversation" button. This will be replaced with a simpler "No conversations yet. Improve a message above or start a new conversation." copy and a single Start a conversation button.
- Quick Relay live at /write (lines 282–303) — unchanged by this work.
- `renderHome()` at lines 763–777 toggles tabs, manage button, FAB, protect banner. Unchanged logic.
- `/api/refine` exists (used by Quick Relay via `refineQuick()` at 726–761) and accepts `{ text, audience, tone:'preserve'|'professional'|... , clientId }`. Tones supported by backend include 'preserve'. New in-dashboard composer reuses this endpoint.
- `/api/plan` is POST-only (`backend.ts:705`), returns `{ plan, dailyLimit, remaining }`. Used to render the small plan-status line.
- `quickClientId()` helper at ui.ts:710 returns a localStorage ID; the dashboard composer reuses the same client budget so Improve counts against the same Free quota.

public/pricing.html (/pricing):
- Header (lines 14–20): brand + nav (Waitlist, Partners, Support).
- Three cards use badges: `Now`, `After retention`, `Later` (lines 25, 37, 49).
- Team CTA: `Talk partnerships` (line 58).
- h1 "Simple plans after the habit sticks" (line 21), lead "after retention" wording (22), footer "Billing unlocks only after D7 and weekly Insert metrics hold." (74), meta "after retention" (7).
- These will be relabeled: Now→Available now, After retention→Coming soon, Later→For teams, Talk partnerships→Join the team pilot, plus copy cleanup of internal metric language.

Server routes (`server.ts:95–141`): `/` is the dashboard (served from `ui.ts` HTML), marketing pages under `/public/*.html`, `/pricing` already exists. No new routes needed; pure template edits.

Local verification: `npm run dev` running at http://127.0.0.1:8787 (workerd pid 181112); tests: `npm run check`, `npm run test:growth`, `npm run test:quick:local`.

Git HEAD before edits: `a04170c Harden tone drafting and goal agreement validation`. All marketing pages, extension, docs, scripts, tests are untracked or modified-but-not-committed.

Resuming this checkpoint: dashboard redesign + pricing relabel are the only edits; run dev on :8787 and visit `/` and `/pricing` to verify.

## Session: 2026-07-26 Relay extension suggest mode + IP routing + UI overhaul

### Problem
- Extension on PC2/PC3 couldn't reach dev server (127.0.0.1 resolved to PC3 localhost, not PC1).
- Suggest feature produced 3 random options unrelated to conversation context.
- No way to iterate on a suggestion (no refine input, no back button).

### Fixes

**Network:**
- Changed `background.js`, `manifest.json`, `scripts/package-extension.sh` — `127.0.0.1` → `192.168.1.16` (PC1 LAN IP).
- Dev server started with `wrangler dev --ip 0.0.0.0` so it's reachable from LAN.
- Tests updated to match new host permission (`tests/quick-static.mjs:70`).

**Backend (`backend.ts`):**
- Added `suggest` to `COMPOSE_GOALS` (line 13).
- Added suggest guidance to `COMPOSE_GOAL_GUIDANCE.suggest`.
- Rewrote suggest prompt to return a single `{"draft":"..."}` instead of `{"suggestions":["...","...","..."]}`.
- Added tone guidance into suggest prompt (`internalTone`/`toneRule` from `COMPOSE_TONES`/`TONE_GUIDANCE`).
- Situation description (`direction`) now drives the suggest output — prompt treats it as the primary goal.

**Server (`server.ts`):**
- Removed `'suggest'` from `USAGE_GOALS` (not a usage-level goal).

**Extension (`extension/content.js`):**
- Removed all 3-card suggestion UI (`showSuggestions`, `pickSuggestion`, `currentSuggestions`, back/backRow/suggestionWrap/suggest-choice CSS).
- Removed `.suggest-row` / `suggestRow` / `suggest-btn` CSS and HTML.
- Added `refine-wrap` HTML + CSS (below draft preview): textarea + Refine button.
- Added `←` back arrow in header (`.back` element, triggers `startOver`).
- `showDraft()` now shows refine area (`refineWrap.classList.add('visible')`).
- `generate()` accepts `draftBase` param — sends existing draft as `text` for API rewrites.
- `refineBtn` click → reads refine input → calls `generate({ draftBase: generatedDraft })` with `goal: 'improve_text'`.
- `suggestButton` now reads `directionInput.value.trim()` as `userDirection` and produces 1 draft (same flow as draftButton).
- Direction input always stays visible in composer; direction field now cleared on Enter-close.
- `setBusy()` disables `refineBtn` too.
- `resetPanel()`/`startOver()` hide refineWrap.
- `directionInput` handler clears `refineWrap` when user types new direction.
- `toneLabel` click handler cycles tone when `currentSuggestions.length` existed — removed with suggestion UI.

**PC deployment:**
- Extension zipped as `dist/relay-extension.zip` and copied to PC3 at `~/relay-extension/`.
- Dev server restarts automatically after file changes.

### Verification
- `npm run check` passed (client syntax + Wrangler).
- `npm run test:quick` (`node tests/quick-static.mjs`) passed.
- `npm run test:goals` (`node tests/goal-validation.mjs`) passed.
- Suggest API verified manually: single draft response with tone-aware output.

### Next
1. Reload unpacked extension on PC3 from `~/relay-extension/`.
2. Open WhatsApp Web on PC3 → type situation → click Suggest replies → verify 1 targeted draft.
3. Type more in "Add more context…" → click Refine → draft rewrites.
4. [←] back arrow returns to composer.
5. PC2 disk is full — cannot copy extension until space is freed.

## Session: 2026-07-26 Gmail support (reply detection + subject/recipient context + email AI prompt)

### Changes

**Extension (`extension/content.js`):**
- `isReplyComposer()` — added Gmail branch at line 934: detects reply via `[role="dialog"][aria-label*="Reply"]` on `mail.google.com`. When no reply dialog found, returns `false` (new compose).
- `fieldContext()` — added `gmailSubject` (reads `[name="subjectbox"]`) and `gmailRecipients` (reads `[name="to"]`) from the Gmail compose dialog. Both included in the context object sent to the backend.

**Backend (`backend.ts`):**
- Replaced `messagingReplyRule` with `composeContextRule` — handles both `pageType === 'messaging'` (reply thread guidance) and `pageType === 'email'` (email format guidance: salutation, paragraphs, sign-off).
- Added `gmailSubject` / `gmailRecipients` to both the regular userMessage and the suggestUserMessage.
- Added email-specific rule in the suggest prompt (rule 6) when `context.pageType === 'email'`.

### Verification
- `node --check extension/content.js` — syntax OK.
- `npm run test:quick` passed.
- `npm run test:goals` passed.

### Next
- Open Gmail compose → Relay should show "What do you want to write?" (not reply).
- Open Gmail reply → Relay should show "What should this reply say?" with Suggest replies button.
- Backend should now produce email-formatted drafts (salutation, body, sign-off).
- Subject line and recipient info included in AI context for better drafts.

## Session: 2026-07-26 production extension delivery and business freeze

### Current production release

- Relay remains live at `https://relay.durgaai.com`.
- Cloudflare Worker version:
  `9748da00-15fa-4c58-a63d-84128a6fa3a9`.
- The downloadable extension is connected to the production Relay API.
- Extension access now requires:
  1. A valid email request.
  2. A six-digit email OTP.
  3. Successful OTP verification.
  4. A one-time ZIP download token.
- OTPs expire after 10 minutes, are stored only as salted hashes, allow at most
  five failed attempts, and are protected by email, IP, and global rate limits.
- Download tokens expire after 15 minutes and are invalidated after one use.
- Direct access to `/downloads/relay-extension.zip` is rejected.

### Transactional email

- Relay OTP mail is sent by the existing Evolve account
  `evolverobotlab@gmail.com`, displayed as **Relay by Durga**.
- The previously saved Google refresh token had been revoked. Gmail was
  reauthorized with the minimal `gmail.send` scope.
- Google client ID, client secret, and refresh token exist only as encrypted
  Cloudflare Worker secrets:
  `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN`.
- `scripts/refresh-relay-gmail-token.mjs` provides the local one-time
  reauthorization flow if Google revokes the token later. It writes a temporary
  mode-`600` token file; pipe that value to Wrangler and delete it afterward.
- The temporary token used for this release was deleted. No credential or OTP
  value was committed.

### Production acceptance

- OTP request to `contact@evolverobot.in`: HTTP 200.
- The request returned `verificationRequired: true` and did not expose a
  download token.
- User-provided OTP verification: HTTP 200.
- First authenticated ZIP download: HTTP 200, 58,463 bytes.
- Reuse of the same download link: HTTP 403.
- Direct unauthenticated ZIP download: HTTP 403.
- Generated client syntax, static safety tests, growth tests, `git diff
  --check`, and Wrangler deployment dry-run passed.
- Local Wrangler runtime remains blocked on this machine by
  `uv_interface_addresses returned Unknown system error 1`; production
  acceptance replaces the unavailable local runtime check for this release.

### Git state

- `5e68666` — Protect extension download with email OTP.
- `27ccf5e` — Document deferred Durga WhatsApp dual-mode plan.
- Both commits were pushed to `main` at
  `https://github.com/Evolve-Robot-Lab-1/relay.git`.
- `.opencode/` is unrelated and remains untracked and untouched.

### Product and business decision

- Freeze feature development for the next few days. Only fix release-blocking
  failures found during real testing.
- Move quickly with the production ZIP while Chrome Web Store review is
  pending: give it first to a known circle and a small number of businesses,
  observe installation and first-use behavior, and record failures without
  collecting private message content.
- Manual checks remain required for WhatsApp, Gmail, Facebook, LinkedIn, X,
  Reddit, Threads, and Quora. Prioritize context understanding, compose versus
  reply detection, tone matching, refine placement, insertion, and layout.
- The immediate commercial priority is business conversations and near-term
  training revenue; robotics projects remain a longer-cycle offer.
- Daily operating blocks discussed for the next working day:
  - 06:00–08:00 — prepare leads, demonstrations, goals, and follow-ups.
  - 08:00–10:00 — business meeting slot.
  - 10:00–12:00 — student training call/session.
  - 13:00–15:00 — second business meeting slot.
  - 15:00–17:00 — business call, follow-ups, and travel buffer.
  - 17:30–19:30 — second student training call/session.

### Deferred Durga architecture

- The low-friction business wedge is two complementary modes:
  Relay on the business's existing WhatsApp number for human-reviewed replies,
  and an optional dedicated Durga/API number for always-on automation.
- The full deferred design and tenant-safe routing contract are saved in
  `docs/DURGA_DUAL_MODE_WHATSAPP_PLAN.md`.
- `BACKLOG.md` keeps production stabilization under **Now** and the dual-mode
  Durga implementation under **Later**.

### Resume from here

1. Do not add features before field testing.
2. Download through `https://relay.durgaai.com/extension` using email OTP.
3. Test installation with one known user, then one real business.
4. Record the site, exact action, expected behavior, actual behavior, and a
   privacy-safe screenshot for each failure.
5. Fix only blockers, rerun the relevant checks, redeploy, and continue the
   pilot.

Last updated: 2026-07-26 (Asia/Kolkata)
