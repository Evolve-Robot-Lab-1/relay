# Relay — Devpost / Build Week submission

**Live:** https://relay.durgaai.com  
**Tagline:** Say it better.  
**Source of truth:** also mirrored under Submission Copy in `RELAY_BUILD_WEEK.md`

---

## Inspiration

People avoid important conversations every day—not because they do not know what they want, but because expressing it can feel awkward, emotional, or difficult.

A person may need to:

- Ask a friend to return money
- Follow up on a payment
- Invite someone to an event
- Negotiate a price
- Decline politely
- Arrange a meeting
- Discuss a sensitive issue

Most AI writing tools stop after rewriting a sentence. But the real problem often continues after the first message: the other person responds, details change, agreements must be confirmed, and the next step can easily be forgotten.

We experienced this ourselves while arranging an online meeting. The meeting time had already been discussed, but the conversation was buried in chat. The Google Meet was created 30 minutes late because the agreed time was lost in plain sight.

That led to the core idea behind Relay:

> What if AI could understand what a person wants, represent it clearly, help both sides reach an outcome, and keep the human in control throughout the conversation?

## What it does

Relay is a human-controlled communication representative.

A user privately explains what they want. Relay understands the goal, prepares a clear message in the chosen tone, and asks the user to approve it before anything is shared.

The other participant joins through a secure invite link and responds through their own side of the conversation.

Relay then helps the conversation move toward a clear outcome without exposing private instructions or making commitments without approval.

**Product flow:**

Private intent → Relay understands the goal → Relay prepares the message → The user reviews and approves → The other participant joins → Both sides communicate → Relay tracks the outcome → Goal reached, declined, or closed

**Relay currently supports:**

- Private intent capture
- Goal extraction
- AI-assisted message drafting
- Professional, friendly, direct, and casual tones
- Human approval before sharing
- Secure participant invite links
- Two-sided conversations
- Private and shared message separation
- Conversation status tracking
- Goal and outcome tracking
- Human-readable conversation summaries

## Why Relay is different

Relay is not only a grammar corrector or message rewriter.

A writing assistant improves a sentence.

Relay understands:

- What the user is trying to achieve
- Which details matter
- What remains unresolved
- Whether the goal has reached an outcome

For example, a user may privately say:

> I want to ask my friend to return ₹1,000, but I do not want to sound rude.

Relay can identify:

- **Goal:** Request repayment of ₹1,000
- **Tone:** Friendly
- **Outcome needed:** A repayment date or a clear response

It can then prepare an approved message without exposing the user's private thoughts or negotiation limits.

Relay separates three important layers:

| Layer | Meaning |
|-------|---------|
| **Intent** | What the user wants |
| **Communication** | How Relay represents it |
| **Outcome** | What both sides finally agree, decline, or leave unresolved |

### Human-controlled safety model

Relay is designed around approval rather than silent automation.

The system follows these principles:

- Private instructions remain visible only to the person who wrote them.
- Relay does not share a message until the user approves it.
- A proposal is not treated as an agreement.
- Silence is not treated as confirmation.
- Relay does not automatically accept prices, meeting times, deadlines, or other commitments.
- Both sides remain in control of their own decisions.

Architecture follows a **Human → Agent → Agent → Human** model:

Human A → Representative A → Representative B → Human B

Each representative acts only on information confirmed by its own human.

This gives Relay the benefits of AI-assisted communication without allowing the AI to silently make commitments on behalf of users.

## How we built it

Relay was built as a real-time web application with a two-part experience:

- A private conversation between the user and their representative
- A shared conversation between the two participants

The application includes:

- A private intent and drafting layer
- A strict conversation-state model
- Secure invite-based participant access
- Real-time message synchronization
- Approval-controlled outbound communication
- Goal and status extraction
- Separate private and shared views
- Mobile-responsive interfaces

**Runtime AI (production):** Groq (`openai/gpt-oss-120b` / `openai/gpt-oss-20b` with multi-key rotation) and Cloudflare Workers AI as fallback. These models help Relay interpret informal input, identify goals, extract details, draft clearer messages, adapt tone, and summarize conversation state.

**Development:** Codex was used throughout development to explore the codebase, design conversation-state logic, implement the UI flow, debug real-time messaging, improve mobile responsiveness, refactor private/shared message handling, add intent/goal/approval/outcome states, and review edge cases and trust boundaries.

## Challenges we ran into

### Avoiding the “grammar tool” misunderstanding

Early testers sometimes described Relay as a grammar correction tool. Showing only the original sentence and the rewritten message made the product look like a writing assistant.

To solve this, Relay surfaces a structured goal under the conversation title, for example:

- **Goal:** Get a clear response to the workshop invitation
- **Date:** Not specified

This keeps intent visible without repeating the full message, and makes the difference between intent and communication clear.

### Protecting private intent

A user may privately share information that should never be sent to the other side—maximum negotiation budget, emotional context, personal concerns, preferred outcome, or internal deadlines.

We therefore created separate visibility rules for private instructions and shared messages. Only approved communication is shown to both sides. The receiver never sees the owner's goal framing as if it were theirs.

### Preventing false agreement

An AI system can easily mistake a suggestion for a confirmed commitment.

> Maybe 10:00 AM could work.

is not the same as:

> Yes, 10:00 AM is confirmed.

Relay therefore distinguishes between proposed, confirmed, declined, and unresolved details.

### Simplifying the interface

Early versions exposed too many controls, status icons, and technical states.

We simplified the interface to prioritize:

- Goal
- Conversation
- Next action (share invite / send / mark reached)

End-state status appears for **Goal reached** and **Closed**. Rare or destructive actions live in a secondary menu.

## Accomplishments that we're proud of

We are proud that Relay is not only a concept or static prototype.

The working MVP supports an end-to-end two-person flow:

Start conversation → Explain private intent → Generate Relay's message → Select tone → Review and approve → Create secure invite → Participant joins → Continue the conversation → Track the goal and outcome

We also created a distinctive brand identity using the stone representative and speech-bubble symbol to communicate patience, trust, and representation.

Live at https://relay.durgaai.com

## What we learned

The most important lesson was that communication is not only about writing better sentences.

People also need help with:

- Remembering what was discussed
- Understanding what has been agreed
- Knowing what still needs a response
- Following through after the conversation

We also learned that trust must be visible in the product.

Users need to know:

- What is private
- What will be shared
- What Relay understood
- What Relay is waiting for
- Whether something has actually been confirmed

Human approval cannot be hidden as an implementation detail. It must be part of the user experience.

## What's next for Relay

The next stage is to turn confirmed conversation outcomes into approved real-world actions.

Our connector roadmap begins with:

- Relay reminders
- Google Calendar
- Google Meet creation
- Calendar invitations
- Event updates and cancellations

The future flow will be:

Conversation → Outcome confirmed → User reviews the next action → User approves → Relay completes the action

For example:

Meeting time confirmed → Schedule meeting → Create calendar event → Generate Google Meet link → Set reminder

Relay will never silently book a meeting, send money, accept a deal, or make an important commitment. The user will remain in control.

## Our vision

Relay can support anyone who struggles to start, manage, remember, or complete important conversations.

Possible use cases include:

- Payment follow-ups
- Meeting coordination
- Marketplace negotiation
- Client communication
- Family conversations
- Event invitations
- Price and scope negotiation
- Difficult requests and refusals

Our long-term vision is:

> Relay helps people say what they mean, reach a clear outcome, and complete the next step—without giving up control.

**Relay — Say it better.**
