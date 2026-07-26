import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';

const chromePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const extensionPath = resolve(new URL('../extension', import.meta.url).pathname);
const contentSource = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const profileDir = await mkdtemp(join(tmpdir(), 'relay-extension-browser-'));
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(error => error ? reject(error) : resolvePort(address.port));
    });
  });
}

const fixturePort = await freePort();
const debugPort = await freePort();
const fixture = createHttpServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html><body>
    <main><p id="incoming">Could you send the proposal by Friday?</p>
      <label for="compose">Your reply</label><textarea id="compose" placeholder="Write a thoughtful reply"></textarea>
      <label for="gmail-reply">Gmail reply</label><div id="gmail-reply" role="textbox" contenteditable="" aria-label="Reply"><div class="gmail_signature">Regards,<br>Evolve Robot Lab</div></div>
      <label for="long-answer">Application answer</label><input id="long-answer" name="motivation answer" type="text" maxlength="500">
      <label for="address">Street address</label><input id="address" name="street address" type="text" maxlength="200">
      <label for="password">Password</label><input id="password" type="password">
    </main></body></html>`);
});
await new Promise((resolveListen, reject) => fixture.listen(fixturePort, '127.0.0.1', error => error ? reject(error) : resolveListen()));

const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--enable-extensions',
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionPath}`,
  `--load-extension=${extensionPath}`,
  `--remote-debugging-port=${debugPort}`,
  `http://127.0.0.1:${fixturePort}/`
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeError = '';
chrome.stderr.on('data', chunk => { chromeError = (chromeError + chunk).slice(-4000); });

async function pageSocketUrl() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find(target => target.type === 'page' && target.url.startsWith(`http://127.0.0.1:${fixturePort}`));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(50);
  }
  throw new Error(`Chrome DevTools did not start.\n${chromeError}`);
}

class Cdp {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }
  async connect() {
    await new Promise((resolveConnect, reject) => {
      this.socket.addEventListener('open', resolveConnect, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, reject) => this.pending.set(id, { resolve: resolveSend, reject }));
  }
}

let cdp;
try {
  cdp = new Cdp(await pageSocketUrl());
  await cdp.connect();
  await cdp.send('Runtime.enable');
  const evaluate = async expression => {
    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed.');
    return result.result.value;
  };

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(`document.readyState === 'complete' && Boolean(document.querySelector('#compose'))`)) break;
    if (attempt === 199) throw new Error('Extension fixture did not load.');
    await delay(50);
  }

  // Headless Chrome does not consistently activate unpacked extensions across
  // distributions, so execute the exact content-script artifact in the fixture.
  await evaluate(`(0, eval)(${JSON.stringify(contentSource)})`);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector('#relay-extension-host')?.shadowRoot)`)) break;
    if (attempt === 199) throw new Error(`Relay extension did not load.\n${chromeError}`);
    await delay(50);
  }

  await evaluate(`(() => {
    const field = document.querySelector('#compose');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  })()`);
  await delay(100);
  const focused = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; return { chip:root.querySelector('.chip').classList.contains('visible'), value:document.querySelector('#compose').value }; })()`);
  assert.equal(focused.chip, true, 'Empty writing fields should show the Relay chip');
  assert.equal(focused.value, '', 'Focusing Relay must not change the field');

  await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await delay(50);
  const opened = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; const button=root.querySelector('.action-btn.primary'); const suggest=root.querySelector('.action-btn.secondary'); return { panel:root.querySelector('.panel').classList.contains('open'), goals:root.querySelectorAll('.goal').length, question:root.querySelector('.question').textContent, placeholder:root.querySelector('.direction').placeholder, directionVisible:root.querySelector('.direction-wrap').classList.contains('visible'), button:button.textContent, draftDisabled:button.disabled, suggestHidden:suggest.hidden, suggestDisabled:suggest.disabled, value:document.querySelector('#compose').value }; })()`);
  assert.equal(opened.panel, true);
  assert.equal(opened.goals, 0, 'Relay must not ask users to classify their writing');
  assert.equal(opened.question, 'What should this reply say?');
  assert.equal(opened.placeholder, 'What you need to achieve or situation to navigate…');
  assert.equal(opened.directionVisible, true);
  assert.equal(opened.button, 'Create draft');
  assert.equal(opened.draftDisabled, true, 'Empty fields require a short direction so Relay does not guess');
  assert.equal(opened.suggestHidden, false, 'Reply fields must offer conversation-based suggestions');
  assert.equal(opened.suggestDisabled, false, 'Visible conversation context must enable suggestions without typed direction');
  assert.equal(opened.value, '', 'Opening Relay must not mutate the website field');

  await evaluate(`(() => {
    const root=document.querySelector('#relay-extension-host').shadowRoot;
    const direction=root.querySelector('.direction');
    direction.value='Ask whether Friday afternoon works';
    direction.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:direction.value}));
  })()`);
  const directionReady = await evaluate(`!document.querySelector('#relay-extension-host').shadowRoot.querySelector('.action-btn.primary').disabled`);
  assert.equal(directionReady, true, 'A plain-language direction must enable drafting');

  const initialPlacement = await evaluate(`(() => {
    const root=document.querySelector('#relay-extension-host').shadowRoot;
    const panel=root.querySelector('.panel').getBoundingClientRect();
    const editor=document.querySelector('#compose').getBoundingClientRect();
    return !(panel.right <= editor.left || panel.left >= editor.right || panel.bottom <= editor.top || panel.top >= editor.bottom);
  })()`);
  assert.equal(initialPlacement, false, 'Relay panel must not cover the focused website field when adjacent space exists');

  await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.minimize').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  const minimized = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; return { panel:root.querySelector('.panel').classList.contains('open'), chip:root.querySelector('.chip').classList.contains('visible') }; })()`);
  assert.equal(minimized.panel, false, 'Minimize must hide the panel');
  assert.equal(minimized.chip, true, 'Minimize must leave a Relay control to resume');

  await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  const resumed = await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.panel').classList.contains('open')`);
  assert.equal(resumed, true, 'The Relay chip must resume a minimized session');

  await evaluate(`(() => {
    const field=document.querySelector('#compose');
    field.value='SE THIS NOW.MODIFIED';
    field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:field.value}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  })()`);
  await delay(50);
  const improveState = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; const button=root.querySelector('.action-btn.primary'); return {question:root.querySelector('.question').textContent,directionVisible:root.querySelector('.direction-wrap').classList.contains('visible'),actionsVisible:root.querySelector('.action-row').classList.contains('visible'),suggestHidden:root.querySelector('.action-btn.secondary').hidden,button:button.textContent,buttonDisabled:button.disabled}; })()`);
  assert.equal(improveState.question, 'Improve this reply');
  assert.equal(improveState.directionVisible, false, 'Existing text must not produce a second input box');
  assert.equal(improveState.actionsVisible, true, 'Existing text must show its Improve action');
  assert.equal(improveState.suggestHidden, true, 'Existing text must not show reply suggestions');
  assert.equal(improveState.button, 'Improve');
  assert.equal(improveState.buttonDisabled, false);

  await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.close').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  const closed = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; return {panel:root.querySelector('.panel').classList.contains('open'),chip:root.querySelector('.chip').classList.contains('visible'),value:document.querySelector('#compose').value}; })()`);
  assert.equal(closed.panel, false, 'Close must discard the Relay session');
  assert.equal(closed.chip, true, 'Close must return to the Relay launcher');
  assert.equal(closed.value, 'SE THIS NOW.MODIFIED', 'Closing before insertion must preserve the raw website text');

  await evaluate(`(() => {
    const field = document.querySelector('#gmail-reply');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  })()`);
  await delay(50);
  const signatureOnly = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; return { question:root.querySelector('.question').textContent, directionVisible:root.querySelector('.direction-wrap').classList.contains('visible'), button:root.querySelector('.action-btn.primary').textContent, signature:document.querySelector('#gmail-reply .gmail_signature').textContent }; })()`);
  assert.equal(signatureOnly.question, 'What should this reply say?', 'A Gmail signature alone must not count as reply text');
  assert.equal(signatureOnly.directionVisible, true, 'A signature-only reply must ask what the user wants to say');
  assert.equal(signatureOnly.button, 'Create draft');
  assert.match(signatureOnly.signature, /Evolve Robot Lab/, 'Opening Relay must preserve the Gmail signature');
  await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.close').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);

  await evaluate(`(() => {
    const field = document.querySelector('#address');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  })()`);
  await delay(50);
  const sensitiveHidden = await evaluate(`(() => { const root=document.querySelector('#relay-extension-host').shadowRoot; return !root.querySelector('.chip').classList.contains('visible') && !root.querySelector('.panel').classList.contains('open'); })()`);
  assert.equal(sensitiveHidden, true, 'Address fields must not show Relay');

  await evaluate(`(() => {
    const field = document.querySelector('#long-answer');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  })()`);
  await delay(50);
  const longAnswerVisible = await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').classList.contains('visible')`);
  assert.equal(longAnswerVisible, true, 'Long writing inputs should show Relay');
  console.log('Relay extension browser checks passed.');
} finally {
  cdp?.socket.close();
  if (chrome.exitCode === null) {
    const stopped = new Promise(resolveStop => chrome.once('exit', resolveStop));
    chrome.kill('SIGTERM');
    await Promise.race([stopped, delay(2000)]);
  }
  await new Promise(resolveClose => fixture.close(resolveClose));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(150);
    }
  }
}
