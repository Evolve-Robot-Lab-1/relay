import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const base = process.argv.find(value => /^https?:\/\//.test(value)) || 'https://relay.durgaai.com';
const chromePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const profileDir = await mkdtemp(join(tmpdir(), 'relay-quick-browser-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
chrome.stderr.on('data', chunk => { chromeError = (chromeError + chunk).slice(-4_000); });

async function pageSocketUrl() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find(target => target.type === 'page');
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
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome timed out running ${method}.\n${chromeError}`));
      }, 15_000);
      this.pending.set(id, { resolve, reject, timer });
    });
  }
}

let cdp;
try {
  cdp = new Cdp(await pageSocketUrl());
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send('Page.navigate', { url: base + '/write' });

  async function evaluate(expression) {
    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
    return result.result.value;
  }

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(`document.readyState === 'complete' && Boolean(document.querySelector('#quick-input'))`)) break;
    if (attempt === 199) throw new Error('Quick Relay did not load.');
    await delay(50);
  }

  const layout = await evaluate(`({
    path: location.pathname,
    innerWidth,
    scrollY,
    scrollWidth: document.documentElement.scrollWidth,
    quickVisible: !document.querySelector('#quick-view').hidden,
    profileHidden: document.querySelector('#profile-button').classList.contains('hidden'),
    recoveryCreated: Boolean(localStorage.getItem('relayRecovery'))
  })`);
  assert.equal(layout.path, '/write');
  assert.equal(layout.innerWidth, 390);
  assert.equal(layout.scrollY, 0, 'Quick Relay should not auto-focus and scroll on mobile');
  assert.ok(layout.scrollWidth <= 390, `Mobile page overflows to ${layout.scrollWidth}px`);
  assert.equal(layout.quickVisible, true);
  assert.equal(layout.profileHidden, true);
  assert.equal(layout.recoveryCreated, false, 'Quick Relay must not create an account');

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/relay-quick-mobile-cdp.png', Buffer.from(screenshot.data, 'base64'));
  console.log(`Quick Relay browser checks passed at ${layout.innerWidth}px with no horizontal overflow.`);
} finally {
  cdp?.socket.close();
  chrome.kill('SIGTERM');
  await rm(profileDir, { recursive: true, force: true });
}
