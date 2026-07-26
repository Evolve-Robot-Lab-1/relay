# Relay browser copilot

**Know what to say. Anywhere on the web.**

Relay understands the user's goal and focused context, then helps write the right message, reply, prompt, or form response. It works inside writing-oriented web fields without requiring the recipient to join Relay.

## Try the unpacked extension (local)

1. Open `chrome://extensions` in Chrome, Edge, Brave, or another Chromium browser.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension` directory.
4. Focus a writing field on any HTTP or HTTPS website.
5. Choose the small **Relay** chip. If the field already has text, choose **Improve**. If it is empty, describe what you want briefly and choose **Create draft**.
6. Review the draft, then choose **Insert** or **Copy**. Relay never sends automatically.

Local `background.js` first calls `http://192.168.1.16:8787`, then falls back to production. Run `npm run dev` in the repo root while testing.

## Chrome Web Store package

```bash
npm run extension:package
```

Creates `dist/relay-extension.zip` pointed at `https://relay.durgaai.com` with production host permissions only. Listing copy: [STORE_LISTING.md](./STORE_LISTING.md). Trust checklist: [TRUST_GATE.md](./TRUST_GATE.md).

Global waitlist: https://relay.durgaai.com/waitlist

For replies, Relay automatically reads a limited set of recent visible messages near focused composers in Gmail, Outlook, WhatsApp Web, Slack, LinkedIn, Facebook, Reddit, and Quora. Selecting a specific message before opening Relay overrides the automatic context. On WhatsApp, an active quoted reply is preferred as intent. The user's typed instruction remains authoritative; Suggest replies can use recent conversation context without requiring an instruction.

## Permission summary

- Site access allows Relay to place its chip beside writing fields across the web.
- Network access is limited to Relay's refinement endpoint.
- Storage holds one anonymous installation ID used for rate limiting.
- Relay excludes password, payment, identity, contact, address, search, and short factual fields.
- Focused text and nearby context are read and sent only after the user opens Relay and chooses a goal.

See [PRIVACY.md](./PRIVACY.md) for the data behavior that should also be disclosed in the extension-store listing.
