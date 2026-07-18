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

class RelayClient {
  constructor(profile) {
    this.profile = profile;
    this.waiters = [];
    this.socket = new WebSocket(base.replace(/^http/, 'ws') + '/ws');
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      for (const waiter of [...this.waiters]) {
        if (!waiter.predicate(message)) continue;
        clearTimeout(waiter.timer);
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    });
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    const welcomed = this.wait(message => message.type === 'welcome');
    this.send({ type: 'init', recoveryCode: this.profile.recoveryCode });
    await welcomed;
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  wait(predicate, timeoutMs = 45_000) {
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(new Error('Timed out waiting for the invite owner.'));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() {
    this.socket.close();
  }
}

async function createInviteOwner() {
  const response = await fetch(base + '/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 201);
  const profile = await response.json();
  const client = new RelayClient(profile);
  await client.connect();
  const named = client.wait(message => message.type === 'bootstrap' && message.profile.name === 'Invite Owner');
  client.send({ type: 'set-name', name: 'Invite Owner' });
  await named;
  const creating = client.wait(message => message.type === 'goal-created');
  client.send({ type: 'create-goal', message: 'Can we discuss the project timeline?', tone: 'professional' });
  const created = await creating;
  assert.equal(created.shareUrl, null);
  const approved = client.wait(message => message.type === 'goal-updated' && message.goal.id === created.goal.id && message.goal.thread.length === 1);
  const inviteReady = client.wait(message => message.type === 'invite-ready' && message.goalId === created.goal.id);
  client.send({ type: 'approve-outbound', goalId: created.goal.id });
  await approved;
  return { client, goalId: created.goal.id, shareUrl: (await inviteReady).shareUrl };
}

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
let inviteOwner;
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
  inviteOwner = await createInviteOwner();
  const invitePath = new URL(inviteOwner.shareUrl).pathname;
  await cdp.send('Page.navigate', { url: base + invitePath }, sessionId);

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
  assert.equal(await evaluate(`document.querySelector('#name-banner').classList.contains('hidden')`), true, 'The generic name banner must not compete with an invite.');
  assert.equal(await evaluate(`document.querySelector('#invite-name-dialog').open`), true, 'An invite should open the focused name popup.');
  assert.equal(await evaluate(`document.querySelector('#invite-name-title').textContent`), 'Join conversation');
  assert.equal(await evaluate(`document.querySelector('#home-view').hidden`), true, 'Home actions must not compete with joining an invite.');
  assert.equal(await evaluate(`document.querySelector('#invite-stage').hidden`), false, 'A safe conversation preview should remain visible behind the popup.');
  assert.equal(await evaluate(`document.querySelector('#invite-stage').inert`), true, 'The preview must not accept input while the popup is open.');
  assert.ok((await evaluate(`document.querySelector('#invite-stage').textContent`)).includes('A private message is waiting.'));
  assert.equal((await evaluate(`document.querySelector('#invite-stage').textContent`)).includes('project timeline'), false, 'The actual request must remain private before claim.');
  assert.equal(await evaluate(`document.querySelector('#join-conversation-button').textContent`), 'Join conversation');
  await delay(500);
  assert.equal((await evaluate(`document.querySelector('#toast').textContent`)).includes('Invite unavailable'), false, 'An unnamed profile must not claim the invite.');
  assert.equal(await evaluate(`location.pathname`), invitePath, 'The pending invite path should remain until a name is saved.');
  const onboardingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-onboarding.png', Buffer.from(onboardingScreenshot.data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  const mobileOnboardingScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-onboarding-mobile.png', Buffer.from(mobileOnboardingScreenshot.data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await evaluate(`document.querySelector('#invite-name').value = 'Browser Test'; document.querySelector('#join-conversation-button').click()`);
  await waitFor(`!document.querySelector('#invite-name-dialog').open`, 'The invite name popup did not complete.');
  await waitFor(`location.pathname === '/' && location.search === ''`, 'The invite was not attempted after the name was saved.');
  await waitFor(`!document.querySelector('#conversation-view').hidden && document.querySelectorAll('#message-list .message:not(.mine)').length === 1`, 'The invite did not open its conversation.');
  assert.equal(await evaluate(`document.querySelector('#invite-stage').hidden`), true);
  assert.equal(await evaluate(`document.querySelector('#conversation-peer').textContent`), 'Invite Owner');
  console.log('Browser: invite name saved and conversation joined');
  await evaluate(`window.confirm = () => true; document.querySelector('[data-action="remove-conversation"]').click()`);
  await waitFor(`!document.querySelector('#home-view').hidden && document.querySelectorAll('#thread-list .conversation-row').length === 0`, 'The temporary joined conversation was not removed.');
  const ownerDeleted = inviteOwner.client.wait(message => message.type === 'conversation-deleted' && message.goalId === inviteOwner.goalId);
  inviteOwner.client.send({ type: 'delete-conversation-everyone', goalId: inviteOwner.goalId });
  await ownerDeleted;
  assert.equal(await evaluate(`document.querySelector('.brand')?.textContent`), 'RELAY');
  assert.equal(await evaluate(`document.querySelector('#tagline')?.textContent`), 'say it better.');
  assert.equal(await evaluate(`document.querySelector('header')?.innerText.includes('Private')`), false, 'Private must not appear beside the brand.');
  await waitFor(`document.querySelector('.brand-logo')?.complete && document.querySelector('.brand-logo')?.naturalWidth === 512`, 'Relay logo did not load.');
  assert.ok(await evaluate(`document.querySelector('#profile-button svg.icon') !== null`), 'Profile should use an outline icon.');
  assert.equal(await evaluate(`document.querySelector('#manage-conversations-button').classList.contains('hidden')`), true, 'Manage must be hidden for an empty list.');
  assert.ok((await evaluate(`document.querySelector('#thread-list').textContent`)).includes('Start one when there is something you would rather not say alone.'));
  await evaluate(`window.__copied = ''; Object.defineProperty(navigator, 'share', { configurable:true, value:undefined }); Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:async value => { window.__copied = value; } } })`);
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
  assert.equal(await evaluate(`window.__copied`), '', 'The invite must not be copied before approval.');
  assert.equal(await evaluate(`document.querySelector('#conversation-actions').classList.contains('hidden')`), true, 'Share and destructive actions must stay hidden during first approval.');
  assert.equal(await evaluate(`document.querySelector('#approve-draft-button').textContent`), 'Approve and share');
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
  await waitFor(`/\\/i\\/[A-Za-z0-9_-]{22}$/.test(window.__copied)`, 'Approval did not copy the invite link.');
  assert.doesNotMatch(await evaluate(`window.__copied`), /response is needed/i, 'Clipboard fallback should contain only the link.');
  assert.equal(await evaluate(`document.querySelector('#conversation-actions').classList.contains('hidden')`), false);
  assert.equal(await evaluate(`document.querySelector('#share-button').classList.contains('hidden')`), false);
  console.log('Browser: first message approved');
  const singleConversationScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-single-conversation.png', Buffer.from(singleConversationScreenshot.data, 'base64'));
  assert.equal(await evaluate(`document.querySelector('#message-list .message.mine .private-label')?.textContent`), 'Only you can see this');
  assert.equal(await evaluate(`document.querySelector('#message-list .message.mine .original-text')?.textContent`), 'You said: "Meet Friday at 3pm in the main office."');
  assert.equal(await evaluate(`document.querySelector('#representative-toggle').textContent`), 'Representative ON');

  assert.equal(await evaluate(`document.querySelector('#private-tab')`), null, 'The permanent Private tab should be removed.');
  assert.equal(await evaluate(`document.querySelector('#shared-tab')`), null, 'The permanent Shared tab should be removed.');
  assert.equal(await evaluate(`document.querySelector('#shared-preview-button').classList.contains('hidden')`), false);
  await evaluate(`document.querySelector('#shared-preview-button').click()`);
  assert.equal(await evaluate(`document.querySelector('#shared-preview-banner').classList.contains('hidden')`), false);
  assert.equal(await evaluate(`document.querySelector('#shared-preview-button').getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`document.querySelector('#message-list .message-original')`), null, 'Shared preview exposed a private original.');
  assert.equal(await evaluate(`document.querySelector('#message-list .message-delete')`), null, 'Shared preview should be read-only.');
  assert.equal(await evaluate(`document.querySelector('#composer-area').classList.contains('hidden')`), true, 'Shared preview should hide the composer.');
  const sharedPreviewScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-shared-preview.png', Buffer.from(sharedPreviewScreenshot.data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  const mobileSharedPreviewScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  await writeFile('/tmp/relay-local-shared-preview-mobile.png', Buffer.from(mobileSharedPreviewScreenshot.data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await evaluate(`document.querySelector('#shared-preview-banner [data-action="toggle-shared-preview"]').click()`);
  assert.equal(await evaluate(`document.querySelector('#shared-preview-banner').classList.contains('hidden')`), true);
  assert.equal(await evaluate(`document.querySelector('#message-list .message-original') !== null`), true, 'Exiting preview should restore the private original.');

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
  await evaluate(`document.querySelector('#home-conversations-tab').click(); document.querySelector('#thread-list .conversation-row [data-action="open-thread"]').click()`);
  await waitFor(`!document.querySelector('#conversation-view').hidden`, 'The browser test conversation did not reopen for cleanup.');
  await evaluate(`document.querySelector('[data-action="delete-everyone"]').click()`);
  await waitFor(`!document.querySelector('#home-view').hidden && document.querySelectorAll('#thread-list .conversation-row').length === 0`, 'The browser test conversation was not deleted.');
  console.log('Browser E2E passed: focused invite naming, brand, empty/manage states, approval placement, visible tone rewrite, single-conversation privacy preview, message styling, Representative control, Contacts tab, and mobile rendering.');
} catch (error) {
  console.error('Browser E2E failed:', error?.stack || error);
  if (chromeError) console.error(chromeError);
  process.exitCode = 1;
} finally {
  inviteOwner?.client.close();
  cdp?.close();
  if (chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await Promise.race([once(chrome, 'exit'), delay(3000)]);
  }
  await rm(profileDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
}

// Node's built-in WebSocket can keep the close handshake alive after cleanup.
process.exit(process.exitCode || 0);
