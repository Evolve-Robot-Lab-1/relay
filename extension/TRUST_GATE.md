# Relay extension trust gate

Do not mass-invite or run Product Hunt until every item below is checked.

## Store package

- [ ] `npm run extension:package` produces `dist/relay-extension.zip`
- [ ] Manifest version matches production API expectations
- [ ] Icons 16/32/48/128 present
- [ ] Host permission is only `https://relay.durgaai.com/*` for store builds
- [ ] Background service worker loads without errors on a fresh Chromium profile
- [ ] Privacy URL https://relay.durgaai.com/privacy
- [ ] Support URL https://relay.durgaai.com/support

## Live-site pass (fresh install)

On each site: open Relay → Improve or Create → Insert → Undo once.

- [ ] WhatsApp Web quoted reply shows “Replying to …” intent
- [ ] Gmail reply uses recent thread context
- [ ] LinkedIn messaging Improve / Create
- [ ] ChatGPT or Claude prompt Improve
- [ ] Slack message Improve / Create
- [ ] No “Failed to fetch”, storage, or “Receiving end does not exist” errors

## Backend

- [ ] `GET /api/health` returns 200
- [ ] `POST /api/compose` rate-limits abusive clients
- [ ] Free daily compose quota returns a clear 429 when exceeded
- [ ] Usage events never accept message text

## Friendly cohort gate

- [ ] ≥20 friendly users complete Improve + Create + Insert on ≥3 sites
- [ ] No release-blocking trust bugs (invented facts, private leakage, auto-send perception)
- [ ] Support inbox monitored: support@evolverobot.in / https://relay.durgaai.com/support

Exit: proceed to Phase 1 invite cohorts.
