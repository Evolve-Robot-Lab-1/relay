# Dual-Mode Durga WhatsApp Plan

Status: Deferred until the existing Relay production deployment is stable.

## Product wedge

Businesses should be able to start with AI on the WhatsApp number their
customers already know, without buying a SIM, migrating contacts, or changing
their normal workflow.

Durga will support two complementary modes:

1. **Relay Business Copilot** works on the business's existing WhatsApp number
   through WhatsApp Web.
2. **Durga Sales Bot** provides an optional dedicated/API number for always-on
   automation.

Both modes connect to the same authenticated Durga business workspace while
remaining technically separate channels.

## Key changes

- Add Durga authentication to Relay and derive `businessId` only from the
  verified JWT.
- Let Relay read only the focused WhatsApp conversation, identify intent, draft
  replies, and require the user to insert or send them manually.
- Add a confirmed **Send to Durga** action that creates a lead, support task,
  billing task, operations task, or human follow-up.
- Send only the minimal context shown in the confirmation preview. Do not
  migrate the address book or upload the complete WhatsApp history.
- Retain the dedicated Durga bot for businesses that want 24/7 responses,
  campaigns, lead capture, and automation.
- Resolve dedicated bot traffic using Meta `phone_number_id`; resolve Relay
  traffic using the authenticated Durga business session.
- Never infer the tenant from message text or silently default to Evolve.

## Routing and interfaces

### `POST /api/v1/routing/resolve`

Support two source modes:

- `managed_bot`: resolve the tenant from the registered channel account.
- `relay_copilot`: resolve the tenant from the authenticated Durga JWT.

Return the verified business, conversation, detected intent, confidence,
destination queue, suggested action, and whether human review or clarification
is required.

Route conversations within the business to:

- Sales
- Support
- Billing
- Operations
- Human
- Unassigned triage

Low-confidence or unclear messages go to the unified human triage inbox.

### `POST /api/v1/handoffs`

- Require an authenticated Durga user and explicit confirmation in Relay.
- Derive `businessId` from the verified JWT, never from a request parameter.
- Accept the source channel, confirmed intent, destination, current draft,
  limited previewed context, and an idempotency key.
- Create a tenant-scoped lead or task without sending a WhatsApp message.

## Business onboarding

1. Install Relay and sign in to the Durga business workspace.
2. Continue using the existing WhatsApp number and existing contacts.
3. Use Relay for context-aware, human-reviewed replies.
4. Confirm individual leads or tasks that should be handed to Durga.
5. Optionally activate the dedicated Durga Sales Bot when always-on automation
   is needed.

Activating the bot does not require abandoning the existing number. Both
channels can operate together. Durga should label their origins as
`Existing WhatsApp via Relay` and `Durga Bot`.

Customer records may be unified only through a confirmed customer identifier;
the two channel histories remain separately attributable.

## Safety and privacy

- Relay never sends automatically.
- Managed bot automation requires explicit activation by the business.
- Relay cannot read background conversations or another business's data.
- No contact migration is required.
- Routing logs should omit message content and retain only necessary IDs,
  intent, confidence, destination, and outcome.
- Internal service credentials must use Cloudflare secrets and be rotated
  before rollout.

## Testing and rollout

- Test authenticated tenant isolation and rejection of unmapped channel
  accounts.
- Test focused-conversation extraction, intent detection, draft generation,
  manual insertion, and explicit handoff.
- Test duplicate handoff prevention and confirmed customer matching.
- Verify Relay cannot migrate contacts, read background conversations, or send
  automatically.
- Test dedicated bot routing independently with explicit account mappings and
  no default tenant.
- Start with Evolve's existing WhatsApp through Relay.
- Pilot with businesses that currently resist buying a SIM or migrating
  contacts.
- Offer dedicated bot activation after the Relay workflow is stable.
- Reuse the stable routing contract later for Gmail, Facebook, LinkedIn, X,
  Reddit, Threads, and Quora.

## Success measures

- Installation to first useful draft in under five minutes.
- Draft insertion and weekly repeat-use rates.
- Customer conversations converted into confirmed Durga leads or tasks.
- Zero wrong-business routing.
- Businesses that later activate the dedicated Durga bot.

## Assumptions

- Relay is the low-friction entry product for existing WhatsApp numbers.
- The dedicated Durga number is an optional automation upgrade.
- Relay remains human-controlled.
- No SIM purchase, contact migration, or number replacement is required to
  begin.

