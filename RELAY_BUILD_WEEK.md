# Relay: Product Vision and Build Week Brief

## Product Identity

**Name:** Relay

**Tagline:** Say it better.

**One-line description:** Relay is a private AI representative that helps a person turn difficult thoughts into clear messages without changing what they mean.

**Live product:** https://relay.durgaai.com

## Executive Summary

Difficult conversations often fail before they begin. A person may know what they need to ask, reject, clarify, negotiate, or disclose, but not know how to say it clearly. Existing AI chat tools can suggest wording, but they usually sit outside the conversation. The user must copy context into a separate tool, copy a response back, and trust that the rewrite did not change their intent.

Relay makes AI assistance part of the conversation while keeping the person in control. Each participant has their own private representative. The participant writes what they actually mean, Relay creates a short outgoing draft in the selected tone, and only the approved draft is shared. The private instruction remains visible only to its owner.

Relay does not optimize every conversation for agreement. It optimizes for clearer communication and a clear result. That result may be agreement, an answer, clarification, rejection, a delivered request, a communicated boundary, or closure.

The MVP is a live two-person, real-time web application with private profiles, single-use invitation links, AI-assisted drafting, tone control, Representative ON/OFF mode, message deletion, persistent contacts, recovery codes, and explicit conversation outcomes.

## The Problem

The hardest part of many conversations is not deciding what we mean. It is expressing that meaning under pressure.

Common examples include:

- Asking a friend to repay money without damaging the relationship.
- Telling a manager that a deadline is not realistic.
- Requesting clarification without sounding hostile.
- Rejecting an offer without creating false hope.
- Setting a personal boundary without oversharing the reason.
- Negotiating price, scope, time, or responsibilities.
- Cancelling a request while preserving the relationship.
- Communicating urgency without inventing facts or escalating emotion.

People currently solve this with a blank message box, a generic AI chatbot, or avoidance. A blank box provides no support. A generic chatbot creates copying friction and may lose conversation context. Avoidance allows uncertainty and conflict to grow.

## Vision

Relay's long-term vision is to become a trusted communication layer between people: private enough for honest intent, precise enough for consequential messages, and lightweight enough to use in everyday life.

The product should help users communicate more clearly without replacing their agency. The representative is not an autonomous negotiator and does not speak without permission. It is a controlled translator between private intent and shared language.

In the future, Relay could support reminders, calendar events, email handoff, structured commitments, guest participation, and organization workflows. Those features must remain downstream of the core promise: preserve meaning, protect privacy, and help the user reach a clear result.

## Core Product Rule

> Relay improves communication. Agreement is only one possible outcome.

The representative must:

- Understand the user's intent.
- Improve the wording.
- Apply the selected tone.
- Protect private thoughts.
- Keep replies short and natural.
- Move the conversation toward a clear result.
- Never change the user's position to make the conversation appear more successful.

## What Relay Is

Relay is:

- A private AI-assisted conversation between exactly two participants.
- A message editor that uses the current conversation as context.
- A consent layer: the first AI draft is reviewed before it is shared.
- A tone layer: Professional, Friendly, Direct, and Casual change wording, not meaning.
- A result-oriented conversation tool that recognizes multiple valid outcomes.
- A real-time web application that requires no traditional account signup.

Relay is not:

- A bot that impersonates the user without control.
- A system that forces compromise or agreement.
- A dating, therapy, legal, medical, or financial decision-maker.
- A public social network.
- A group chat in the current MVP.
- A place where one participant can inspect the other's private instructions.

## Who It Is For

The initial audience is anyone delaying a conversation because wording feels difficult.

High-value early use cases include:

- Friends and family discussing money, plans, responsibilities, or boundaries.
- Colleagues requesting resources, challenging assumptions, or clarifying ownership.
- Freelancers and clients negotiating scope, price, timelines, or revisions.
- Customers and service providers resolving bookings, delays, or expectations.
- Founders and collaborators discussing priorities, commitments, or disagreement.

The MVP deliberately stays broad enough for organic personal use while testing whether repeated professional use becomes the strongest market.

## User Experience

### 1. Start a conversation

The user opens Relay, supplies a display name if needed, and writes the message or intent they want to communicate. The input is private.

### 2. Review the first draft

Relay generates a Professional draft by default. The user can switch among Professional, Friendly, Direct, and Casual. Relay regenerates the wording while preserving the same intent.

### 3. Approve before sharing

No invite link exists until the first draft is approved. This prevents a recipient from entering an empty or half-created conversation and prevents accidental sharing of an unapproved draft.

### 4. Invite one participant

Approval creates a short, high-entropy, single-use invite. The recipient sees a focused name popup over a privacy-safe waiting state. They must choose a name before claiming the conversation.

### 5. Continue in real time

Both participants see only transmitted shared messages; private input stays visible only to its owner. After the one-time opening approval, each participant can write private shorthand or context, and their own representative turns it into an outgoing message using the conversation's established tone. Later replies send automatically while Representative mode is on.

### 6. Stay in control

Representative ON improves wording. Representative OFF sends the user's exact words. A user can remove their own messages, remove the conversation from their profile, block a contact, or, when authorized, delete the conversation for everyone.

### 7. Reach a result

Relay can mark a conversation resolved or closed. Mutual confirmation appears only when the conversation contains a real shared commitment. Agreement is never assumed.

## The AI Representative

Relay's product value depends on the quality of its representative. The representative is designed as a precise message editor, not a generic assistant.

### Drafting priorities

1. Correct speaker ownership.
2. Preserve the user's intent and meaning.
3. Preserve facts, amounts, currencies, dates, times, conditions, questions, rejections, certainty, and boundaries.
4. Apply the selected tone.
5. Keep the result concise and natural.

### Behavioral constraints

The representative must not:

- Invent a fact, reason, promise, commitment, consent, agreement, interest, or enthusiasm.
- Add a currency when the user only supplied a neutral amount such as `14k`.
- Turn disagreement into agreement.
- Weaken a rejection or privacy boundary.
- Copy the other participant's first-person statement into the user's voice.
- Reveal or mention the private instruction.
- Add generic greetings, apologies, gratitude, or social filler unless requested.

### Tone definitions

- **Professional:** polished, neutral, complete, and precise.
- **Friendly:** warm and collaborative without invented enthusiasm.
- **Direct:** concise, explicit, and free of unnecessary softeners.
- **Casual:** relaxed everyday language without formal or corporate phrasing.

Tone affects diction and sentence structure. It must never affect the user's meaning.

### Validation and failure behavior

Relay validates model output before sharing it. It checks length, private-text leakage, placeholders, invented gratitude or emotion, certainty changes, numbers, currencies, time qualifiers, named dates, cancellation, limits, privacy boundaries, requests for reasons, polarity, speaker ownership, and tone-specific wording.

Rejected drafts are retried through the provider plan. Tone-only changes can use a conservative deterministic restyle of an already safe draft. If every model is unavailable or every draft fails validation, Relay fails closed: the private message is not sent.

## Privacy and Trust Model

Privacy is a product boundary, not only visual styling.

- A participant's private instructions are serialized only to that participant.
- The other participant receives only approved shared messages.
- Invite secrets are high entropy and single use.
- The short invite URL does not expose the internal conversation ID.
- Only the invite token hash is stored in the invite mapping.
- Concurrent invite claims are serialized so exactly one recipient can join.
- A third party receives no conversation metadata from an invalid or claimed link.
- Recovery secrets are hashed before server-side storage.
- The client uses DOM-safe rendering and nonce-protected scripts.
- Sender-only message deletion is synchronized to both participants.
- Private originals are explicitly labeled `Only you can see this`.

Relay currently sends private drafting input to configured AI inference providers. This must be clearly disclosed in a public privacy policy before broad launch. Product analytics should record events and failure categories, not private message content.

## Why Relay Is Different

### Compared with a generic AI chatbot

A generic chatbot helps outside the conversation. Relay owns the full controlled flow: private intent, contextual rewrite, approval, invitation, real-time delivery, reply context, deletion, and outcome.

### Compared with ordinary messaging

Ordinary messaging starts with an empty composer and leaves the user alone with wording. Relay creates a private layer between thought and transmission.

### Compared with autonomous agents

Relay does not optimize for maximum autonomy. It optimizes for trustworthy assistance. The representative is bounded by consent, meaning preservation, and explicit failure behavior.

### Compared with negotiation products

Relay is not limited to deals or agreements. Rejection, clarification, boundaries, and closure are first-class successful outcomes.

## Current MVP

The live MVP includes:

- Frictionless profile creation without traditional signup.
- Private recovery codes for cross-device restoration.
- First-message approval and visible tone selection.
- Fixed tone for the continuing conversation.
- Representative ON/OFF per participant.
- Single-use two-person invite links.
- Persistent contacts with remove, block, and unblock.
- Real-time WebSocket conversation updates.
- Sender-only message deletion.
- Remove for me and creator-only delete for everyone.
- Resolve, close, reopen, and conditional commitment confirmation.
- Responsive desktop and mobile behavior.
- Automated syntax, drafting-quality, protocol, and browser tests.

## Technical Architecture

Relay is deployed as a Cloudflare Worker.

### Application layers

- `server.ts` serves the application with security headers and routes HTTP and WebSocket traffic.
- `backend.ts` owns profiles, recovery, contacts, blocking, invitations, conversations, AI drafting, validation, persistence, and real-time mutations.
- `ui.ts` contains the responsive browser client and renders user-controlled text without dynamic `innerHTML`.
- `RELAY_STORE` is a SQLite-backed Durable Object and the authority for writable state.
- `AGENTS_KV` provides read-only compatibility for legacy data.

### Real-time state

All writable conversation mutations pass through the Durable Object. Per-conversation operations are serialized to prevent races in invite claims, drafting, approvals, and deletion. WebSocket events update both connected participants immediately.

### AI routing

The production route currently uses:

1. Groq `openai/gpt-oss-120b`.
2. Groq `openai/gpt-oss-20b`.
3. Cloudflare Workers AI fallback models.

The router detects provider quota failures and avoids repeatedly calling a model that is unavailable during the same request. A further independent provider is planned to improve launch capacity.

### Verification

The deployed release has passed local and production end-to-end testing for:

- Profile creation and recovery.
- Private instruction ownership.
- All four drafting tones.
- Contextual speaker attribution.
- Invite locking and simultaneous claims.
- Contacts and blocking.
- Message and conversation deletion.
- Conversation results and Representative modes.
- Desktop and mobile flows.

## Technical Challenges Solved

### Private and shared state separation

The server builds a participant-specific view of every conversation. Private notes are filtered by ownership before serialization, rather than merely hidden in the browser.

### Atomic single-use invitations

Invite claims are resolved to the conversation and then serialized with other conversation mutations. The winner consumes the hash mapping; later claimants receive a generic unavailable response.

### Meaning-preserving AI output

Model prompting alone was not sufficient. Relay combines explicit instructions, model retries, semantic guardrails, tone validators, numeric and currency checks, polarity checks, and fail-closed delivery.

### Safe deployment recovery

The project experienced a production regression during rapid iteration. Deployment history, rollback versions, local-first testing, production E2E verification, Git commits, and a session record now provide a repeatable release process.

## Use of Codex and OpenAI Build Week

Relay was developed and hardened through an extended Codex collaboration. Codex was used to:

- Read and reconstruct a rapidly rewritten Worker codebase.
- Recover from a broken production deployment.
- Diagnose real-time and AI drafting failures.
- Implement secure invite claiming and participant-specific serialization.
- Build regression suites from observed product failures.
- Improve the drafting prompt, output validation, and provider routing.
- Test locally before deployment and verify the exact production release.
- Maintain Git history and an operational session record.

OpenAI states that Build Week submissions are evaluated on technical implementation, design and user experience, potential impact, and idea quality. Submissions should include a project description, demo video, and code repository. The official page also emphasizes thoughtful use of GPT-5.6 and Codex: https://openai.com/build-week/

### Honest runtime status

Codex is central to how Relay was built. The deployed message-generation runtime does not currently call the OpenAI API or GPT-5.6; it uses Groq and Workers AI. The submission must not imply otherwise.

Before submission, the team should make one explicit decision:

- Add GPT-5.6 through the OpenAI API as the primary draft generator or an independent fallback, then evaluate it with the existing strict drafting suite; or
- Submit Relay primarily as a Codex-built project and clearly state that the current runtime is provider-independent.

Given the judging language and the current capacity limits, integrating and evaluating GPT-5.6 is the stronger option if credentials and time permit.

## Build Week Judging Alignment

### Technical implementation

- Stateful real-time architecture on a Durable Object.
- Participant-specific private serialization.
- Atomic, single-use invitation claiming.
- Multi-provider AI routing with quota detection.
- Semantic and tone validation beyond prompt-only generation.
- Automated local and production end-to-end tests.

### Design and user experience

- No traditional signup before first value.
- One-time approval instead of approval friction on every message.
- Clear tone controls with a stable conversation style.
- A focused recipient-name flow that opens directly into the invitation.
- Representative OFF for exact-word delivery.
- A single conversation view with optional shared preview.

### Potential impact

Relay applies to personal, workplace, service, and commercial conversations. It can reduce avoidance, misunderstanding, accidental escalation, and the cognitive load of high-stakes wording.

### Quality of the idea

The core insight is that AI communication support should preserve private intent while participating in the actual shared workflow. Success is not agreement; success is a clear and faithful result.

## Demo Story

A strong demo should use one coherent scenario instead of a feature tour.

### Suggested scenario: urgent resource request

1. User A privately writes: `need 500 units asap ask why they delayed`.
2. Relay generates a Professional draft that preserves `500`, urgency, and the request for a reason.
3. User A switches between Friendly, Direct, and Casual to demonstrate visible tone changes without changed meaning.
4. User A approves the draft and shares the short invite.
5. User B opens the link, enters a name, and joins the intended conversation.
6. User B privately writes a short contextual response or boundary.
7. Relay attributes each person's statements correctly and sends only the improved message.
8. Turn Representative OFF and show exact-word sending.
9. Delete one message and show real-time removal on both sides.
10. Resolve or close the conversation without forcing agreement.

### Three-minute video structure

- **0:00-0:20:** State the problem and one-line solution.
- **0:20-1:50:** Show the complete two-person flow.
- **1:50-2:20:** Explain privacy, consent, and meaning preservation.
- **2:20-2:45:** Show the architecture and validation pipeline.
- **2:45-3:00:** State the vision and next step.

## Submission Copy

### Short description

Relay is a private AI representative for difficult conversations. A user writes what they mean, Relay turns it into a clear message in the selected tone, and only the approved wording is shared. It preserves intent, protects private instructions, and treats agreement, clarification, rejection, boundaries, and closure as equally valid outcomes.

### Elevator pitch

People often avoid important conversations because they do not know how to phrase what they already mean. Relay gives each participant a private AI representative inside a real two-person conversation. It improves wording with context, keeps private intent private, and never forces agreement. The user stays in control through first-message approval, tone selection, and Representative ON/OFF mode.

### Why now

Language models can generate fluent text, but fluent text is not automatically faithful text. As AI moves into personal communication, users need systems that are designed around consent, speaker ownership, privacy, and meaning preservation. Relay demonstrates that architecture in a working product.

## Success Metrics

The MVP should measure product events without logging private message content.

Primary funnel:

1. New profile created.
2. First private input submitted.
3. First draft generated.
4. Draft approved.
5. Invite shared.
6. Invite claimed.
7. Recipient replies.
8. Conversation reaches a result.

Quality and trust metrics:

- Draft approval rate.
- Tone-change rate and final tone selection.
- AI failure and validation-rejection rates by provider.
- Median draft latency.
- Representative OFF usage.
- Conversation completion and return usage.
- Message deletion, block, and conversation-removal rates as safety signals.

## Immediate Priorities

Relay is under a feature freeze during the user study. Do not add product features or redesign workflows without repeated user evidence. The only active engineering exceptions are AI model capacity/reliability and privacy-safe operational logging.

### Before Build Week submission

1. Decide and, if possible, implement the OpenAI GPT-5.6 runtime role.
2. Record a stable two-participant demo video using the deployed build.
3. Prepare the Devpost description, screenshots, repository access, and architecture visual.
4. Add basic privacy-safe event monitoring and provider health visibility.
5. Verify the final production build once after all submission changes.

### User study focus

- Observe whether a new user understands what to write privately.
- Record where invite sharing and joining stop or slow down.
- Capture drafts that fail to preserve intent or express the selected tone.
- Measure whether the invited participant sends a first reply.
- Ask what users expected Relay to do that it did not do.
- Do not record private instructions or shared message content in analytics.

### After submission

1. Add an independent AI provider fallback and production capacity controls.
2. Measure the onboarding funnel and remove the highest-impact friction.
3. Add privacy policy, terms, abuse controls, and data-retention controls before broad public promotion.
4. Test repeated professional use cases before expanding the feature set.

## Risks and Open Questions

- **Provider capacity:** Current free quotas are suitable for a pilot, not broad public growth.
- **Privacy disclosure:** Users need clear disclosure of AI subprocessors and retention behavior.
- **AI fidelity:** Validation reduces risk but cannot guarantee perfect interpretation.
- **Abuse:** Blocking exists, but reporting and moderation workflows are not yet implemented.
- **Identity:** Recovery codes preserve a profile without signup, but users can lose access if they lose the code.
- **Positioning:** Broad difficult-conversation utility must be tested against narrower professional use cases.
- **OpenAI runtime:** The hackathon narrative is stronger if the live inference path thoughtfully uses GPT-5.6 and reports evaluation results.

## Product Principle to Preserve

Relay should become more capable without becoming more autonomous than the user expects.

Every future feature should pass three questions:

1. Does it help the user communicate their real intent?
2. Does it preserve consent and private information?
3. Does it reduce friction without forcing an outcome?

If the answer to any question is no, the feature does not belong in Relay.
