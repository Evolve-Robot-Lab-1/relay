import assert from 'node:assert/strict';

const base = process.argv.find(value => /^https?:\/\//.test(value)) || 'https://relay.durgaai.com';
const testAi = process.argv.includes('--ai');

async function jsonRequest(path, options) {
  const response = await fetch(base + path, options);
  return { response, body: await response.json().catch(() => ({})) };
}

const write = await fetch(base + '/write');
assert.equal(write.status, 200);
assert.match(await write.text(), /id="quick-view"/);

const manifest = await fetch(base + '/manifest.webmanifest');
assert.equal(manifest.status, 200);
assert.equal((await manifest.json()).start_url, '/write');

for (const requestOrigin of ['chrome-extension://abcdefghijklmnop', 'https://chatgpt.com', 'https://unrelated-writing-site.example']) {
  const preflight = await fetch(base + '/api/compose', {
    method: 'OPTIONS',
    headers: {
      origin: requestOrigin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
}

const empty = await jsonRequest('/api/refine', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base },
  body: '{}'
});
assert.equal(empty.response.status, 400);
assert.match(empty.body.error, /write/i);

const invalidCompose = await jsonRequest('/api/compose', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ text: 'hello', goal: 'unsupported', clientId: `invalidcompose${Date.now()}` })
});
assert.equal(invalidCompose.response.status, 400);

const usageEvent = await fetch(base + '/api/events', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ event: 'panel_opened', pageType: 'generic', goal: 'none', tone: 'natural', result: 'none', version: '0.2.0', clientId: `productionevent${Date.now()}` })
});
assert.equal(usageEvent.status, 204);

if (testAi) {
  const refined = await jsonRequest('/api/refine', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({
      text: 'tell them Relay fixed my rough prompt, but do not claim Relay sent anything',
      audience: 'ai',
      tone: 'preserve',
      clientId: `productioncheck${Date.now()}`
    })
  });
  assert.equal(refined.response.status, 200, JSON.stringify(refined.body));
  assert.ok(typeof refined.body.draft === 'string' && refined.body.draft.length > 10);
  assert.equal(refined.body.audience, 'ai');
  assert.match(refined.body.draft, /\bRelay\b/, `Protected brand was changed: ${refined.body.draft}`);
  assert.notEqual(refined.body.draft.toLocaleLowerCase(), 'tell them relay fixed my rough prompt, but do not claim relay sent anything');
  console.log(`Production AI draft: ${refined.body.draft}`);

  const allCapsTypos = await jsonRequest('/api/refine', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({
      text: 'SE I WNAT TO NW HWOTO MARKET THIS',
      audience: 'ai',
      tone: 'preserve',
      clientId: `productioncaps${Date.now()}`
    })
  });
  assert.equal(allCapsTypos.response.status, 200, JSON.stringify(allCapsTypos.body));
  assert.equal(allCapsTypos.body.needsClarification, false, JSON.stringify(allCapsTypos.body));
  assert.match(allCapsTypos.body.draft, /market/i, `Draft lost the user's intent: ${allCapsTypos.body.draft}`);
  assert.doesNotMatch(allCapsTypos.body.draft, /\b(?:WNAT|HWOTO)\b/i, `All-caps typos were preserved: ${allCapsTypos.body.draft}`);
  console.log(`Production all-caps draft: ${allCapsTypos.body.draft}`);

  const composed = await jsonRequest('/api/compose', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({
      text: 'i want to know how to market Relay without adding requirements',
      goal: 'improve_prompt',
      tone: 'natural',
      context: { pageType: 'ai', selectedText: '', nearbyText: '', fieldLabel: '', fieldPlaceholder: 'Message ChatGPT' },
      clientId: `productioncompose${Date.now()}`
    })
  });
  assert.equal(composed.response.status, 200, JSON.stringify(composed.body));
  assert.equal(composed.body.goal, 'improve_prompt');
  assert.equal(composed.body.needsClarification, false, JSON.stringify(composed.body));
  assert.match(composed.body.draft, /market/i);
  assert.match(composed.body.draft, /Relay/);
  console.log(`Production goal-aware draft: ${composed.body.draft}`);
}

console.log(`Quick Relay production checks passed at ${base}.`);
