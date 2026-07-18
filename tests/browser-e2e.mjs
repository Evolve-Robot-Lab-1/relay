import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const base = process.argv[2] || 'http://127.0.0.1:8791';
const chromePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const profileDir = await mkdtemp(join(tmpdir(), 'relay-browser-'));

const debugPort = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(error => error ? reject(error) : resolve(address.port));
  });
});
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  `--user-data-dir=${profileDir}`,
  `--remote-debugging-port=${debugPort}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeError = '';
chrome.stderr.on('data', chunk => { chromeError = (chromeError + chunk).slice(-4000); });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function devtoolsAddress() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      const data = await response.json();
      if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
    } catch {}
    await delay(50);
  }
  throw new Error('Chrome DevTools did not start.');
}

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject, timer } = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
    this.socket.addEventListener('close', () => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error('Chrome DevTools connection closed.\n' + chromeError));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, sessionId) {
    if (this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Chrome DevTools is not connected.\n' + chromeError));
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome DevTools timed out running ${method}.\n${chromeError}`));
      }, 15_000);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  close() {
    this.socket.close();
  }
}

let cdp;
try {
  cdp = new Cdp(await devtoolsAddress());
  await cdp.connect();
  console.log('Browser: Chrome connected');
  const { browserContextId } = await cdp.send('Target.createBrowserContext');
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: base }, sessionId);

  async function evaluate(expression) {
    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
    return result.result.value;
  }

  async function waitFor(expression, message, timeoutMs = 45_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(100);
    }
    throw new Error(message);
  }

  await waitFor(`document.querySelector('#connection')?.textContent === 'Connected'`, 'Profile did not connect.');
  console.log('Browser: Relay profile connected');
  assert.equal(await evaluate(`document.querySelector('.brand')?.textContent`), 'RELAY');
  assert.equal(await evaluate(`document.querySelector('#tagline')?.textContent`), 'say it better.');
  assert.equal(await evaluate(`document.querySelector('header')?.innerText.includes('Private')`), false, 'Private must not appear beside the brand.');
  await waitFor(`document.querySelector('.brand-logo')?.complete && document.querySelector('.brand-logo')?.naturalWidth === 512`, 'Relay logo did not load.');
  assert.ok(await evaluate(`document.querySelector('#profile-button svg.icon') !== null`), 'Profile should use an outline icon.');
  assert.equal(await evaluate(`document.querySelector('#manage-conversations-button').classList.contains('hidden')`), true, 'Manage must be hidden for an empty list.');
  assert.ok((await evaluate(`document.querySelector('#thread-list').textContent`)).includes('Start one when there is something you would rather not say alone.'));
  await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:async()=>{} } })`);
  await evaluate(`window.prompt = () => ''`);
  await evaluate(`document.querySelector('#thread-list [data-action="open-create"]').click()`);
  assert.equal(await evaluate(`document.querySelector('label[for="new-message"]').textContent`), 'What do you want to communicate?');
  assert.equal(await evaluate(`document.querySelector('#new-message').placeholder`), 'Write what you want the other person to understand.');
  assert.equal(await evaluate(`document.querySelector('#new-message + .hint').textContent`), "Your words stay private. Review Relay's draft before it is sent.");
  await evaluate(`document.querySelector('#new-message').value = 'Meet Friday at 3pm in the main office.'`);
  await evaluate(`document.querySelector('#create-button').click()`);
  await waitFor(`!document.querySelector('#draft-card').classList.contains('hidden') || document.querySelector('#toast').textContent.includes('not sent')`, 'Generate Draft produced no UI result.');
  const createError = await evaluate(`document.querySelector('#draft-card').classList.contains('hidden') ? document.querySelector('#toast').textContent : ''`);
  assert.equal(createError, '', 'Generate Draft failed in the browser: ' + createError);
  console.log('Browser: first draft generated');

  const professionalDraft = await evaluate(`document.querySelector('#draft-text').textContent`);
  assert.match(professionalDraft, /Friday/i);
  assert.match(professionalDraft, /main office/i);
  assert.equal(await evaluate(`document.querySelector('[data-tone="professional"]').classList.contains('active')`), true, 'Professional should be selected on the initial draft.');
  assert.equal(await evaluate(`document.querySelector('#draft-status').textContent`), 'Professional tone selected');
  assert.ok(await evaluate(`document.querySelector('#draft-card').getBoundingClientRect().top < document.querySelector('#message-list').getBoundingClientRect().top`), 'Approval card must appear above the thread.');

  await evaluate(`document.querySelector('[data-tone="friendly"]').click()`);
  await waitFor(`document.querySelector('[data-tone="friendly"]').classList.contains('active') && document.querySelector('#draft-status').textContent.includes('Friendly tone applied')`, 'Friendly tone did not finish.');
  console.log('Browser: Friendly tone applied');
  const friendlyDraft = await evaluate(`document.querySelector('#draft-text').textContent`);
  assert.notEqual(friendlyDraft.toLowerCase(), professionalDraft.toLowerCase(), 'Tone button must visibly rewrite the draft.');
  assert.match(friendlyDraft, /Friday/i);
  assert.match(friendlyDraft, /main office/i);

  await evaluate(`document.querySelector('[data-action="approve-draft"]').click()`);
  await waitFor(`document.querySelectorAll('#message-list .message.mine').length === 1`, 'Approved message did not enter the thread.');
  console.log('Browser: first message approved');
  assert.equal(await evaluate(`document.querySelector('#message-list .message.mine .message-original')?.textContent`), 'You said: "Meet Friday at 3pm in the main office."');
  assert.equal(await evaluate(`document.querySelector('#representative-toggle').textContent`), 'Representative ON');

  await evaluate(`document.querySelector('#shared-tab').click()`);
  assert.equal(await evaluate(`document.querySelector('#message-list .message-original')`), null, 'Shared view exposed a private original.');
  assert.ok((await evaluate(`document.querySelector('#private-tab').textContent`)).includes('Private'));
  assert.ok((await evaluate(`document.querySelector('#shared-tab').textContent`)).includes('Shared'));

  await evaluate(`document.querySelector('[data-action="go-home"]').click()`);
  await waitFor(`document.querySelectorAll('#thread-list .conversation-row').length === 1`, 'Conversation did not appear on the home screen.');
  assert.match(await evaluate(`document.querySelector('#thread-list .row-title span')?.textContent`), /Friday/i);
  assert.equal(await evaluate(`document.querySelector('#manage-conversations-button').classList.contains('hidden')`), false, 'Manage should appear when conversations exist.');
  assert.equal(await evaluate(`document.querySelector('#thread-list .row-actions').classList.contains('hidden')`), true, 'Remove controls should be hidden outside Manage mode.');
  await evaluate(`document.querySelector('#manage-conversations-button').click()`);
  assert.equal(await evaluate(`document.querySelector('#manage-conversations-button').textContent`), 'Done');
  assert.equal(await evaluate(`document.querySelector('#thread-list .row-actions').classList.contains('hidden')`), false, 'Manage mode should reveal Remove controls.');
  await evaluate(`document.querySelector('#manage-conversations-button').click()`);
  assert.equal(await evaluate(`document.querySelector('#thread-list .row-actions').classList.contains('hidden')`), true);
  const conversationScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-conversations.png', Buffer.from(conversationScreenshot.data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  const mobileConversationScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-conversations-mobile.png', Buffer.from(mobileConversationScreenshot.data, 'base64'));
  await evaluate(`document.querySelector('#home-contacts-tab').click()`);
  assert.equal(await evaluate(`document.querySelector('#home-contacts-panel').classList.contains('hidden')`), false);
  assert.equal(await evaluate(`document.querySelector('#home-conversations-panel').classList.contains('hidden')`), true);

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-mobile.png', Buffer.from(screenshot.data, 'base64'));
  console.log('Browser E2E passed: brand, empty/manage states, approval placement, visible tone rewrite, private/shared privacy, message styling, Representative control, Contacts tab, and mobile rendering.');
} catch (error) {
  console.error('Browser E2E failed:', error?.stack || error);
  if (chromeError) console.error(chromeError);
  process.exitCode = 1;
} finally {
  cdp?.close();
  if (chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await Promise.race([once(chrome, 'exit'), delay(3000)]);
  }
  await rm(profileDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
}
