# Relay pricing scaffolding

Plans are enforced as daily compose/refine quotas. Card billing is intentionally deferred until retention gates pass.

| Plan | Daily compose limit | Unlock |
|---|---|---|
| Free | 40 | Default |
| Pro | ₹999/month (about $12) · 400 actions | Valid `planCode` / waitlist invite marked Pro |
| Team | From ₹1,699/seat/month (about $20) · 800 actions | Custom by seats, usage, and admin needs; team pilot |

## APIs

- `POST /api/plan` — preview or bind a plan code to a client id
- `POST /api/compose` / `POST /api/refine` — consume daily quota; 429 when exhausted
- Waitlist invite codes may elevate to Pro for cohort testers

## Public page

https://relay.durgaai.com/pricing
