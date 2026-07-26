import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';

const chromePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
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
const fixture = createHttpServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  if (request.url === '/facebook-post') {
    response.end(`<!doctype html><html><body>
      <div role="dialog" aria-label="Create post" style="position:fixed;left:200px;top:80px;width:500px;height:520px">
        <h2>Create post</h2>
        <div id="facebook-post" role="textbox" contenteditable="true" aria-label="What's on your mind?" data-placeholder="What's on your mind?" style="width:460px;min-height:120px"></div>
      </div>
    </body></html>`);
    return;
  }
  if (request.url === '/facebook-reply') {
    response.end(`<!doctype html><html><body>
      <div role="dialog" aria-label="Post comments" style="position:fixed;left:180px;top:60px;width:560px;height:560px">
        <article role="article">
          <div data-testid="post_message" dir="auto">Is this laptop still available?</div>
          <div><span dir="auto">Another Person</span><div dir="auto">I think the price is too high.</div></div>
          <div><span dir="auto">Vignesh Kamaraj</span><div dir="auto">Interested, please send the price and details.</div></div>
          <form aria-label="Reply to Vignesh Kamaraj">
            <div id="facebook-reply" role="textbox" contenteditable="true" aria-label="Reply to Vignesh Kamaraj" style="width:480px;min-height:60px">Vignesh Kamaraj</div>
          </form>
        </article>
      </div>
    </body></html>`);
    return;
  }
  if (request.url === '/facebook-typed-reply') {
    response.end(`<!doctype html><html><body>
      <div role="dialog" aria-label="Post comments" style="position:fixed;left:180px;top:60px;width:560px;height:560px">
        <article role="article">
          <a role="link" href="/vignesh">Vignesh Kamaraj</a>
          <div dir="auto">Interested, please send the price and details.</div>
          <form aria-label="Reply to Vignesh Kamaraj">
            <div id="facebook-typed-reply" role="textbox" contenteditable="true" aria-label="Reply to Vignesh Kamaraj" style="width:480px;min-height:60px">Thank You</div>
          </form>
        </article>
      </div>
    </body></html>`);
    return;
  }
  if (request.url === '/linkedin-post') {
    response.end(`<!doctype html><html><body>
      <button id="linkedin-start-post">Start a post</button>
    </body></html>`);
    return;
  }
  if (request.url === '/linkedin-comment') {
    response.end(`<!doctype html><html><body>
      <article class="feed-shared-update-v2" style="width:620px;min-height:400px">
        <div class="update-components-text">We are launching our robotics workshop next week.</div>
        <div class="comments-comment-item"><a href="/in/asha-rao">Asha Rao</a><div>What age group is this for?</div></div>
        <form class="comments-comment-box" aria-label="Add a comment">
          <div id="linkedin-comment" class="ql-editor" role="textbox" contenteditable="true" aria-label="Add a comment" style="width:560px;min-height:60px"></div>
        </form>
      </article>
    </body></html>`);
    return;
  }
  if (request.url === '/linkedin-comment-reply') {
    response.end(`<!doctype html><html><body>
      <article class="feed-shared-update-v2" style="width:620px;min-height:500px">
        <div class="update-components-text">We are launching our robotics workshop next week.</div>
        <div class="comments-comment-item"><a href="/in/other-person">Other Person</a><div>Congratulations!</div></div>
        <div class="comments-comment-item">
          <span>Vikram B.</span>
          <div>What age group is this for?</div>
          <form class="comments-reply-box" aria-label="Add a reply">
            <div id="linkedin-comment-reply" class="ql-editor" role="textbox" contenteditable="true" aria-label="Add a reply" style="width:540px;min-height:60px">Vikram B.</div>
            <button type="button">Reply</button>
          </form>
        </div>
      </article>
    </body></html>`);
    return;
  }
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
  '--window-size=1366,900',
  '--disable-extensions',
  `--user-data-dir=${profileDir}`,
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

  const loadSocialFixture = async (path, hostname) => {
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${fixturePort}${path}` });
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(path)}`)) break;
      if (attempt === 199) throw new Error(`Facebook fixture ${path} did not load.`);
      await delay(25);
    }
    await evaluate(`(() => {
      globalThis.__relayComposeRequests = [];
      const runtime = {
        lastError: null,
        connect() { throw new Error('Use deterministic test messaging'); },
        sendMessage(message, callback) {
          if (message?.type === 'relay-compose') {
            globalThis.__relayComposeRequests.push(message.body);
            if (message.body?.direction === 'force error') {
              callback({ ok: false, status: 429, data: { error: 'Please wait a moment before using Relay again.' } });
              return;
            }
            const suggestion = message.body?.goal === 'suggest';
            const refinement = message.body?.goal === 'improve_text';
            callback({ ok: true, status: 200, data: {
              draft: suggestion
                ? 'Yes, it is available. I’ll send the price and details.'
                : refinement ? 'Do it right now.' : 'Do it now.',
              needsClarification: false
            } });
            return;
          }
          callback({ ok: true, status: 200, data: {} });
        }
      };
      try { Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime } }); }
      catch { globalThis.chrome.runtime = runtime; }
    })()`);
    // Exercise the exact artifact while making only the hostname deterministic.
    const socialSource = contentSource.replaceAll('location.hostname.toLowerCase()', JSON.stringify(hostname));
    await evaluate(`(0, eval)(${JSON.stringify(socialSource)})`);
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (await evaluate(`Boolean(document.querySelector('#relay-extension-host')?.shadowRoot)`)) return;
      if (attempt === 199) throw new Error(`Relay did not load for ${path}.`);
      await delay(25);
    }
  };

  await loadSocialFixture('/facebook-post', 'facebook.com');
  await evaluate(`(() => {
    const field=document.querySelector('#facebook-post');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').click();
  })()`);
  await delay(50);
  const facebookPostOpen = await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const dialog=document.querySelector('[role=dialog]').getBoundingClientRect();
    const box=bridge.getBoundingClientRect();
    return {
      visible:bridge.style.display==='block',
      question:bridge.querySelector('[data-relay-question]').textContent,
      createDisabled:bridge.querySelector('[data-relay-create]').disabled,
      suggestHidden:bridge.querySelector('[data-relay-suggest]').hidden,
      browserPrompt:document.body.textContent.includes('Use browser prompt instead'),
      overlaps:!(box.right<=dialog.left||box.left>=dialog.right||box.bottom<=dialog.top||box.top>=dialog.bottom)
    };
  })()`);
  assert.equal(facebookPostOpen.visible, true, 'Facebook post compose must use the top-layer Relay panel');
  assert.equal(facebookPostOpen.question, 'What do you want to post?');
  assert.equal(facebookPostOpen.createDisabled, true, 'An empty post needs an instruction');
  assert.equal(facebookPostOpen.suggestHidden, true, 'Post compose must not offer reply suggestions');
  assert.equal(facebookPostOpen.browserPrompt, false, 'The obsolete browser prompt fallback must not return');
  assert.equal(facebookPostOpen.overlaps, false, 'Relay must sit beside, not over, the Facebook post modal');

  await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const input=bridge.querySelector('[data-relay-direction]');
    input.value='doo it noww';
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:input.value}));
    bridge.querySelector('[data-relay-create]').click();
  })()`);
  await delay(100);
  const facebookPostDraft = await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    return {
      question:bridge.querySelector('[data-relay-question]').textContent,
      preview:bridge.querySelector('[data-relay-preview]').textContent,
      toneHidden:bridge.querySelector('[data-relay-tone]').hidden,
      actionsHidden:bridge.querySelector('[data-relay-actions]').hidden
    };
  })()`);
  assert.equal(facebookPostDraft.question, 'Post ready');
  assert.equal(facebookPostDraft.preview, 'Do it now.');
  assert.equal(facebookPostDraft.toneHidden, false, 'Facebook post drafts must expose tone changes');
  assert.equal(facebookPostDraft.actionsHidden, false);
  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-tone]').click()`);
  await delay(100);
  const facebookTone = await evaluate(`(() => ({
    requested:globalThis.__relayComposeRequests.at(-1)?.tone,
    label:document.querySelector('#relay-top-bridge [data-relay-tone-label]').textContent
  }))()`);
  assert.equal(facebookTone.requested, 'warm', 'Facebook tone changes must call generation directly');
  assert.match(facebookTone.label, /Warm tone/, 'The Facebook panel must show the active tone');
  await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const input=bridge.querySelector('[data-relay-refine]');
    input.value='Make it more immediate';
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:input.value}));
    bridge.querySelector('[data-relay-refine-button]').click();
  })()`);
  await delay(100);
  const facebookRefine = await evaluate(`(() => ({
    request:globalThis.__relayComposeRequests.at(-1),
    preview:document.querySelector('#relay-top-bridge [data-relay-preview]').textContent
  }))()`);
  assert.equal(facebookRefine.request.goal, 'improve_text', 'Facebook Refine must use the refinement goal');
  assert.equal(facebookRefine.request.text, 'Do it now.', 'Facebook Refine must use the generated draft as its source');
  assert.equal(facebookRefine.request.direction, 'Make it more immediate', 'Facebook Refine must send the refinement instruction');
  assert.equal(facebookRefine.preview, 'Do it right now.', 'Facebook Refine must replace the preview with the refined draft');

  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-startover]').click()`);
  await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const input=bridge.querySelector('[data-relay-direction]');
    input.value='force error';
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:input.value}));
    bridge.querySelector('[data-relay-create]').click();
  })()`);
  await delay(100);
  assert.match(
    await evaluate(`document.querySelector('#relay-top-bridge [data-relay-status]').textContent`),
    /Please wait a moment/,
    'Facebook must show generation failures instead of appearing unresponsive'
  );
  await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const input=bridge.querySelector('[data-relay-direction]');
    input.value='do it now';
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:input.value}));
    bridge.querySelector('[data-relay-create]').click();
  })()`);
  await delay(100);
  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-insert]').click()`);
  await delay(100);
  assert.equal(
    await evaluate(`document.querySelector('#facebook-post').innerText`),
    'Do it now.',
    'Facebook insertion must replace the editor exactly once'
  );

  await loadSocialFixture('/facebook-reply', 'facebook.com');
  await evaluate(`(() => {
    const field=document.querySelector('#facebook-reply');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').click();
  })()`);
  await delay(50);
  const facebookReplyOpen = await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    return {
      question:bridge.querySelector('[data-relay-question]').textContent,
      suggestHidden:bridge.querySelector('[data-relay-suggest]').hidden,
      suggestDisabled:bridge.querySelector('[data-relay-suggest]').disabled
    };
  })()`);
  assert.equal(facebookReplyOpen.question, 'What should this reply say?', 'A Facebook name mention is not authored reply text');
  assert.equal(facebookReplyOpen.suggestHidden, false, 'Facebook replies must offer context-based suggestions');
  assert.equal(facebookReplyOpen.suggestDisabled, false, 'Visible post/comment context must enable suggestions');
  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-suggest]').click()`);
  await delay(100);
  const specificReplyContext = await evaluate(`globalThis.__relayComposeRequests.at(-1)?.context?.nearbyText || ''`);
  assert.match(specificReplyContext, /^Replying to Vignesh Kamaraj's comment:/, 'The specific replied-to Facebook comment must be first in context');
  assert.match(specificReplyContext, /Interested, please send the price and details\./, 'The specific comment body must be captured');
  assert.equal(
    await evaluate(`document.querySelector('#relay-top-bridge [data-relay-preview]').textContent`),
    'Yes, it is available. I’ll send the price and details.',
    'Facebook suggestions must use the direct generation path'
  );

  await loadSocialFixture('/facebook-typed-reply', 'facebook.com');
  await evaluate(`(() => {
    const field=document.querySelector('#facebook-typed-reply');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').click();
  })()`);
  await delay(50);
  const typedReplyQuestion = await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.question').textContent`);
  assert.equal(typedReplyQuestion, 'Improve this reply', 'A genuine short Facebook reply must not be discarded as a name placeholder');
  await evaluate(`(() => {
    const fragment=document.createDocumentFragment();
    for(let index=0;index<500;index+=1) fragment.append(document.createElement('i'));
    document.body.append(fragment);
  })()`);
  await Promise.race([
    delay(100),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Facebook mutation handling stalled')), 1000))
  ]);

  await loadSocialFixture('/linkedin-post', 'linkedin.com');
  await evaluate(`(() => {
    document.querySelector('#linkedin-start-post').addEventListener('click', () => setTimeout(() => {
      const modal=document.createElement('div');
      modal.className='artdeco-modal share-creation-state';
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-label','Create a post');
      modal.style.cssText='position:fixed;left:220px;top:70px;width:760px;height:540px';
      modal.innerHTML='<h2>Create a post</h2><div class="share-creation-state__text-editor"><div id="linkedin-post" class="ql-editor" role="textbox" contenteditable="true" aria-label="Text editor for creating content" style="width:720px;min-height:130px"></div></div>';
      document.body.append(modal);
    }, 40));
    document.querySelector('#linkedin-start-post').click();
  })()`);
  await delay(180);
  const linkedinDetected = await evaluate(`(() => {
    const root=document.querySelector('#relay-extension-host').shadowRoot;
    return {chip:root.querySelector('.chip').classList.contains('visible'),text:document.querySelector('#linkedin-post').innerText};
  })()`);
  assert.equal(linkedinDetected.chip, true, 'LinkedIn empty post compose must be detected before typing');
  assert.equal(linkedinDetected.text, '');
  await evaluate(`document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').click()`);
  await delay(50);
  const linkedinPostOpen = await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const dialog=document.querySelector('[role=dialog]').getBoundingClientRect();
    const box=bridge.getBoundingClientRect();
    return {
      question:bridge.querySelector('[data-relay-question]').textContent,
      suggestHidden:bridge.querySelector('[data-relay-suggest]').hidden,
      createDisabled:bridge.querySelector('[data-relay-create]').disabled,
      overlaps:!(box.right<=dialog.left||box.left>=dialog.right||box.bottom<=dialog.top||box.top>=dialog.bottom)
    };
  })()`);
  assert.equal(linkedinPostOpen.question, 'What do you want to post?');
  assert.equal(linkedinPostOpen.suggestHidden, true, 'LinkedIn post compose must not offer reply suggestions');
  assert.equal(linkedinPostOpen.createDisabled, true);
  assert.equal(linkedinPostOpen.overlaps, false, 'Relay must fit beside the LinkedIn post modal');
  const linkedinFocusTrapTyping = await evaluate(`(() => {
    const field=document.querySelector('#linkedin-post');
    field.focus();
    for (const key of ['h','i']) field.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    const bridgeInput=document.querySelector('#relay-top-bridge [data-relay-direction]');
    const value=bridgeInput.value;
    bridgeInput.value='';
    bridgeInput.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward',data:null}));
    return value;
  })()`);
  assert.equal(linkedinFocusTrapTyping, 'hi', 'Relay must capture typing even when LinkedIn steals focus back to its modal');
  const linkedinComposerInteractive = await evaluate(`(() => {
    const field=document.querySelector('#linkedin-post');
    field.focus();
    field.textContent='rough website draft';
    field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'rough website draft'}));
    return {
      inert:Boolean(field.closest('[inert]')),
      active:document.activeElement===field,
      text:field.innerText
    };
  })()`);
  assert.equal(linkedinComposerInteractive.inert, false, 'Relay must not make the LinkedIn modal inert');
  assert.equal(linkedinComposerInteractive.active, true, 'The user must be able to return focus to LinkedIn');
  assert.equal(linkedinComposerInteractive.text, 'rough website draft', 'The LinkedIn composer must remain editable while Relay is open');
  await evaluate(`(() => {
    const field=document.querySelector('#linkedin-post');
    field.textContent='';
    field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward',data:null}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip')?.click();
  })()`);
  await delay(50);
  await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    const input=bridge.querySelector('[data-relay-direction]');
    input.value='announce robotics workshop next week';
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:input.value}));
    bridge.querySelector('[data-relay-create]').click();
  })()`);
  await delay(100);
  assert.equal(
    await evaluate(`document.querySelector('#relay-top-bridge [data-relay-question]').textContent`),
    'Post ready',
    'LinkedIn post generation must use the post flow'
  );
  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-insert]').click()`);
  await delay(100);
  assert.equal(
    await evaluate(`document.querySelector('#linkedin-post').innerText`),
    'Do it now.',
    'LinkedIn post insertion must write exactly once'
  );

  await loadSocialFixture('/linkedin-comment', 'linkedin.com');
  await evaluate(`(() => {
    const field=document.querySelector('#linkedin-comment');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').click();
  })()`);
  await delay(50);
  const linkedinCommentOpen = await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    return {
      question:bridge.querySelector('[data-relay-question]').textContent,
      suggestHidden:bridge.querySelector('[data-relay-suggest]').hidden,
      suggestDisabled:bridge.querySelector('[data-relay-suggest]').disabled
    };
  })()`);
  assert.equal(linkedinCommentOpen.question, 'What should this reply say?');
  assert.equal(linkedinCommentOpen.suggestHidden, false, 'LinkedIn post comments must offer suggestions');
  assert.equal(linkedinCommentOpen.suggestDisabled, false, 'LinkedIn post context must enable suggestions');
  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-suggest]').click()`);
  await delay(100);
  assert.match(
    await evaluate(`globalThis.__relayComposeRequests.at(-1)?.context?.nearbyText || ''`),
    /LinkedIn post:\s*We are launching our robotics workshop next week\./,
    'LinkedIn top-level comments must include the post context'
  );

  await loadSocialFixture('/linkedin-comment-reply', 'linkedin.com');
  await evaluate(`(() => {
    const field=document.querySelector('#linkedin-comment-reply');
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    document.querySelector('#relay-extension-host').shadowRoot.querySelector('.chip').click();
  })()`);
  await delay(50);
  const linkedinSpecificReply = await evaluate(`(() => {
    const bridge=document.querySelector('#relay-top-bridge');
    return {
      question:bridge.querySelector('[data-relay-question]').textContent,
      suggestHidden:bridge.querySelector('[data-relay-suggest]').hidden,
      suggestDisabled:bridge.querySelector('[data-relay-suggest]').disabled
    };
  })()`);
  assert.equal(linkedinSpecificReply.question, 'What should this reply say?', 'A LinkedIn mention is not authored reply text');
  assert.equal(linkedinSpecificReply.suggestHidden, false);
  assert.equal(linkedinSpecificReply.suggestDisabled, false);
  await evaluate(`document.querySelector('#relay-top-bridge [data-relay-suggest]').click()`);
  await delay(100);
  const linkedinSpecificContext = await evaluate(`globalThis.__relayComposeRequests.at(-1)?.context?.nearbyText || ''`);
  assert.match(linkedinSpecificContext, /^Replying to Vikram B\.'s LinkedIn comment:/, 'The exact LinkedIn comment must be first in context');
  assert.match(linkedinSpecificContext, /What age group is this for\?/, 'The replied-to LinkedIn comment body must be captured');
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
