import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);

async function exists(rel) {
  try {
    await access(new URL(rel, root), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const [
  server,
  backend,
  ui,
  storeListing,
  trustGate,
  growth,
  partners,
  pricingDoc,
  waitlistPage,
  pricingPage,
  partnersPage,
  privacyPage,
  supportPage,
  whatsappPage,
  linkedinPage,
  chatgptPage,
  extensionPage
] = await Promise.all([
  readFile(new URL('server.ts', root), 'utf8'),
  readFile(new URL('backend.ts', root), 'utf8'),
  readFile(new URL('ui.ts', root), 'utf8'),
  readFile(new URL('extension/STORE_LISTING.md', root), 'utf8'),
  readFile(new URL('extension/TRUST_GATE.md', root), 'utf8'),
  readFile(new URL('docs/GROWTH.md', root), 'utf8'),
  readFile(new URL('docs/PARTNERS.md', root), 'utf8'),
  readFile(new URL('docs/PRICING.md', root), 'utf8'),
  readFile(new URL('public/waitlist.html', root), 'utf8'),
  readFile(new URL('public/pricing.html', root), 'utf8'),
  readFile(new URL('public/partners.html', root), 'utf8'),
  readFile(new URL('public/privacy.html', root), 'utf8'),
  readFile(new URL('public/support.html', root), 'utf8'),
  readFile(new URL('public/use/whatsapp.html', root), 'utf8'),
  readFile(new URL('public/use/linkedin.html', root), 'utf8'),
  readFile(new URL('public/use/chatgpt.html', root), 'utf8'),
  readFile(new URL('public/extension.html', root), 'utf8')
]);

assert.match(server, /\/waitlist/, 'Worker must serve waitlist');
assert.match(server, /\/pricing/, 'Worker must serve pricing');
assert.match(server, /\/partners/, 'Worker must serve partners');
assert.match(server, /\/privacy/, 'Worker must serve privacy');
assert.match(server, /\/support/, 'Worker must serve support');
assert.match(server, /\/use\/whatsapp/, 'Worker must serve WhatsApp use-case page');
assert.match(server, /\/use\/linkedin/, 'Worker must serve LinkedIn use-case page');
assert.match(server, /\/use\/chatgpt/, 'Worker must serve ChatGPT use-case page');
assert.match(server, /\/downloads\/relay-extension\.zip/, 'Worker must serve the requested extension build');

assert.match(backend, /\/api\/waitlist/, 'Waitlist API route missing');
assert.match(backend, /\/api\/partners/, 'Partners API route missing');
assert.match(backend, /\/api\/plan/, 'Plan API route missing');
assert.match(backend, /consumeDailyQuota/, 'Daily plan quota enforcement missing');
assert.match(backend, /PLAN_LIMITS/, 'Plan limits missing');
assert.match(backend, /non_native_pro/, 'Cohort A missing');
assert.match(backend, /founder_freelancer/, 'Cohort B missing');
assert.match(backend, /sdr_sales/, 'Cohort C missing');

assert.match(ui, /href="\/waitlist"/, 'Home must link to waitlist');
assert.match(ui, /href="\/pricing"/, 'Home must link to pricing');

assert.match(storeListing, /Chrome Web Store/, 'Store listing copy missing');
assert.match(trustGate, /Live-site pass/, 'Trust gate checklist missing');
assert.match(growth, /North-star metrics/, 'Growth playbook missing metrics');
assert.match(partners, /Cold outreach template/, 'Partner outreach templates missing');
assert.match(pricingDoc, /Free/, 'Pricing doc missing Free tier');

assert.match(waitlistPage, /Request invite/, 'Waitlist CTA missing');
assert.match(pricingPage, /₹999/, 'Pro INR price missing');
assert.match(pricingPage, /\$12/, 'Pro USD reference missing');
assert.match(partnersPage, /Partner interest/, 'Partner form missing');
assert.match(privacyPage, /What Relay does not do/, 'Privacy page incomplete');
assert.match(supportPage, /support@evolverobot\.in/, 'Support email missing');
assert.match(whatsappPage, /Replying to/, 'WhatsApp use-case incomplete');
assert.match(linkedinPage, /LinkedIn DM/, 'LinkedIn use-case incomplete');
assert.match(chatgptPage, /Improve ChatGPT prompts/, 'ChatGPT use-case incomplete');
assert.match(extensionPage, /Request Relay, then test it/, 'Extension landing missing');
assert.match(extensionPage, /id="extension-request"/, 'Extension request form missing');
assert.match(extensionPage, /\/downloads\/relay-extension\.zip/, 'Extension download CTA missing');

for (const icon of ['extension/icons/icon16.png', 'extension/icons/icon32.png', 'extension/icons/icon48.png', 'extension/icons/icon128.png']) {
  assert.equal(await exists(icon), true, `Missing ${icon}`);
}
assert.equal(await exists('scripts/package-extension.sh'), true, 'Extension package script missing');

console.log('Growth static checks passed.');
