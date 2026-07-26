import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = Number(process.env.RELAY_QUICK_TEST_PORT || 8792);
const origin = `http://localhost:${port}`;
const testAi = process.env.RELAY_TEST_AI === '1' || process.argv.includes('--ai');
const wrangler = spawn('./node_modules/.bin/wrangler', ['dev', '--port', String(port), '--var', 'RELAY_OTP_TEST_CODE:654321'], {
  cwd: new URL('../', import.meta.url),
  env: { ...process.env, WRANGLER_LOG_PATH: `/tmp/relay-wrangler-${process.pid}.log` },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
wrangler.stdout.on('data', chunk => { logs = (logs + chunk).slice(-12_000); });
wrangler.stderr.on('data', chunk => { logs = (logs + chunk).slice(-12_000); });

function waitForReady() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Local Worker did not start.\n${logs}`)), 45_000);
    const inspect = chunk => {
      if (!/Ready on http:\/\//.test(String(chunk))) return;
      clearTimeout(timer);
      wrangler.stdout.off('data', inspect);
      wrangler.stderr.off('data', inspect);
      resolve();
    };
    wrangler.stdout.on('data', inspect);
    wrangler.stderr.on('data', inspect);
    wrangler.once('exit', code => setTimeout(() => {
      clearTimeout(timer);
      reject(new Error(`Local Worker exited with ${code}.\n${logs}`));
    }, 50));
  });
}

async function jsonRequest(path, options) {
  const response = await fetch(origin + path, options);
  return { response, body: await response.json().catch(() => ({})) };
}

try {
  await waitForReady();

  const write = await fetch(origin + '/write');
  assert.equal(write.status, 200);
  assert.match(await write.text(), /id="quick-view"/);

  const manifest = await fetch(origin + '/manifest.webmanifest');
  assert.equal(manifest.status, 200);
  assert.equal((await manifest.json()).start_url, '/write');

  const extensionPage = await fetch(origin + '/extension');
  assert.equal(extensionPage.status, 200);
  assert.match(await extensionPage.text(), /id="extension-request"/);

  const blockedExtensionDownload = await fetch(origin + '/downloads/relay-extension.zip');
  assert.equal(blockedExtensionDownload.status, 403, 'Extension download must require an accepted email');

  const testEmail = `quick-local-${Date.now()}@example.com`;
  const access = await jsonRequest('/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      cohort: 'founder_freelancer',
      region: 'south_asia',
      sites: 'WhatsApp'
    })
  });
  assert.equal(access.response.status, 200);
  assert.equal(access.body.verificationRequired, true);
  assert.equal(access.body.downloadToken, undefined, 'Unverified email must not receive a download token');

  const verification = await jsonRequest('/api/waitlist/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: '654321' })
  });
  assert.equal(verification.response.status, 200);
  assert.ok(typeof verification.body.downloadToken === 'string' && verification.body.downloadToken.length > 20);

  const extensionDownload = await fetch(origin + '/downloads/relay-extension.zip?token=' + encodeURIComponent(verification.body.downloadToken));
  assert.equal(extensionDownload.status, 200);
  assert.equal(extensionDownload.headers.get('content-type'), 'application/zip');
  assert.match(extensionDownload.headers.get('content-disposition') || '', /relay-extension\.zip/);
  assert.ok((await extensionDownload.arrayBuffer()).byteLength > 40_000, 'Extension download is unexpectedly small');

  const extensionOrigin = 'https://unrelated-writing-site.example';
  const preflight = await fetch(origin + '/api/compose', {
    method: 'OPTIONS',
    headers: {
      origin: extensionOrigin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');

  const empty = await jsonRequest('/api/refine', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: '{}'
  });
  assert.equal(empty.response.status, 400);
  assert.match(empty.body.error, /write/i);

  const invalidCompose = await jsonRequest('/api/compose', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: extensionOrigin },
    body: JSON.stringify({ text: 'hello', goal: 'unsupported', clientId: 'quicklocaltest123' })
  });
  assert.equal(invalidCompose.response.status, 400);
  assert.match(invalidCompose.body.error, /determine|choose/i);

  const event = await fetch(origin + '/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: extensionOrigin },
    body: JSON.stringify({ event: 'panel_opened', pageType: 'generic', goal: 'none', tone: 'natural', result: 'none', version: '0.2.0', clientId: 'quicklocaltest123' })
  });
  assert.equal(event.status, 204);

  if (testAi) {
    const refined = await jsonRequest('/api/refine', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({
        text: 'i have a half baked prompt, make it clear before sending but do not add new requirements',
        audience: 'ai',
        tone: 'preserve',
        clientId: 'quicklocaltest123'
      })
    });
    assert.equal(refined.response.status, 200, JSON.stringify(refined.body));
    assert.ok(typeof refined.body.draft === 'string' && refined.body.draft.length > 10);
    assert.equal(refined.body.audience, 'ai');
    console.log(`AI draft: ${refined.body.draft}`);

    const composed = await jsonRequest('/api/compose', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: extensionOrigin },
      body: JSON.stringify({
        text: 'i want to know how to market Relay without adding requirements',
        goal: 'improve_prompt',
        tone: 'natural',
        context: { pageType: 'ai', selectedText: '', nearbyText: '', fieldLabel: '', fieldPlaceholder: 'Message ChatGPT' },
        clientId: 'quickcompose123'
      })
    });
    assert.equal(composed.response.status, 200, JSON.stringify(composed.body));
    assert.equal(composed.body.goal, 'improve_prompt');
    assert.equal(composed.body.needsClarification, false, JSON.stringify(composed.body));
    assert.match(composed.body.draft, /market/i);
    assert.match(composed.body.draft, /Relay/);
    console.log(`Goal-aware draft: ${composed.body.draft}`);
  }

  console.log('Quick Relay local endpoint checks passed.');
} finally {
  if (wrangler.exitCode === null) {
    const stopped = new Promise(resolve => wrangler.once('exit', resolve));
    wrangler.kill('SIGTERM');
    await Promise.race([stopped, new Promise(resolve => setTimeout(resolve, 2_000))]);
  }
}
