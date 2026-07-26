(() => {
  'use strict';

  const EDITOR_SELECTOR = 'textarea, input, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"], .ql-editor, .ProseMirror, [data-lexical-editor="true"]';
  const TONES = [
    ['natural', 'Natural'],
    ['warm', 'Warm'],
    ['direct', 'Direct']
  ];
  const WRITING_HINT = /\b(message|reply|response|answer|comment|description|details|reason|summary|bio|cover|proposal|feedback|explain|prompt|note|application|statement|experience|motivation)\b/i;
  const SENSITIVE_HINT = /\b(password|passcode|pin|otp|one.?time|card|credit|debit|cvv|cvc|security code|bank|account number|routing|iban|ssn|social security|tax id|passport|license number|first name|last name|full name|user.?name|e-?mail|phone|mobile|telephone|address|street|city|state|province|postal|zip|country)\b/i;

  let editor = null;
  let panelOpen = false;
  let busy = false;
  let internalWrite = false;
  let snapshot = null;
  let currentGoal = '';
  let toneIndex = 0;
  let generatedDraft = '';
  let userDirection = '';
  let clarificationAnswer = '';
  let undoState = null;
  let rememberedSelection = '';
  let rememberedSelectionAt = 0;
  const userEditedEditors = new WeakSet();

  const host = document.createElement('div');
  host.id = 'relay-extension-host';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      button, input, textarea { font: inherit; }
      .chip, .panel { position: fixed; pointer-events: auto; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .chip { align-items: center; background: #07130d; border: 1px solid #24503b; border-radius: 999px; box-shadow: 0 8px 28px rgba(0,0,0,.34); color: #04120b; cursor: pointer; display: none; font-size: 12px; font-weight: 800; gap: 6px; min-height: 34px; padding: 5px 12px; }
      .chip.visible { display: inline-flex; }
      .chip span { background: #00e982; border-radius: 999px; padding: 5px 9px; }
      .panel { background: #101512; border: 1px solid #2a3d32; border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.48); color: #edf5ef; display: none; max-height: min(580px, calc(100vh - 24px)); overflow: auto; padding: 16px; width: min(380px, calc(100vw - 24px)); }
      .panel.open { display: block; }
      .header { align-items: center; display: flex; justify-content: space-between; margin-bottom: 14px; }
      .brand { color: #00e982; font-size: 14px; font-weight: 850; letter-spacing: -.01em; }
      .header-actions { align-items: center; display: flex; gap: 2px; }
      .window-action { background: transparent; border: 0; border-radius: 8px; color: #9eaaa2; cursor: pointer; font-size: 20px; line-height: 1; min-width: 30px; padding: 3px 7px 5px; }
      .window-action:hover { background: #1b241f; color: #fff; }
      .question { font-size: 17px; font-weight: 760; letter-spacing: -.02em; margin: 0 0 5px; }
      .direction-wrap { display: none; margin-bottom: 9px; }
      .direction-wrap.visible { display: block; }
      .direction { background: #171e1a; border: 1px solid #34443b; border-radius: 12px; color: #f2f7f3; display: block; line-height: 1.45; min-height: 74px; outline: none; padding: 10px 11px; resize: vertical; width: 100%; }
      .direction:focus { border-color: #00e982; }
      .action-row { display: none; gap: 7px; margin-top: 9px; }
      .action-row.visible { display: flex; }
      .action-btn { border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 750; min-height: 36px; padding: 8px 12px; flex: 1; }
      .action-btn:disabled { cursor: not-allowed; opacity: .55; }
      .action-btn.primary { background: #00e982; border: 1px solid #00e982; color: #04120b; font-weight: 800; }
      .action-btn.secondary { background: #172019; border: 1px solid #3a4d42; color: #e9f1eb; }
      .status { color: #aab7af; font-size: 12px; line-height: 1.45; margin-top: 12px; min-height: 18px; }
      .preview { background: #171e1a; border: 1px solid #34443b; border-radius: 12px; color: #f2f7f3; display: none; font-size: 14px; line-height: 1.5; margin-top: 12px; max-height: 190px; overflow: auto; padding: 12px; white-space: pre-wrap; }
      .preview.visible { display: block; }
      .clarify { display: none; margin-top: 12px; }
      .clarify.visible { display: block; }
      .clarify-label { color: #dce7df; display: block; font-size: 13px; line-height: 1.4; margin-bottom: 7px; }
      .clarify-row { display: flex; gap: 7px; }
      .clarify-input { background: #0b0f0d; border: 1px solid #405148; border-radius: 10px; color: #fff; flex: 1; min-width: 0; outline: none; padding: 9px 10px; }
      .clarify-input:focus { border-color: #00e982; }
      .continue { background: #00e982; border: 0; border-radius: 10px; color: #04120b; cursor: pointer; font-size: 12px; font-weight: 800; padding: 0 12px; }
      .actions { display: none; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
      .actions.visible { display: flex; }
      .action { background: #172019; border: 1px solid #3a4d42; border-radius: 10px; color: #e9f1eb; cursor: pointer; font-size: 12px; font-weight: 750; min-height: 36px; padding: 8px 12px; }
      .action.primary { background: #00e982; border-color: #00e982; color: #04120b; }
      .action:disabled, .action-btn:disabled, .continue:disabled { cursor: not-allowed; opacity: .55; }
      .tone { color: #83aa92; font-size: 11px; margin-top: 8px; }
      .refine-wrap { display: none; }
      .refine-wrap.visible { display: block; }
      .refine { background: #171e1a; border: 1px solid #34443b; border-radius: 12px; color: #f2f7f3; display: block; line-height: 1.45; min-height: 58px; margin-top: 10px; outline: none; padding: 10px 11px; resize: vertical; width: 100%; }
      .refine:focus { border-color: #00e982; }
      .refine-row { display: flex; gap: 7px; margin-top: 7px; }
      .refine-btn { background: #172019; border: 1px solid #3a4d42; border-radius: 10px; color: #e9f1eb; cursor: pointer; font-size: 12px; font-weight: 750; min-height: 36px; padding: 8px 12px; flex: 1; }
      .refine-btn:disabled { cursor: not-allowed; opacity: .55; }
      .privacy { border-top: 1px solid #27342d; color: #7f8d84; font-size: 10px; line-height: 1.4; margin-top: 13px; padding-top: 10px; }
      @media (max-width: 480px) { .panel { width: calc(100vw - 16px); } }
    </style>
    <button class="chip" type="button" aria-label="Open Relay"><span>Relay</span></button>
    <section class="panel" role="dialog" aria-label="Relay writing copilot" aria-modal="false">
      <div class="header"><div class="brand">Relay</div><div class="header-actions"><button class="window-action back" type="button" aria-label="Back" title="Back">←</button><button class="window-action minimize" type="button" aria-label="Minimize Relay" title="Minimize Relay">−</button><button class="window-action close" type="button" aria-label="Close Relay" title="Close Relay">×</button></div></div>
      <h2 class="question"></h2>
      <div class="direction-wrap"><textarea id="relay-direction" class="direction" maxlength="1000"></textarea></div>
      <div class="action-row visible">
        <button class="action-btn primary" type="button">Create draft</button>
        <button class="action-btn secondary" type="button">Suggest replies</button>
      </div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="preview" aria-label="Relay draft"></div>
      <div class="clarify">
        <label class="clarify-label" for="relay-clarification"></label>
        <div class="clarify-row"><input id="relay-clarification" class="clarify-input" type="text" maxlength="1000"><button class="continue" type="button">Continue</button></div>
      </div>
      <div class="actions">
        <button class="action primary insert" type="button">Insert</button>
        <button class="action copy" type="button">Copy</button>
        <button class="action another" type="button">Change tone</button>
        <button class="action start-over" type="button">Start over</button>
        <button class="action undo" type="button" hidden>Undo insert</button>
        <button class="action done" type="button" hidden>Done</button>
      </div>
      <div class="tone"></div>
      <div class="refine-wrap">
        <textarea class="refine" maxlength="1000" placeholder="Refine this reply…"></textarea>
        <div class="refine-row"><button class="refine-btn" type="button">Refine</button></div>
      </div>
      <div class="privacy">Focused context is read only when you open Relay. Relay never sends or submits for you.</div>
    </section>`;
  document.documentElement.append(host);

  const chip = shadow.querySelector('.chip');
  const panel = shadow.querySelector('.panel');
  const minimizeButton = shadow.querySelector('.minimize');
  const closeButton = shadow.querySelector('.close');
  const question = shadow.querySelector('.question');
  const directionWrap = shadow.querySelector('.direction-wrap');
  const directionInput = shadow.querySelector('.direction');
  const actionRow = shadow.querySelector('.action-row');
  const actionButtons = shadow.querySelectorAll('.action-btn');
  const draftButton = actionButtons[0];
  const suggestButton = actionButtons[1];
  const status = shadow.querySelector('.status');
  const preview = shadow.querySelector('.preview');
  const clarificationBox = shadow.querySelector('.clarify');
  const clarificationLabel = shadow.querySelector('.clarify-label');
  const clarificationInput = shadow.querySelector('.clarify-input');
  const continueButton = shadow.querySelector('.continue');
  const actions = shadow.querySelector('.actions');
  const insertButton = shadow.querySelector('.insert');
  const copyButton = shadow.querySelector('.copy');
  const toneButton = shadow.querySelector('.another');
  const startOverButton = shadow.querySelector('.start-over');
  const undoButton = shadow.querySelector('.undo');
  const doneButton = shadow.querySelector('.done');
  const toneLabel = shadow.querySelector('.tone');
  const backBtn = shadow.querySelector('.back');
  const refineWrap = shadow.querySelector('.refine-wrap');
  const refineInput = shadow.querySelector('.refine');
  const refineBtn = shadow.querySelector('.refine-btn');

  function clean(value, max) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function fieldMetadata(target) {
    const id = target.id ? CSS.escape(target.id) : '';
    const explicit = id ? document.querySelector(`label[for="${id}"]`)?.innerText : '';
    const wrapped = target.closest('label')?.innerText || '';
    const aria = target.getAttribute('aria-label') || target.getAttribute('aria-labelledby')?.split(/\s+/).map(labelId => document.getElementById(labelId)?.innerText || '').join(' ') || '';
    return clean([explicit, wrapped, aria, target.getAttribute('placeholder'), target.getAttribute('name'), target.getAttribute('autocomplete')].filter(Boolean).join(' '), 500);
  }

  function isRelayUi(node) {
    if (!(node instanceof Node)) return false;
    if (shadow.contains(node) || node === host) return true;
    if (node instanceof Element && (node.id === 'relay-top-bridge' || node.closest?.('#relay-top-bridge') || node.getAttribute?.('data-relay-ui') === 'true')) return true;
    const root = node.getRootNode?.();
    return root instanceof ShadowRoot && root.host === host;
  }

  function eligibleEditor(candidate) {
    if (!(candidate instanceof HTMLElement) || !candidate.matches(EDITOR_SELECTOR) || isRelayUi(candidate)) return false;
    if (candidate.getAttribute('aria-disabled') === 'true' || candidate.getAttribute('contenteditable') === 'false') return false;
    if (candidate instanceof HTMLTextAreaElement && (candidate.disabled || candidate.readOnly)) return false;
    if (candidate instanceof HTMLInputElement) {
      if (candidate.disabled || candidate.readOnly || !['', 'text'].includes(candidate.type)) return false;
      const metadata = fieldMetadata(candidate);
      const maxLength = candidate.maxLength > 0 ? candidate.maxLength : 0;
      if (SENSITIVE_HINT.test(metadata)) return false;
      if (!WRITING_HINT.test(metadata) && maxLength < 80 && candidate.size < 40) return false;
    }
    if (SENSITIVE_HINT.test(fieldMetadata(candidate))) return false;
    const hostname = location.hostname.toLowerCase();
    if (/web\.whatsapp\.com/.test(hostname)) {
      // Keep the chip on the chat composer only — never on message bubbles.
      if (candidate.closest('.message-in, .message-out, [data-testid="msg-container"], div[data-id^="true_"], div[data-id^="false_"]')
        && !candidate.closest('footer, [data-testid="conversation-compose-box"], [data-testid="conversation-compose-box-input"]')) {
        return false;
      }
      const inCompose = Boolean(
        candidate.closest('footer')
        || candidate.closest('[data-testid="conversation-compose-box"], [data-testid="conversation-compose-box-input"]')
        || candidate.getAttribute('data-testid') === 'conversation-compose-box-input'
        || (/type a message/i.test(fieldMetadata(candidate) + ' ' + (candidate.getAttribute('title') || '')) && candidate.closest('#main'))
      );
      if (!inCompose) return false;
    }
    const rect = candidate.getBoundingClientRect();
    return rect.width >= 80 && rect.height >= 20;
  }

  function nearestEditor(target) {
    if (isRelayUi(target)) return null;
    const candidate = target instanceof Element ? target.closest(EDITOR_SELECTOR) : null;
    return eligibleEditor(candidate) ? candidate : null;
  }

  function isAttached(node) {
    return Boolean(node && node.isConnected);
  }

  function editorFromEvent(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    if (path.some(node => isRelayUi(node))) return null;
    for (const node of path) {
      if (!(node instanceof Element) || isRelayUi(node)) continue;
      if (eligibleEditor(node)) return node;
      const nested = nearestEditor(node);
      if (nested) return nested;
    }
    return null;
  }

  function collectEditors(root, results = []) {
    if (!root) return results;
    if (root.querySelectorAll) {
      for (const candidate of root.querySelectorAll(EDITOR_SELECTOR)) {
        if (eligibleEditor(candidate)) results.push(candidate);
      }
    }
    const nodes = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const node of nodes) {
      if (node.shadowRoot) collectEditors(node.shadowRoot, results);
    }
    return results;
  }

  function normalizeEditorText(value) {
    return String(value || '').replace(/[\u200B\uFEFF]/g, '').replace(/\u00A0/g, ' ');
  }

  function readEditor(target) {
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return target.value;
    return normalizeEditorText(target.innerText || target.textContent || '');
  }

  const TEMPLATE_SELECTOR = [
    '.gmail_signature',
    '[data-smartmail="gmail_signature"]',
    '.gmail_quote',
    '[data-smartmail="gmail_quote"]'
  ].join(',');

  function editorTemplate(target) {
    return target instanceof HTMLElement ? target.querySelector(TEMPLATE_SELECTOR) : null;
  }

  function readEditorMessage(target) {
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return target.value;
    let message = '';
    if (!(target instanceof HTMLElement) || !editorTemplate(target)) message = readEditor(target);
    else {
      const clone = target.cloneNode(true);
      if (!(clone instanceof HTMLElement)) message = readEditor(target);
      else {
        for (const template of clone.querySelectorAll(TEMPLATE_SELECTOR)) template.remove();
        message = normalizeEditorText(clone.innerText || clone.textContent || '');
      }
    }
    return facebookReplyMentionPlaceholder(target, message) || linkedinReplyMentionPlaceholder(target, message) ? '' : message;
  }

  function replaceMessageBeforeTemplate(target, text) {
    if (!(target instanceof HTMLElement) || !target.isContentEditable) return false;
    const template = editorTemplate(target);
    if (!template) return false;
    const range = document.createRange();
    range.setStart(target, 0);
    range.setEndBefore(template);
    range.deleteContents();
    if (text) {
      const message = document.createElement('div');
      message.textContent = text;
      range.insertNode(message);
    }
    try { target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text })); }
    catch { target.dispatchEvent(new Event('input', { bubbles: true })); }
    return true;
  }

  function dispatchInput(target, text) {
    try { target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })); }
    catch { target.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  function isExactDouble(current, expected) {
    const left = clean(current, 20000).replace(/\s+/g, ' ');
    const right = clean(expected, 20000).replace(/\s+/g, ' ');
    if (!right) return false;
    return left === right + right
      || left === `${right} ${right}`
      || left.replace(/\s+/g, '') === (right + right).replace(/\s+/g, '');
  }

  function editorReflects(target, text) {
    const current = clean(readEditorMessage(target), 20000).replace(/\n+/g, ' ');
    const expected = clean(text, 20000).replace(/\n+/g, ' ');
    if (!expected) return !current;
    if (isExactDouble(current, expected)) return false;
    if (current === expected) return true;
    if (current.replace(/\s+/g, ' ') === expected.replace(/\s+/g, ' ')) return true;
    return false;
  }

  function collapseDoubledEditor(target, text) {
    if (!isExactDouble(readEditor(target), text)) {
      const current = readEditor(target);
      if (current && text && current !== text && clean(current, 20000).includes(clean(text, 20000))) {
        const lexical = findLexicalEditor(target);
        if (lexical && writeLexicalState(lexical, text)) return true;
        if (usesLexicalEditor(target)) {
          writeLexicalEditor(target, text);
          return true;
        }
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
          target.value = text;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      }
      return false;
    }
    const lexical = findLexicalEditor(target);
    if (lexical && writeLexicalState(lexical, text)) return true;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(target, text);
      else target.value = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }

  function clearContentEditable(target) {
    target.focus();
    selectEditorContents(target);
    try { document.execCommand('selectAll', false, null); } catch {}
    try { document.execCommand('delete', false, null); } catch {}
    const lexical = findLexicalEditor(target);
    if (lexical) writeLexicalState(lexical, '');
    else if (usesLexicalEditor(target)) {
      const root = target.closest?.('[data-lexical-editor="true"]')
        || target.closest?.('[role="textbox"][contenteditable="true"]')
        || target;
      root.textContent = '';
      try { root.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
    }
  }

  function writeLexicalEditor(target, text) {
    const deepest = deepestNode(target);
    let dispatchFrom = deepest.parentElement || target;
    let temporary = null;
    if (deepest.nodeName.toLowerCase() === 'br') {
      temporary = document.createElement('span');
      temporary.setAttribute('data-lexical-text', 'true');
      deepest.parentElement?.append(temporary);
      temporary.textContent = text;
      dispatchFrom = temporary.parentElement || target;
      try { dispatchFrom.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })); }
      catch { dispatchFrom.dispatchEvent(new Event('input', { bubbles: true })); }
      temporary.remove();
      return;
    }
    if (deepest.nodeType === Node.TEXT_NODE) {
      deepest.textContent = text;
      dispatchFrom = deepest.parentElement?.parentElement || deepest.parentElement || target;
    } else {
      deepest.textContent = text;
      dispatchFrom = deepest.parentElement || target;
    }
    // Notify without insertText data — data would append a second copy on Lexical.
    try { dispatchFrom.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' })); }
    catch { dispatchFrom.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  function writeEditor(target, text) {
    target.focus();
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(target, text);
      else target.value = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      try { target.setSelectionRange(text.length, text.length); } catch {}
      return;
    }

    const root = target.closest?.('[data-lexical-editor="true"]')
      || target.closest?.('[role="textbox"][contenteditable="true"]')
      || target.closest?.('.ql-editor')
      || target;

    // One strategy only. Never chain Lexical/Quill/execCommand/paste — that doubles on Reddit.
    const lexical = findLexicalEditor(target);
    if (lexical && writeLexicalState(lexical, text)) {
      collapseDoubledEditor(root, text);
      return;
    }

    const quill = findQuill(target);
    if (quill && writeQuillEditor(quill, text)) {
      collapseDoubledEditor(root, text);
      return;
    }

    if (usesLexicalEditor(root) || root.querySelector?.('[data-lexical-text]')) {
      clearContentEditable(root);
      writeLexicalEditor(root, text);
      collapseDoubledEditor(root, text);
      return;
    }

    clearContentEditable(root);
    let inserted = false;
    try { inserted = document.execCommand('insertText', false, text); } catch {}
    if (inserted || editorReflects(root, text)) {
      collapseDoubledEditor(root, text);
      return;
    }

    clearContentEditable(root);
    pasteIntoEditor(root, text);
    if (editorReflects(root, text) || clean(readEditor(root), 20000).includes(clean(text, 20000))) {
      collapseDoubledEditor(root, text);
      return;
    }

    root.textContent = text;
    try { root.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
  }

  function replaceEditor(target, text) {
    internalWrite = true;
    try {
      if (replaceMessageBeforeTemplate(target, text)) return;
      writeEditor(target, text);
      if (isExactDouble(readEditor(target), text)) collapseDoubledEditor(target, text);
    } finally {
      internalWrite = false;
    }
  }

  function deepestNode(node) {
    let current = node;
    while (current && current.lastChild) current = current.lastChild;
    return current;
  }

  function selectEditorContents(target) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const paragraph = target.querySelector('p') || target;
    range.selectNodeContents(paragraph);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function isMetaComposerHost(hostname = location.hostname.toLowerCase()) {
    return /(?:^|\.)(?:facebook|messenger|instagram)\.com$|(?:^|\.)threads\.net$/.test(hostname);
  }

  function usesLexicalEditor(target) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.matches('[data-lexical-editor="true"]') || target.querySelector('[data-lexical-text], [data-lexical-editor="true"]')) return true;
    return isMetaComposerHost();
  }

  function pasteIntoEditor(target, text) {
    try {
      const data = new DataTransfer();
      data.setData('text/plain', text);
      return target.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
    } catch {
      return false;
    }
  }

  function findQuill(target) {
    const editor = target.closest?.('.ql-editor') || (target.classList?.contains('ql-editor') ? target : null) || target;
    const container = editor.closest?.('.ql-container') || editor.parentElement;
    if (container?.__quill) return container.__quill;
    let node = editor;
    for (let depth = 0; node && depth < 12; depth += 1, node = node.parentElement) {
      const key = Object.keys(node).find(name => name.startsWith('__reactFiber') || name.startsWith('__reactInternalInstance'));
      let fiber = key ? node[key] : null;
      for (let hop = 0; fiber && hop < 40; hop += 1, fiber = fiber.return) {
        const quill = fiber.memoizedProps?.quill || fiber.stateNode?.quill || fiber.memoizedState?.quill;
        if (quill && typeof quill.setContents === 'function') return quill;
      }
    }
    return null;
  }

  function writeQuillEditor(quill, text) {
    const value = String(text || '');
    if (typeof quill.setContents === 'function') {
      quill.setContents([{ insert: `${value}\n` }], 'api');
      return true;
    }
    if (typeof quill.setText === 'function') {
      quill.setText(value);
      return true;
    }
    return false;
  }

  function findLexicalEditor(target) {
    const root = target.closest?.('[data-lexical-editor="true"]')
      || (target.getAttribute?.('data-lexical-editor') === 'true' ? target : null)
      || (isMetaComposerHost() ? target.closest('[role="textbox"][contenteditable="true"], [contenteditable="true"]') : null);
    if (!root) return null;
    if (root.__lexicalEditor || root._lexicalEditor) return root.__lexicalEditor || root._lexicalEditor;
    let node = root;
    for (let depth = 0; node && depth < 15; depth += 1, node = node.parentElement) {
      const key = Object.keys(node).find(name => name.startsWith('__reactFiber') || name.startsWith('__reactInternalInstance'));
      let fiber = key ? node[key] : null;
      for (let hop = 0; fiber && hop < 80; hop += 1, fiber = fiber.return) {
        const editor = fiber.memoizedProps?.editor
          || fiber.memoizedProps?.lexicalEditor
          || fiber.stateNode?.editor
          || fiber.stateNode?.__lexicalEditor
          || fiber.stateNode?._editor;
        if (editor && typeof editor.parseEditorState === 'function' && typeof editor.setEditorState === 'function') return editor;
      }
    }
    return null;
  }

  function writeLexicalState(editor, text) {
    try {
      if (typeof editor.parseEditorState !== 'function' || typeof editor.setEditorState !== 'function') return false;
      const lines = String(text || '').split(/\n/).map(line => line.replace(/\r/g, ''));
      const paragraphs = (lines.length ? lines : ['']).map(line => ({
        children: line
          ? [{ detail: 0, format: 0, mode: 'normal', text: line, type: 'text', version: 1 }]
          : [],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1
      }));
      const state = editor.parseEditorState(JSON.stringify({
        root: {
          children: paragraphs,
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'root',
          version: 1
        }
      }));
      editor.setEditorState(state);
      return true;
    } catch {
      return false;
    }
  }

  function resolveLiveEditor() {
    if (editor && isAttached(editor) && eligibleEditor(editor)) return editor;
    if (snapshot?.editor && isAttached(snapshot.editor) && eligibleEditor(snapshot.editor)) return snapshot.editor;
    const active = nearestEditor(document.activeElement) || editorFromEvent({ composedPath: () => [document.activeElement].filter(Boolean), target: document.activeElement });
    if (active) return active;
    const roots = [];
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) roots.push(dialog);
    roots.push(document);
    for (const root of roots) {
      for (const candidate of collectEditors(root)) return candidate;
    }
    return null;
  }

  function keepPanelAliveWithoutEditor(message) {
    editor = null;
    if (snapshot) snapshot.editor = null;
    if (message) status.textContent = message;
    render();
  }

  function facebookComposerKind(target) {
    if (!(target instanceof HTMLElement) || !/(?:^|\.)facebook\.com$/.test(location.hostname.toLowerCase())) return '';
    const metadata = `${fieldMetadata(target)} ${target.getAttribute('aria-label') || ''} ${target.getAttribute('data-placeholder') || ''}`.toLowerCase();
    const article = target.closest('[role="article"]');
    let ancestorLabels = '';
    let node = target.parentElement;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      ancestorLabels += ` ${node.getAttribute?.('aria-label') || ''}`;
      if (node.matches?.('[role="dialog"], [role="article"], form')) break;
    }
    const labels = `${metadata} ${ancestorLabels}`.toLowerCase();
    if (/\b(?:write a comment|comment as|reply to|write a reply|respond to)\b/.test(labels)) return 'reply';
    if (article && target.closest('form, [role="article"]')) return 'reply';
    const dialogLabel = (target.closest('[role="dialog"]')?.getAttribute('aria-label') || '').toLowerCase();
    if (/\b(?:create post|edit post|new post)\b/.test(dialogLabel)
      || /\b(?:what['’]?s on your mind|create a post|write a post)\b/.test(labels)) return 'post';
    return '';
  }

  function linkedinComposerKind(target) {
    if (!(target instanceof HTMLElement) || !/(?:^|\.)linkedin\.com$/.test(location.hostname.toLowerCase())) return '';
    const metadata = `${fieldMetadata(target)} ${target.getAttribute('aria-label') || ''} ${target.getAttribute('placeholder') || ''}`.toLowerCase();
    let node = target.parentElement;
    let ancestorLabels = '';
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      ancestorLabels += ` ${node.getAttribute?.('aria-label') || ''} ${node.getAttribute?.('role') || ''}`;
      if (node.matches?.('.msg-overlay-conversation-bubble, .msg-convo-wrapper, [role="dialog"]')) break;
    }
    const labels = `${metadata} ${ancestorLabels}`.toLowerCase();
    if (/\b(?:write a message|send a message|type a message)\b/.test(labels)
      || target.closest('.msg-overlay-conversation-bubble, .msg-convo-wrapper')) return 'reply';
    if (target.closest(
      '.comments-comment-box, .comments-comment-item, .comments-reply-box, .comments-comment-texteditor, [data-view-name*="comment" i]'
    ) || /\b(?:add a comment|comment on|reply to|add a reply|write a comment)\b/.test(labels)) return 'reply';
    const dialog = target.closest('[role="dialog"], .artdeco-modal, .share-box, .share-creation-state');
    if (dialog) {
      const dialogLabel = clean(
        `${dialog.getAttribute('aria-label') || ''} ${dialog.getAttribute('data-modal-title') || ''} ${(dialog.innerText || '').slice(0, 500)}`,
        700
      ).toLowerCase();
      if (/\b(?:create a post|start a post|write a post|share something|share an update|create post)\b/.test(dialogLabel)
        || target.closest('.share-box, .share-creation-state, .share-creation-state__text-editor')) return 'post';
    }
    return '';
  }

  function linkedinReplyTargetName(target) {
    if (!(target instanceof HTMLElement)) return '';
    const labels = [];
    let node = target;
    for (let depth = 0; node && depth < 10; depth += 1, node = node.parentElement) {
      labels.push(
        node.getAttribute?.('aria-label') || '',
        node.getAttribute?.('data-placeholder') || '',
        node.getAttribute?.('placeholder') || '',
        node.getAttribute?.('title') || ''
      );
      if (node.matches?.('.comments-comment-item, .feed-shared-update-v2, [role="dialog"], article')) break;
    }
    for (const label of labels) {
      const normalized = clean(label, 240);
      const match = normalized.match(/\brepl(?:y|ying)\s+to\s+@?(.+?)(?:['’]s\s+comment|[|·,:]|\s+-\s+|$)/i);
      const name = clean(match?.[1], 120);
      if (name && !/^(?:this|the|a)\s+(?:comment|post)$/i.test(name)) return name;
    }
    const editorText = clean(readEditor(target), 120).replace(/^@/, '');
    if (!userEditedEditors.has(target) && linkedinHasReplySubmit(target) && linkedinDisplayNameLike(editorText)) return editorText;
    return '';
  }

  function linkedinDisplayNameLike(value) {
    const name = clean(value, 120).replace(/^@/, '');
    return /^(?:[\p{Lu}][\p{L}'’.-]{0,40})(?:\s+[\p{Lu}][\p{L}'’.-]{0,40}){0,5}$/u.test(name);
  }

  function linkedinHasReplySubmit(target) {
    if (!(target instanceof HTMLElement)) return false;
    let node = target.parentElement;
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      for (const button of node.querySelectorAll('button, [role="button"]')) {
        if (target.contains(button)) continue;
        const label = clean(
          `${button.getAttribute?.('aria-label') || ''} ${button.innerText || button.textContent || ''}`,
          80
        );
        if (/^reply$/i.test(label)) return true;
      }
      for (const labelNode of node.querySelectorAll('span, div')) {
        if (labelNode.children.length) continue;
        if (/^reply$/i.test(clean(labelNode.innerText || labelNode.textContent, 40))) return true;
      }
      if (node.matches?.('.comments-comment-item, .feed-shared-update-v2, article, [role="dialog"]')) break;
    }
    return false;
  }

  function linkedinReplyMentionPlaceholder(target, text) {
    if (!(target instanceof HTMLElement) || !text || linkedinComposerKind(target) !== 'reply') return false;
    const placeholder = clean(text, 120).replace(/^@/, '');
    const replyTarget = linkedinReplyTargetName(target);
    if (replyTarget && placeholder.toLocaleLowerCase() === replyTarget.toLocaleLowerCase()) return true;
    const explicitMention = target.querySelector(
      '[data-mention], [data-entity-urn], .ql-mention, [class*="mention" i], a[href*="/in/"]'
    );
    if (explicitMention) {
      const mention = clean(explicitMention.innerText || explicitMention.textContent, 120).replace(/^@/, '');
      if (mention && mention.toLocaleLowerCase() === placeholder.toLocaleLowerCase()) return true;
    }
    const scope = target.closest('.comments-comment-item, .feed-shared-update-v2, article, [role="dialog"]');
    if (scope) {
      const authorSelector = [
        'a[href*="/in/"]',
        '.comments-post-meta__name-text',
        '.update-components-actor__name',
        '[data-view-name*="profile" i]',
        'strong',
        'span[dir="ltr"]',
        'span[dir="auto"]',
        'span'
      ].join(', ');
      for (const candidate of scope.querySelectorAll(authorSelector)) {
        if (!(candidate instanceof HTMLElement) || target.contains(candidate) || candidate.closest('[contenteditable]')) continue;
        const author = clean(candidate.innerText || candidate.textContent, 120).replace(/^@/, '');
        if (author && author.toLocaleLowerCase() === placeholder.toLocaleLowerCase()) return true;
      }
    }
    let nearby = target.parentElement;
    for (let depth = 0; nearby && depth < 10; depth += 1, nearby = nearby.parentElement) {
      if (clean(nearby.innerText || nearby.textContent, 5000).length > 4000) break;
      for (const candidate of nearby.querySelectorAll('a, strong, span, h3, h4')) {
        if (target.contains(candidate) || candidate.closest('[contenteditable]')) continue;
        const author = clean(candidate.innerText || candidate.textContent, 120).replace(/^@/, '');
        if (author && author.toLocaleLowerCase() === placeholder.toLocaleLowerCase()) return true;
      }
    }
    if (!userEditedEditors.has(target) && linkedinHasReplySubmit(target) && linkedinDisplayNameLike(placeholder)) return true;
    const selection = window.getSelection();
    const selectedWholeEditor = Boolean(
      selection?.rangeCount
      && target.contains(selection.anchorNode)
      && clean(selection.toString(), 120).replace(/^@/, '').toLocaleLowerCase() === placeholder.toLocaleLowerCase()
    );
    return selectedWholeEditor && linkedinDisplayNameLike(placeholder);
  }

  function linkedinSpecificReplyContext(target) {
    if (!(target instanceof HTMLElement)) return '';
    const replyTarget = linkedinReplyTargetName(target)
      || clean(readEditor(target), 120).replace(/^@/, '');
    if (!replyTarget || !linkedinReplyMentionPlaceholder(target, readEditor(target))) return '';
    let comment = target.closest('.comments-comment-item, [data-view-name*="comment" i], [role="listitem"]');
    if (!comment) {
      let node = target.parentElement;
      for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
        if (node.matches?.('.feed-shared-update-v2, article, [role="dialog"]')) break;
        const value = clean(node.innerText || node.textContent, 1800);
        if (value.toLocaleLowerCase().includes(replyTarget.toLocaleLowerCase()) && linkedinHasReplySubmit(target)) {
          comment = node;
        }
      }
    }
    if (comment instanceof HTMLElement) {
      const clone = comment.cloneNode(true);
      if (clone instanceof HTMLElement) {
        for (const noise of clone.querySelectorAll('button, [role="button"], [contenteditable], form, svg, img')) noise.remove();
        const value = clean(clone.innerText || clone.textContent, 1400);
        if (value.length > replyTarget.length) {
          return clean(`Replying to ${replyTarget}'s LinkedIn comment:\n${value}`, 1800);
        }
      }
    }
    return '';
  }

  function facebookReplyTargetName(target) {
    if (!(target instanceof HTMLElement)) return '';
    const labels = [];
    let node = target;
    for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
      labels.push(
        node.getAttribute?.('aria-label') || '',
        node.getAttribute?.('data-placeholder') || '',
        node.getAttribute?.('placeholder') || '',
        node.getAttribute?.('title') || ''
      );
      if (node.matches?.('[role="article"], [role="dialog"]')) break;
    }
    for (const label of labels) {
      const normalized = clean(label, 240);
      const match = normalized.match(/\brepl(?:y|ying)\s+to\s+(.+?)(?:['’]s\s+comment|[|·,:]|\s+-\s+|$)/i);
      const name = clean(match?.[1], 120);
      if (name && !/^(?:this|the|a)\s+(?:comment|post)$/i.test(name)) return name;
    }
    return '';
  }

  function facebookReplyMentionPlaceholder(target, text) {
    if (!(target instanceof HTMLElement) || !text || facebookComposerKind(target) !== 'reply') return false;
    const placeholder = clean(text, 120);
    const replyTarget = facebookReplyTargetName(target);
    if (replyTarget && placeholder.toLocaleLowerCase() === replyTarget.toLocaleLowerCase()) return true;
    const explicitMention = target.querySelector(
      '[data-mention], [data-testid*="mention" i], [data-lexical-decorator], [role="link"][href*="/profile" i], a[href*="/user" i]'
    );
    if (explicitMention) {
      const mentionText = clean(explicitMention.innerText || explicitMention.textContent, 300);
      if (mentionText && placeholder === mentionText) return true;
    }
    if (/^anonymous participant(?:\s+\d+)?$/i.test(placeholder)) return true;

    // Facebook often inserts the replied-to display name as plain Lexical text
    // with no mention metadata. Confirm it against a nearby author link/name
    // before treating it as platform chrome, so a genuine short reply such as
    // "Thank You" is never discarded merely because it looks like a name.
    const scope = target.closest('[role="article"]')
      || target.closest('[role="dialog"]')
      || target.closest('form')
      || target.parentElement;
    if (scope) {
      const authorSelector = [
        'a[role="link"]',
        'strong',
        'h3',
        'h4',
        'span[dir="auto"]',
        'span',
        '[data-ad-rendering-role="profile_name"]',
        '[data-testid*="author" i]'
      ].join(', ');
      for (const candidate of scope.querySelectorAll(authorSelector)) {
        if (!(candidate instanceof HTMLElement) || target.contains(candidate) || candidate.closest('[contenteditable]')) continue;
        const author = clean(candidate.innerText || candidate.textContent, 120);
        if (author && author === placeholder) return true;
      }
    }

    // A whole-editor selection is Facebook's final fallback when its author
    // node is outside the local reply form (common in nested comment modals).
    const selection = window.getSelection();
    const selectedWholeEditor = Boolean(
      selection?.rangeCount
      && target.contains(selection.anchorNode)
      && clean(selection.toString(), 300) === placeholder
    );
    if (!selectedWholeEditor) return false;
    const nameLike = /^(?:[A-Z][\p{L}'’-]{1,40})(?:\s+[A-Z][\p{L}'’-]{1,40}){1,4}$/u.test(placeholder);
    return nameLike;
  }

  function facebookSpecificReplyContext(target) {
    if (!(target instanceof HTMLElement)) return '';
    const replyTarget = facebookReplyTargetName(target);
    if (!replyTarget) return '';
    const scope = target.closest('[role="article"]') || target.closest('[role="dialog"]');
    if (!scope) return '';
    const candidates = scope.querySelectorAll(
      'a[role="link"], strong, h3, h4, span[dir="auto"], [data-ad-rendering-role="profile_name"], [data-testid*="author" i]'
    );
    for (const authorNode of candidates) {
      if (!(authorNode instanceof HTMLElement) || target.contains(authorNode) || authorNode.closest('[contenteditable]')) continue;
      if (clean(authorNode.innerText || authorNode.textContent, 120).toLocaleLowerCase() !== replyTarget.toLocaleLowerCase()) continue;
      let container = authorNode.parentElement;
      for (let depth = 0; container && depth < 7 && scope.contains(container); depth += 1, container = container.parentElement) {
        if (container.contains(target)) break;
        const clone = container.cloneNode(true);
        if (!(clone instanceof HTMLElement)) continue;
        for (const noise of clone.querySelectorAll('button, [role="button"], [contenteditable], svg, img')) noise.remove();
        const value = clean(clone.innerText || clone.textContent, 1400);
        const remainder = clean(
          value.replace(replyTarget, '').replace(/\b(?:\d+\s*(?:m|min|h|hr|d|day|w|wk)|edited|like|reply|share)\b/gi, ''),
          1000
        );
        if (value.length <= 1200 && remainder.length >= 2) {
          return clean(`Replying to ${replyTarget}'s comment:\n${value}`, 1800);
        }
        if (value.length > 1200) break;
      }
    }
    return '';
  }

  function detectPageType(target) {
    const hostname = location.hostname.toLowerCase();
    if (/chatgpt|claude|gemini|perplexity|copilot/.test(hostname)) return 'ai';
    if (/mail\.google|outlook|mail\.yahoo|proton\.me/.test(hostname)) return 'email';
    if (/whatsapp|slack|discord|messenger|teams\.microsoft/.test(hostname)) return 'messaging';
    if (/salesforce|hubspot|zendesk|freshdesk|intercom|pipedrive/.test(hostname)) return 'crm';
    if (/\b(?:reply|response|message)\b/i.test(fieldMetadata(target))) return 'messaging';
    if (isReplyComposer(target)) return 'messaging';
    if (/linkedin|reddit|quora|facebook|instagram|threads|twitter|x\.com/.test(hostname)) return 'generic';
    if (target.closest('form') || /application|apply|form|survey/.test(location.pathname.toLowerCase())) return 'form';
    return 'generic';
  }

  function activeSelectedText() {
    if (!rememberedSelection || Date.now() - rememberedSelectionAt > 120_000) return '';
    return clean(rememberedSelection, 3000);
  }

  function recentItems(nodes, target, readItem, maxItems = 6) {
    const values = [];
    const candidates = Array.from(nodes).slice(-Math.max(maxItems * 3, 12));
    for (const item of candidates) {
      if (!(item instanceof HTMLElement) || item.contains(target)) continue;
      const rect = item.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const value = clean(readItem(item), 1200);
      if (!value || values.at(-1) === value) continue;
      values.push(value);
    }
    return clean(values.slice(-maxItems).join('\n\n'), 5000);
  }

  function ancestorContext(target, selector, readItem, maxItems = 4) {
    const values = [];
    let item = target.closest(selector);
    while (item && values.length < maxItems) {
      const value = clean(readItem(item), 1200);
      if (value && values.at(-1) !== value) values.push(value);
      item = item.parentElement?.closest(selector) || null;
    }
    return clean(values.reverse().join('\n\n'), 5000);
  }

  function whatsappComposeRoot(target) {
    const main = target?.closest?.('#main') || document.querySelector('#main');
    if (!main) return null;
    return target?.closest?.('footer')
      || main.querySelector('footer')
      || main.querySelector('[data-testid="conversation-compose-box"]')
      || main;
  }

  function whatsappQuotedReply(target) {
    const compose = whatsappComposeRoot(target);
    if (!compose) return '';
    const selectors = [
      '[data-testid="compose-quoted-message"]',
      '[data-testid="quoted-message"]',
      '[data-testid*="quote" i]',
      '[aria-label*="quoted message" i]',
      '[aria-label*="replying to" i]'
    ];
    for (const selector of selectors) {
      const node = compose.querySelector(selector);
      if (!(node instanceof HTMLElement)) continue;
      if (node.contains(target)) continue;
      const text = clean(node.innerText || node.textContent, 800);
      if (text && !/type a message|type a reply/i.test(text)) return text;
    }
    // Fallback: reply preview bars sit in the footer above the composer and include a cancel control.
    const footer = compose.matches?.('footer') ? compose : compose.querySelector?.('footer') || compose;
    for (const child of Array.from(footer.children || [])) {
      if (!(child instanceof HTMLElement) || child.contains(target)) continue;
      const hasCancel = Boolean(child.querySelector('button, [role="button"], [data-icon="x"], [data-icon="x-alt"], [aria-label*="cancel" i], [aria-label*="close" i]'));
      const text = clean(child.innerText || child.textContent, 800);
      if (!hasCancel || !text || /type a message|attach|emoji|voice|send/i.test(text)) continue;
      if (text.length < 2 || text.length > 700) continue;
      return text;
    }
    return '';
  }

  function whatsappMessageBody(item) {
    const bodySelector = '.copyable-text[data-pre-plain-text], .copyable-text, [data-testid="msg-text"], span.selectable-text';
    const copyable = item.matches?.(bodySelector) ? item : item.querySelector(bodySelector);
    let body = clean(copyable?.innerText || '', 1000);
    if (!body) {
      const clone = item.cloneNode(true);
      if (clone instanceof HTMLElement) {
        for (const noise of clone.querySelectorAll('button, [role="button"], audio, video, canvas, img, svg, [data-testid*="popup" i]')) noise.remove();
        body = clean(clone.innerText, 1000);
      }
    }
    if (!body) return '';
    // Drop pure attachment chrome so resume PDFs do not drown out the reply target.
    if (/^(?:document|contact|audio|video|photo|image|sticker|gif)\b/i.test(body) && body.length < 80) return '';
    if (/\.pdf\b/i.test(body) && !/\b(?:review|profile|resume|cv|look|please|share|detail)\b/i.test(body) && body.length < 120) {
      return clean(body.replace(/\b\d+\s*(?:page|kB|KB|MB)\b/gi, ''), 200);
    }
    return body;
  }

  function whatsappMessageItems(root) {
    const containerSelector = [
      '.message-in',
      '.message-out',
      '[data-testid="msg-container"]',
      'div[data-id^="true_"]',
      'div[data-id^="false_"]',
      '[data-id*="@c.us_"]',
      '[data-id*="@g.us_"]'
    ].join(', ');
    const containers = Array.from(root.querySelectorAll(containerSelector));
    if (containers.length) return containers;

    // WhatsApp periodically changes its container classes. The timestamped
    // copyable body has remained the most stable message marker.
    const items = [];
    const seen = new Set();
    for (const body of root.querySelectorAll('.copyable-text[data-pre-plain-text], [data-testid="msg-text"], span.selectable-text')) {
      const item = body.closest('.message-in, .message-out, [data-id], [role="row"]') || body;
      if (item.closest('footer') || seen.has(item)) continue;
      seen.add(item);
      items.push(item);
    }
    return items;
  }

  function whatsappMessageDirection(item) {
    const container = item.closest('.message-out, .message-in, [data-id]') || item;
    const dataId = container.getAttribute?.('data-id') || '';
    if (container.matches?.('.message-out') || container.closest?.('.message-out') || /^true_/.test(dataId)) return 'You';
    if (container.matches?.('.message-in') || container.closest?.('.message-in') || /^false_/.test(dataId)) return 'Other person';
    const marker = item.matches?.('[data-pre-plain-text]')
      ? item.getAttribute('data-pre-plain-text')
      : item.querySelector?.('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text');
    return /\]\s*(?:you|me)\s*:/i.test(marker || '') ? 'You' : 'Other person';
  }

  function siteConversationContext(target) {
    const hostname = location.hostname.toLowerCase();

    if (/(?:^|\.)facebook\.com$/.test(hostname) && facebookComposerKind(target) === 'reply') {
      const root = target.closest('[role="article"]')
        || target.closest('form')?.closest('[role="article"]')
        || target.closest('[role="dialog"]');
      if (!root) return '';
      const specificReply = facebookSpecificReplyContext(target);
      const context = recentItems(
        root.querySelectorAll('[data-ad-preview="message"], [data-testid="post_message"], [role="article"] [dir="auto"], [dir="auto"]'),
        target,
        item => {
          if (item.closest('button, [role="button"]') || item.closest('[contenteditable]')) return '';
          return item.innerText || item.textContent || '';
        },
        8
      );
      if (specificReply && context) {
        return clean(`${specificReply}\n\nFacebook post and recent comment context:\n${context}`, 5000);
      }
      if (specificReply) return specificReply;
      return context ? clean(`Facebook post and comment context:\n${context}`, 5000) : '';
    }

    if (/mail\.google\./.test(hostname)) {
      return recentItems(document.querySelectorAll('.adn.ads'), target, item => {
        const sender = clean(item.querySelector('.gD, [email]')?.textContent, 120);
        const body = clean(item.querySelector('.a3s, [role="document"]')?.innerText, 1000);
        return body ? `${sender ? `${sender}: ` : ''}${body}` : '';
      }, 5);
    }

    if (/outlook\.|office\.com|microsoft365\.com/.test(hostname)) {
      const root = target.closest('[role="main"]') || document;
      return recentItems(root.querySelectorAll('[data-testid*="message" i], [role="listitem"] [role="document"], [aria-label*="message" i]'), target, item => item.innerText, 5);
    }

    if (/web\.whatsapp\.com/.test(hostname)) {
      const root = target.closest('#main') || document.querySelector('#main') || document;
      const quote = whatsappQuotedReply(target);
      const messages = recentItems(
        whatsappMessageItems(root),
        target,
        item => {
          if (item.closest('footer')) return '';
          const direction = whatsappMessageDirection(item);
          const body = whatsappMessageBody(item);
          return body ? `${direction}: ${body}` : '';
        },
        8
      );
      if (quote && messages) return clean(`Replying to:\n${quote}\n\nRecent messages:\n${messages}`, 5000);
      if (quote) return clean(`Replying to:\n${quote}`, 5000);
      return messages;
    }

    if (/slack\.com/.test(hostname)) {
      const root = target.closest('[role="main"]') || document;
      return recentItems(root.querySelectorAll('[data-qa="message_container"], .c-message_kit__message, [role="listitem"]'), target, item => item.innerText, 6);
    }

    if (/linkedin\.com/.test(hostname)) {
      if (target.closest('.msg-overlay-conversation-bubble, .msg-convo-wrapper')) {
        const root = target.closest('.msg-overlay-conversation-bubble, .msg-convo-wrapper, [role="dialog"]') || document;
        return recentItems(root.querySelectorAll('.msg-s-event-listitem, .msg-s-message-list__event, [data-view-name*="message" i]'), target, item => item.innerText, 6);
      }
      if (linkedinComposerKind(target) === 'reply') {
        const root = target.closest('.feed-shared-update-v2, article, [role="dialog"]') || document;
        const specificReply = linkedinSpecificReplyContext(target);
        const post = clean(
          root.querySelector('.feed-shared-update-v2__description, .update-components-text, [data-test-id*="post" i], [data-view-name*="feed" i]')?.innerText,
          1800
        );
        const comments = recentItems(
          root.querySelectorAll('.comments-comment-item, [data-view-name*="comment" i], [role="listitem"]'),
          target,
          item => {
            if (item.closest('[contenteditable]') || item.contains(target)) return '';
            return item.innerText || item.textContent || '';
          },
          6
        );
        const threadContext = clean(
          [post ? `LinkedIn post:\n${post}` : '', comments ? `Recent LinkedIn comments:\n${comments}` : ''].filter(Boolean).join('\n\n'),
          4000
        );
        if (specificReply && threadContext) return clean(`${specificReply}\n\n${threadContext}`, 5000);
        return specificReply || threadContext;
      }
      return '';
    }

    if (/(?:^|\.)reddit\.com$/.test(hostname)) {
      const commentSelector = 'shreddit-comment, [data-testid="comment"], [id^="t1_"]';
      const comments = ancestorContext(target, commentSelector, item => {
        const author = clean(item.getAttribute('author') || item.querySelector('[data-testid="comment_author_link"], a[href*="/user/"]')?.textContent, 100);
        const body = item.querySelector(':scope > [slot="comment"], :scope > [data-testid="comment"], :scope > .md, [data-click-id="text"]')?.innerText || '';
        return body ? `${author ? `${author}: ` : ''}${body}` : '';
      }, 4);
      if (comments) return comments;
      const post = target.closest('shreddit-post, [data-testid="post-container"], [id^="t3_"]') || document.querySelector('shreddit-post, [data-testid="post-container"]');
      if (post) {
        const title = clean(post.getAttribute('post-title') || post.querySelector('h1, h2, [slot="title"]')?.textContent, 500);
        const body = clean(post.querySelector('[slot="text-body"], [data-click-id="text"], .md')?.innerText, 2500);
        return clean([title, body].filter(Boolean).join('\n\n'), 3000);
      }
    }

    if (/(?:^|\.)quora\.com$/.test(hostname)) {
      const root = target.closest('[role="dialog"], article, [class*="Comment"], [class*="Answer"]') || target.closest('main') || document;
      const items = root.querySelectorAll('article, [role="listitem"], [class*="Comment"], [class*="Answer"], [class*="Question"]');
      const context = recentItems(items, target, item => item.innerText, 5);
      if (context) return context;
      return clean(root.innerText, 3500);
    }

    const log = target.closest('[role="dialog"], [role="main"]')?.querySelector('[role="log"]');
    if (log) return recentItems(log.querySelectorAll('[role="listitem"], article, [data-message-id]'), target, item => item.innerText, 6);
    return '';
  }

  function fieldContext(target) {
    const metadata = fieldMetadata(target);
    const label = clean(metadata.replace(target.getAttribute('placeholder') || '', ''), 200);
    const placeholder = clean(target.getAttribute('placeholder') || target.getAttribute('title'), 200);
    const ownText = clean(readEditorMessage(target), 4000);
    const hostname = location.hostname.toLowerCase();
    const quotedReply = /web\.whatsapp\.com/.test(hostname) ? whatsappQuotedReply(target) : '';
    const gmailSubject = /mail\.google\./.test(hostname)
      ? clean(document.querySelector('[name="subjectbox"]')?.value, 200) || ''
      : '';
    const gmailRecipients = /mail\.google\./.test(hostname)
      ? clean(document.querySelector('[name="to"]')?.value, 200) || ''
      : '';
    const candidates = [];
    let node = target.parentElement;
    for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
      if (node === document.body || node === document.documentElement) break;
      const value = clean(node.innerText, 6000);
      if (value.length >= 40) candidates.push(value);
      if (node.matches('form, article, section, [role="dialog"], [role="main"], [role="listitem"]')) break;
    }
    let nearbyText = siteConversationContext(target) || candidates.find(value => value.length <= 5200) || candidates[0] || '';
    if (facebookComposerKind(target) === 'post') nearbyText = '';
    if (ownText && nearbyText.includes(ownText)) nearbyText = nearbyText.replace(ownText, '').trim();
    const selectedText = activeSelectedText() || clean(quotedReply, 3000);
    return {
      pageType: detectPageType(target),
      composerKind: facebookComposerKind(target) || linkedinComposerKind(target) || '',
      selectedText,
      nearbyText: clean(nearbyText, 5000),
      fieldLabel: label,
      fieldPlaceholder: placeholder,
      gmailSubject,
      gmailRecipients
    };
  }

  let holdRelayFocus = false;
  let inertRoots = [];
  let topBridge = null;

  function needsModalInert() {
    const hostName = location.hostname.toLowerCase();
    return /(?:^|\.)(?:linkedin|facebook|instagram)\.com$/.test(hostName) || /(?:^|\.)threads\.net$/.test(hostName);
  }

  function releaseModalInert() {
    for (const root of inertRoots) {
      try { root.removeAttribute('inert'); } catch {}
    }
    inertRoots = [];
  }

  function armModalInert() {
    releaseModalInert();
    if (!needsModalInert()) return;
    // LinkedIn keeps its post modal open while focus moves to Relay. Making
    // the modal inert prevents the user from returning to or typing in the
    // LinkedIn editor, so its top-layer bridge must not lock the site modal.
    if (/(?:^|\.)linkedin\.com$/.test(location.hostname.toLowerCase())) return;
    const roots = document.querySelectorAll('[role="dialog"], dialog, [data-test-modal-id], .artdeco-modal');
    for (const root of roots) {
      if (!(root instanceof HTMLElement) || isRelayUi(root)) continue;
      root.setAttribute('inert', '');
      inertRoots.push(root);
    }
  }

  function syncHostMount() {
    const dialog = document.querySelector('dialog[open]');
    const parent = dialog || document.documentElement;
    if (host.parentElement !== parent) parent.append(host);
  }

  function closeTopBridge() {
    if (!topBridge) return;
    try { if (typeof topBridge.hidePopover === 'function') topBridge.hidePopover(); } catch {}
    topBridge.style.display = 'none';
  }

  function ensureTopBridge() {
    if (topBridge && document.contains(topBridge)) return topBridge;
    topBridge = document.createElement('div');
    topBridge.id = 'relay-top-bridge';
    topBridge.setAttribute('popover', 'manual');
    topBridge.setAttribute('data-relay-ui', 'true');
    topBridge.style.cssText = [
      'position:fixed',
      'inset:auto',
      'border:0',
      'padding:0',
      'margin:0',
      'background:transparent',
      'width:min(380px,calc(100vw - 24px))',
      'max-width:calc(100vw - 24px)',
      'color-scheme:dark'
    ].join(';');
    topBridge.innerHTML = `
      <div style="box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#101512;border:1px solid #2a3d32;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.48);color:#edf5ef;padding:16px;width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="color:#00e982;font-size:14px;font-weight:850;">Relay</div>
          <button type="button" data-relay-close style="background:transparent;border:0;color:#9eaaa2;font-size:20px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div data-relay-question style="font-size:17px;font-weight:760;margin-bottom:8px;">What do you want to write?</div>
        <textarea data-relay-direction maxlength="1000" placeholder="Short instruction…" style="width:100%;min-height:84px;background:#171e1a;border:1px solid #34443b;border-radius:12px;color:#f2f7f3;padding:10px 11px;line-height:1.45;resize:vertical;display:block;box-sizing:border-box;"></textarea>
        <div data-relay-compose-actions style="display:flex;gap:8px;margin-top:10px;">
          <button type="button" data-relay-create style="flex:1;background:#00e982;border:1px solid #00e982;border-radius:10px;color:#04120b;font-size:12px;font-weight:800;min-height:38px;cursor:pointer;">Create draft</button>
          <button type="button" data-relay-suggest hidden style="flex:1;background:#172019;border:1px solid #3a4d42;border-radius:10px;color:#e9f1eb;font-size:12px;font-weight:750;min-height:38px;cursor:pointer;">Suggest replies</button>
        </div>
        <div data-relay-status role="status" style="color:#aab7af;font-size:12px;line-height:1.45;margin-top:12px;min-height:18px;">Type here. This window stays above the site composer.</div>
        <div data-relay-preview hidden style="background:#171e1a;border:1px solid #34443b;border-radius:12px;color:#f2f7f3;font-size:14px;line-height:1.5;margin-top:12px;max-height:190px;overflow:auto;padding:12px;white-space:pre-wrap;"></div>
        <div data-relay-actions hidden style="display:none;flex-wrap:wrap;gap:7px;margin-top:12px;">
          <button type="button" data-relay-insert style="background:#00e982;border:1px solid #00e982;border-radius:10px;color:#04120b;font-size:12px;font-weight:750;min-height:36px;padding:8px 12px;cursor:pointer;">Insert</button>
          <button type="button" data-relay-copy style="background:#172019;border:1px solid #3a4d42;border-radius:10px;color:#e9f1eb;font-size:12px;font-weight:750;min-height:36px;padding:8px 12px;cursor:pointer;">Copy</button>
          <button type="button" data-relay-tone style="background:#172019;border:1px solid #3a4d42;border-radius:10px;color:#e9f1eb;font-size:12px;font-weight:750;min-height:36px;padding:8px 12px;cursor:pointer;">Change tone</button>
          <button type="button" data-relay-startover style="background:#172019;border:1px solid #3a4d42;border-radius:10px;color:#e9f1eb;font-size:12px;font-weight:750;min-height:36px;padding:8px 12px;cursor:pointer;">Start over</button>
        </div>
        <div data-relay-tone-label hidden style="color:#8fa096;font-size:11px;line-height:1.4;margin-top:8px;"></div>
        <div data-relay-refine-wrap hidden style="margin-top:12px;">
          <textarea data-relay-refine maxlength="1000" placeholder="Refine this draft…" style="width:100%;min-height:64px;background:#171e1a;border:1px solid #34443b;border-radius:12px;color:#f2f7f3;padding:10px 11px;line-height:1.45;resize:vertical;display:block;box-sizing:border-box;"></textarea>
          <button type="button" data-relay-refine-button style="margin-top:7px;width:100%;background:#172019;border:1px solid #3a4d42;border-radius:10px;color:#e9f1eb;font-size:12px;font-weight:750;min-height:36px;cursor:pointer;">Refine</button>
        </div>
      </div>`;
    document.documentElement.append(topBridge);

    const direction = topBridge.querySelector('[data-relay-direction]');
    const create = topBridge.querySelector('[data-relay-create]');
    const suggest = topBridge.querySelector('[data-relay-suggest]');
    const closeBtn = topBridge.querySelector('[data-relay-close]');
    const insert = topBridge.querySelector('[data-relay-insert]');
    const copy = topBridge.querySelector('[data-relay-copy]');
    const bridgeTone = topBridge.querySelector('[data-relay-tone]');
    const start = topBridge.querySelector('[data-relay-startover]');
    const bridgeRefine = topBridge.querySelector('[data-relay-refine]');
    const bridgeRefineButton = topBridge.querySelector('[data-relay-refine-button]');

    direction.addEventListener('input', () => {
      directionInput.value = direction.value;
      updateDraftAvailability();
      create.disabled = busy || (!direction.value.trim() && emptyFieldText(snapshot?.text));
    });
    create.addEventListener('click', () => {
      directionInput.value = direction.value;
      requestDraftGeneration();
    });
    suggest.addEventListener('click', requestSuggestions);
    closeBtn.addEventListener('click', () => resetPanel());
    insert.addEventListener('click', requestInsert);
    copy.addEventListener('click', () => { void copyDraft(); });
    bridgeTone.addEventListener('click', requestToneChange);
    start.addEventListener('click', startOver);
    bridgeRefineButton.addEventListener('click', () => {
      const value = bridgeRefine.value.trim();
      if (!value) return;
      requestRefinement(value);
    });
    return topBridge;
  }

  function positionTopBridge(bridge) {
    if (!(bridge instanceof HTMLElement) || bridge.style.display === 'none') return;
    const linkedin = /(?:^|\.)linkedin\.com$/.test(location.hostname.toLowerCase());
    bridge.style.width = linkedin
      ? 'min(288px,calc(100vw - 24px))'
      : 'min(380px,calc(100vw - 24px))';
    const source = editor || snapshot?.editor;
    const modal = source instanceof HTMLElement
      ? source.closest('[role="dialog"], dialog')
      : document.querySelector('[role="dialog"], dialog');
    const anchor = modal instanceof HTMLElement ? modal : source;
    if (!(anchor instanceof HTMLElement)) return;
    const anchorRect = anchor.getBoundingClientRect();
    const bridgeRect = bridge.getBoundingClientRect();
    const width = bridgeRect.width || Math.min(380, window.innerWidth - 24);
    const height = bridgeRect.height || Math.min(520, window.innerHeight - 24);
    const gap = 12;
    const clampLeft = value => Math.max(12, Math.min(window.innerWidth - width - 12, value));
    const clampTop = value => Math.max(12, Math.min(window.innerHeight - height - 12, value));
    const rightSpace = window.innerWidth - anchorRect.right - gap;
    const leftSpace = anchorRect.left - gap;
    let left;
    if (rightSpace >= width) left = anchorRect.right + gap;
    else if (leftSpace >= width) left = anchorRect.left - width - gap;
    else left = anchorRect.left + (anchorRect.width / 2) < window.innerWidth / 2
      ? window.innerWidth - width - 12
      : 12;
    bridge.style.left = `${clampLeft(left)}px`;
    bridge.style.top = `${clampTop(anchorRect.top)}px`;
  }

  function syncTopBridge() {
    if (!needsModalInert() || !panelOpen || !snapshot || !emptyFieldText(snapshot.text)) {
      closeTopBridge();
      return;
    }
    const bridge = ensureTopBridge();
    const direction = bridge.querySelector('[data-relay-direction]');
    const questionEl = bridge.querySelector('[data-relay-question]');
    const statusEl = bridge.querySelector('[data-relay-status]');
    const previewEl = bridge.querySelector('[data-relay-preview]');
    const actionsEl = bridge.querySelector('[data-relay-actions]');
    const toneLabelEl = bridge.querySelector('[data-relay-tone-label]');
    const create = bridge.querySelector('[data-relay-create]');
    const composeActionsEl = bridge.querySelector('[data-relay-compose-actions]');
    const suggest = bridge.querySelector('[data-relay-suggest]');
    const refineWrapEl = bridge.querySelector('[data-relay-refine-wrap]');
    const refineEl = bridge.querySelector('[data-relay-refine]');
    const refineButtonEl = bridge.querySelector('[data-relay-refine-button]');
    const actionButtons = bridge.querySelectorAll('[data-relay-actions] button');
    const composerKind = facebookComposerKind(editor || snapshot?.editor)
      || linkedinComposerKind(editor || snapshot?.editor);
    const reply = isReplyComposer();

    if (generatedDraft) {
      questionEl.textContent = reply ? 'Reply ready' : composerKind === 'post' ? 'Post ready' : 'Draft ready';
      direction.hidden = true;
      composeActionsEl.hidden = true;
      previewEl.hidden = false;
      previewEl.textContent = generatedDraft;
      actionsEl.hidden = false;
      actionsEl.style.display = 'flex';
      toneLabelEl.hidden = false;
      toneLabelEl.textContent = `${TONES[toneIndex][1]} tone · Review before inserting`;
      refineWrapEl.hidden = false;
      refineEl.placeholder = reply ? 'Refine this reply…' : composerKind === 'post' ? 'Refine this post…' : 'Refine this draft…';
      refineEl.disabled = busy;
      refineButtonEl.disabled = busy;
      for (const button of actionButtons) button.disabled = busy;
      const sourceStatus = clean(status.textContent, 300);
      const readyStatus = reply
        ? 'Reply ready — not sent. Insert writes into the comment field.'
        : composerKind === 'post'
          ? 'Post ready — not posted. Insert writes into the post field.'
          : 'Ready — not sent. Insert writes into the website field.';
      statusEl.textContent = busy ? 'Relay is drafting…' : sourceStatus || readyStatus;
    } else {
      questionEl.textContent = reply
        ? 'What should this reply say?'
        : composerKind === 'post' ? 'What do you want to post?' : 'What do you want to write?';
      direction.hidden = false;
      direction.placeholder = reply
        ? 'What you need to achieve or situation to navigate…'
        : composerKind === 'post' ? 'Describe the post you want to create…' : 'Short instruction…';
      composeActionsEl.hidden = false;
      create.textContent = busy ? 'Relay is drafting…' : 'Create draft';
      suggest.hidden = !reply;
      suggest.disabled = busy || !hasConversationContext();
      previewEl.hidden = true;
      actionsEl.hidden = true;
      actionsEl.style.display = 'none';
      toneLabelEl.hidden = true;
      toneLabelEl.textContent = '';
      refineWrapEl.hidden = true;
      refineEl.value = '';
      if (direction.value !== directionInput.value) direction.value = directionInput.value;
      create.disabled = busy || (!direction.value.trim() && emptyFieldText(snapshot.text));
      const sourceStatus = clean(status.textContent, 300);
      statusEl.textContent = busy
        ? 'Relay is drafting…'
        : sourceStatus && sourceStatus !== 'Type in the Relay window beside the site composer.'
          ? sourceStatus
          : 'Type here. This window stays above the site composer.';
    }

    if (bridge.style.display !== 'block') bridge.style.display = 'block';
    try {
      if (typeof bridge.showPopover === 'function' && !bridge.matches(':popover-open')) bridge.showPopover();
    } catch {}
    positionTopBridge(bridge);
    if (!generatedDraft && !busy) {
      setTimeout(() => {
        try { direction.focus({ preventScroll: true }); } catch { try { direction.focus(); } catch {} }
      }, 0);
    }
  }

  function openTopLayerComposer() {
    syncHostMount();
    armModalInert();
    syncTopBridge();
  }

  function emptyFieldText(value) {
    return !clean(normalizeEditorText(value), 4000);
  }

  function wantsInstructionCapture() {
    return Boolean(
      panelOpen
      && !busy
      && !generatedDraft
      && snapshot
      && emptyFieldText(snapshot.text)
      && (directionWrap.classList.contains('visible') || clarificationBox.classList.contains('visible'))
    );
  }

  function activeRelayField() {
    const bridgeDirection = topBridge?.querySelector('[data-relay-direction]');
    if (
      bridgeDirection instanceof HTMLTextAreaElement
      && topBridge?.style.display === 'block'
      && !generatedDraft
      && !busy
    ) return bridgeDirection;
    if (clarificationBox.classList.contains('visible')) return clarificationInput;
    if (directionWrap.classList.contains('visible')) return directionInput;
    return null;
  }

  function focusRelayField(field = activeRelayField()) {
    if (!field) return;
    holdRelayFocus = true;
    try { field.focus({ preventScroll: true }); }
    catch { try { field.focus(); } catch {} }
  }

  function applyRelayFieldInput(field, mutator) {
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? field.value.length;
    const next = mutator(field.value, start, end);
    field.value = next.value.slice(0, field.maxLength > 0 ? field.maxLength : 1000);
    const caret = Math.min(next.caret, field.value.length);
    field.selectionStart = field.selectionEnd = caret;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: next.inputType || 'insertText', data: next.data || null }));
    updateDraftAvailability();
  }

  function isReplyComposer(target = editor || snapshot?.editor) {
    if (!(target instanceof HTMLElement)) return false;
    const facebookKind = facebookComposerKind(target);
    if (facebookKind) return facebookKind === 'reply';
    const linkedinKind = linkedinComposerKind(target);
    if (linkedinKind === 'post') return false;
    const meta = fieldMetadata(target).toLowerCase();
    const placeholder = String(target.getAttribute?.('placeholder') || target.getAttribute?.('title') || '').toLowerCase();
    const aria = String(target.getAttribute?.('aria-label') || '').toLowerCase();
    const blob = `${meta} ${placeholder} ${aria}`;
    if (/\breply\b|\bcomment\b|\bresponse\b/.test(blob) || /reply to u\//i.test(blob)) return true;

    const hostname = location.hostname.toLowerCase();
    if (/mail\.google\./.test(hostname)) {
      const dialog = target.closest('[role="dialog"]');
      const dialogLabel = (dialog?.getAttribute('aria-label') || '').toLowerCase();
      if (/\breply\b/i.test(dialogLabel)) return true;
      // A new-message compose exposes a subject field. Inline reply editors do
      // not, and Gmail often gives their contenteditable no useful aria label.
      // Gmail may have an unrelated New Message window open while the user is
      // replying inline. Only inspect the focused editor's own compose window.
      const composeRoot = target.closest('.M9');
      const subjectField = composeRoot?.querySelector('[name="subjectbox"], input[placeholder*="Subject" i]');
      const subjectRect = subjectField instanceof HTMLElement ? subjectField.getBoundingClientRect() : null;
      const hasVisibleSubject = Boolean(
        subjectField instanceof HTMLElement
        && !subjectField.hidden
        && subjectField.getAttribute('aria-hidden') !== 'true'
        && subjectRect
        && subjectRect.width > 20
        && subjectRect.height > 8
      );
      if (hasVisibleSubject) return false;
      return target.matches('[contenteditable="true"], [contenteditable=""], [role="textbox"][contenteditable]')
        || target.isContentEditable;
    }
    if (/web\.whatsapp\.com/.test(hostname)) {
      if (whatsappQuotedReply(target)) return true;
      if (target.closest('#main footer, footer, [data-testid="conversation-compose-box"], [data-testid="conversation-compose-box-input"]')) return true;
      if (/type a message/.test(blob) && target.closest('#main')) return true;
    }

    // Reddit: "Reply to u/name" lives in nearby chrome, not always on the editor attrs.
    if (/(?:^|\.)reddit\.com$/.test(hostname)) {
      if (target.closest('shreddit-comment, [id^="t1_"], shreddit-comment-tree, [slot="commentComposer"]')) return true;
      let node = target.parentElement;
      for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
        const label = clean((node.getAttribute?.('aria-label') || '') + ' ' + (node.innerText || '').slice(0, 160), 200).toLowerCase();
        if (/reply to u\/|reply to u\/|add a comment|leave a comment/.test(label) || /^reply to\b/.test(label)) return true;
        if (node.matches?.('shreddit-composer, shreddit-comment-composer, faceplate-form, form')) {
          if (/reply to|comment/.test(label)) return true;
          break;
        }
      }
      if (/\/comments\//.test(location.pathname) && !target.closest('#post-title, [name="title"], shreddit-post')) {
        if (target.closest('shreddit-composer, [id*="comment"], faceplate-textarea, form')) return true;
      }
    }

    if (/(?:^|\.)quora\.com$/.test(hostname)) {
      if (target.closest('[class*="Comment"], [class*="Answer"], [role="dialog"]')) {
        const label = clean(target.closest('[role="dialog"], article, form')?.innerText || '', 160).toLowerCase();
        if (/reply|comment|answer/.test(label)) return true;
      }
    }

    if (/(?:^|\.)(?:facebook|instagram|linkedin|twitter|x)\.com$|(?:^|\.)threads\.net$/.test(hostname)) {
      let node = target.parentElement;
      for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
        const label = clean((node.getAttribute?.('aria-label') || '') + ' ' + (node.innerText || '').slice(0, 120), 160).toLowerCase();
        if (/\breply\b|\bcomment\b|\brespond\b/.test(label)) return true;
      }
    }
    return false;
  }

  function contextHint(target = editor || snapshot?.editor) {
    if (!(target instanceof HTMLElement) || !snapshot?.context) return '';
    const selected = clean(snapshot.context.selectedText, 80);
    if (selected) {
      if (/web\.whatsapp\.com/.test(location.hostname.toLowerCase()) && /replying to:/i.test(snapshot.context.nearbyText || '')) {
        return `Replying to: “${selected}”`;
      }
      return `Using selection: “${selected}”`;
    }
    const nearby = clean(snapshot.context.nearbyText, 80);
    if (facebookComposerKind(target) === 'reply' && nearby) return 'Using the Facebook post and recent comments';
    if (isReplyComposer(target) && nearby) return `Using recent thread context`;
    return '';
  }

  function configureComposer(text) {
    const hasText = !emptyFieldText(text);
    const reply = isReplyComposer();
    const facebookKind = facebookComposerKind(editor || snapshot?.editor);
    const linkedinKind = linkedinComposerKind(editor || snapshot?.editor);
    const post = facebookKind === 'post' || linkedinKind === 'post';
    actionRow.classList.add('visible');
    suggestButton.hidden = hasText || !reply;
    question.textContent = hasText
      ? (reply ? 'Improve this reply' : post ? 'Improve this post' : 'Improve what’s already here')
      : (reply ? 'What should this reply say?' : post ? 'What do you want to post?' : 'What do you want to write?');
    directionInput.value = '';
    directionInput.placeholder = reply
      ? 'What you need to achieve or situation to navigate…'
      : post ? 'Describe the post you want to create…' : 'Short instruction…';
    directionWrap.classList.toggle('visible', !hasText);
    draftButton.textContent = hasText ? 'Improve' : 'Create draft';
    if (!hasText) {
      if (needsModalInert()) {
        holdRelayFocus = false;
        status.textContent = 'Type in the Relay window beside the site composer.';
        openTopLayerComposer();
      } else {
        const hint = contextHint();
        status.textContent = hint || (reply ? 'Describe the situation for suggestions, or write an instruction.' : '');
        closeTopBridge();
        releaseModalInert();
        setTimeout(() => focusRelayField(directionInput), 0);
      }
    } else {
      holdRelayFocus = false;
      releaseModalInert();
      closeTopBridge();
      status.textContent = contextHint() || '';
    }
  }

  function inferGoal(text) {
    return emptyFieldText(text) ? 'create' : 'improve_text';
  }

  function refreshSnapshotFromPage() {
    if (!snapshot) return false;
    const liveEditor = resolveLiveEditor();
    if (!(liveEditor instanceof HTMLElement) || !isAttached(liveEditor)) return false;
    editor = liveEditor;
    snapshot.editor = liveEditor;
    snapshot.text = normalizeEditorText(readEditorMessage(liveEditor)).trim();
    snapshot.context = fieldContext(liveEditor);
    return true;
  }

  function hasConversationContext() {
    return Boolean(clean(snapshot?.context?.selectedText, 3000) || clean(snapshot?.context?.nearbyText, 5000));
  }

  function updateDraftAvailability() {
    if (!snapshot) return;
    const hasDirection = Boolean(directionInput.value.trim());
    const hasDraft = !emptyFieldText(snapshot.text);
    draftButton.disabled = busy || (!hasDirection && !hasDraft);
    suggestButton.disabled = busy || Boolean(hasDraft) || (!hasDirection && !hasConversationContext());
    if (!generatedDraft && !busy && !hasDirection && !hasDraft && wantsInstructionCapture()) {
      if (needsModalInert()) {
        status.textContent = 'Type in the Relay window beside the site composer.';
      } else {
        status.textContent = contextHint() || (isReplyComposer()
          ? 'Suggest replies uses the recent conversation, or add an instruction for a specific outcome.'
          : '');
      }
      return;
    }
    if (!generatedDraft && !busy && hasDirection) status.textContent = contextHint() || '';
  }

  function positionUi() {
    if (!eligibleEditor(editor)) return;
    const rect = editor.getBoundingClientRect();
    const chipWidth = 68;
    const chipLeft = Math.min(window.innerWidth - chipWidth - 10, Math.max(10, rect.right - chipWidth));
    const chipTop = rect.top >= 46 ? rect.top - 42 : Math.min(window.innerHeight - 44, rect.bottom + 8);
    chip.style.left = `${chipLeft}px`;
    chip.style.top = `${Math.max(8, chipTop)}px`;
    if (!panelOpen) return;
    const gap = 12;
    const panelRect = panel.getBoundingClientRect();
    const panelWidth = panelRect.width || Math.min(380, window.innerWidth - 24);
    const panelHeight = panelRect.height || Math.min(520, window.innerHeight - 24);
    const rightSpace = window.innerWidth - rect.right - gap;
    const leftSpace = rect.left - gap;
    const belowSpace = window.innerHeight - rect.bottom - gap;
    const aboveSpace = rect.top - gap;
    const clampTop = value => Math.max(12, Math.min(window.innerHeight - panelHeight - 12, value));
    const clampLeft = value => Math.max(12, Math.min(window.innerWidth - panelWidth - 12, value));
    let panelLeft;
    let panelTop;

    // Prefer a side position so Relay never sits on top of the website composer.
    if (rightSpace >= panelWidth) {
      panelLeft = rect.right + gap;
      panelTop = clampTop(rect.top);
    } else if (leftSpace >= panelWidth) {
      panelLeft = rect.left - panelWidth - gap;
      panelTop = clampTop(rect.top);
    } else if (belowSpace >= panelHeight) {
      panelLeft = clampLeft(rect.right - panelWidth);
      panelTop = rect.bottom + gap;
    } else if (aboveSpace >= panelHeight) {
      panelLeft = clampLeft(rect.right - panelWidth);
      panelTop = rect.top - panelHeight - gap;
    } else if (rightSpace >= leftSpace) {
      panelLeft = clampLeft(rect.right + gap);
      panelTop = clampTop(rect.top);
    } else {
      panelLeft = clampLeft(rect.left - panelWidth - gap);
      panelTop = clampTop(rect.top);
    }
    panel.style.left = `${panelLeft}px`;
    panel.style.top = `${panelTop}px`;
  }

  function setBusy(value) {
    busy = value;
    continueButton.disabled = value;
    insertButton.disabled = value;
    copyButton.disabled = value;
    toneButton.disabled = value;
    startOverButton.disabled = value;
    directionInput.disabled = value;
    draftButton.disabled = value;
    suggestButton.disabled = value;
    refineBtn.disabled = value;
    syncTopBridge();
  }

  function showDraft(draft) {
    generatedDraft = draft;
    const reply = isReplyComposer();
    const post = facebookComposerKind(editor || snapshot?.editor) === 'post'
      || linkedinComposerKind(editor || snapshot?.editor) === 'post';
    question.textContent = snapshot?.text.trim()
      ? (reply ? 'Improved reply' : post ? 'Improved post' : 'Improved version')
      : (reply ? 'Reply ready' : post ? 'Post ready' : 'Draft ready');
    preview.textContent = draft;
    preview.classList.add('visible');
    clarificationBox.classList.remove('visible');
    actions.classList.add('visible');
    insertButton.hidden = false;
    copyButton.hidden = false;
    toneButton.hidden = false;
    startOverButton.hidden = false;
    undoButton.hidden = true;
    doneButton.hidden = true;
    const [, toneName] = TONES[toneIndex];
    toneLabel.textContent = `${toneName} tone · Review before inserting`;
    status.textContent = reply
      ? (snapshot?.context?.nearbyText ? 'Reply ready — using recent conversation context' : 'Reply ready — not sent')
      : post ? 'Post ready — not posted' : 'Ready — not sent';
    refineWrap.classList.add('visible');
    refineInput.placeholder = reply ? 'Refine this reply…' : post ? 'Refine this post…' : 'Refine this draft…';
    refineInput.value = '';
    syncTopBridge();
  }

  function resetPanel(keepEditor = true) {
    holdRelayFocus = false;
    releaseModalInert();
    closeTopBridge();
    panelOpen = false;
    panel.classList.remove('open');
    snapshot = null;
    generatedDraft = '';
    userDirection = '';
    clarificationAnswer = '';
    undoState = null;
    currentGoal = '';
    preview.textContent = '';
    preview.classList.remove('visible');
    clarificationBox.classList.remove('visible');
    actions.classList.remove('visible');
    insertButton.hidden = false;
    copyButton.hidden = false;
    toneButton.hidden = false;
    startOverButton.hidden = false;
    undoButton.hidden = true;
    doneButton.hidden = true;
    toneLabel.textContent = '';
    status.textContent = '';
    question.textContent = '';
    refineWrap.classList.remove('visible');
    directionWrap.classList.remove('visible');
    actionRow.classList.remove('visible');
    directionInput.value = '';
    directionInput.placeholder = '';
    if (!keepEditor) editor = null;
    render();
  }

  function startOver() {
    if (!snapshot || busy) return;
    currentGoal = '';
    toneIndex = 0;
    generatedDraft = '';
    userDirection = '';
    clarificationAnswer = '';
    undoState = null;
    preview.textContent = '';
    preview.classList.remove('visible');
    clarificationBox.classList.remove('visible');
    actions.classList.remove('visible');
    refineWrap.classList.remove('visible');
    toneLabel.textContent = '';
    status.textContent = '';
    configureComposer(snapshot.text);
    updateDraftAvailability();
    positionUi();
  }

  function render() {
    const active = eligibleEditor(editor);
    chip.classList.toggle('visible', active && !panelOpen);
    const useBridge = needsModalInert() && panelOpen && snapshot && emptyFieldText(snapshot.text);
    panel.classList.toggle('open', Boolean(active && panelOpen && !useBridge));
    if (panelOpen) syncHostMount();
    positionUi();
    syncTopBridge();
  }

  const FALLBACK_API_URL = 'https://relay.durgaai.com/api/compose';
  const FALLBACK_EVENT_URL = 'https://relay.durgaai.com/api/events';
  let relayPort = null;
  let relayPortSeq = 0;
  const relayPortWaiters = new Map();

  function ensureRelayPort() {
    if (!chrome?.runtime?.connect) return null;
    if (relayPort) return relayPort;
    try {
      relayPort = chrome.runtime.connect({ name: 'relay' });
      relayPort.onMessage.addListener((message) => {
        const waiter = relayPortWaiters.get(message?.id);
        if (!waiter) return;
        relayPortWaiters.delete(message.id);
        waiter.resolve(message);
      });
      relayPort.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError?.message || 'Could not establish connection. Receiving end does not exist.';
        for (const waiter of relayPortWaiters.values()) waiter.reject(new Error(err));
        relayPortWaiters.clear();
        relayPort = null;
      });
      return relayPort;
    } catch {
      relayPort = null;
      return null;
    }
  }

  function sendViaPort(type, body) {
    return new Promise((resolve, reject) => {
      const port = ensureRelayPort();
      if (!port) {
        reject(new Error('Could not establish connection. Receiving end does not exist.'));
        return;
      }
      const id = ++relayPortSeq;
      const timer = setTimeout(() => {
        relayPortWaiters.delete(id);
        reject(new Error('Relay background timed out. Reload the extension, then refresh this tab.'));
      }, 45000);
      relayPortWaiters.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); }
      });
      try {
        port.postMessage({ id, type, body });
      } catch (error) {
        clearTimeout(timer);
        relayPortWaiters.delete(id);
        reject(error instanceof Error ? error : new Error('Failed to fetch'));
      }
    });
  }

  function sendViaMessage(type, body) {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome?.runtime?.sendMessage) {
          reject(new Error('Reload the Relay extension, then refresh this tab.'));
          return;
        }
        chrome.runtime.sendMessage({ type, body }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Failed to fetch'));
            return;
          }
          if (!response) {
            reject(new Error('Failed to fetch'));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to fetch'));
      }
    });
  }

  async function directFallback(type, body) {
    const url = type === 'relay-compose' ? FALLBACK_API_URL : FALLBACK_EVENT_URL;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(body || {}),
        clientId: 'X' + crypto.randomUUID().replace(/-/g, ''),
        extensionVersion: 'content-fallback'
      })
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }

  function isBridgeError(error) {
    return /receiving end does not exist|extension context invalidated|could not establish connection/i.test(
      error instanceof Error ? error.message : String(error || '')
    );
  }

  async function extensionRequest(type, body) {
    const attempts = [
      () => sendViaPort(type, body),
      () => sendViaMessage(type, body),
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 75));
        return sendViaMessage(type, body);
      }
    ];
    let lastError = null;
    for (const attempt of attempts) {
      try {
        return await attempt();
      } catch (error) {
        lastError = error;
        if (!isBridgeError(error)) throw error;
      }
    }
    try {
      return await directFallback(type, body);
    } catch {
      throw new Error(
        lastError instanceof Error && /receiving end|context invalidated|establish connection/i.test(lastError.message)
          ? 'Relay background is not connected. Reload the extension in chrome://extensions, then refresh this tab.'
          : (lastError instanceof Error ? lastError.message : 'Failed to fetch')
      );
    }
  }

  async function track(event, result = 'none') {
    try {
      await extensionRequest('relay-event', {
        event,
        pageType: snapshot?.context?.pageType || (editor ? detectPageType(editor) : 'generic'),
        goal: currentGoal || 'none',
        tone: TONES[toneIndex]?.[0] || 'none',
        result
      });
    } catch {}
  }

  async function generate({ isToneRetry = false, clarification = '', draftBase = '' } = {}) {
    if (!snapshot || !currentGoal || busy) return;
    setBusy(true);
    preview.classList.remove('visible');
    actions.classList.remove('visible');
    clarificationBox.classList.remove('visible');
    status.textContent = 'Relay is drafting…';
    if (isToneRetry) void track('tone_retried');
    try {
      const response = await extensionRequest('relay-compose', {
        text: draftBase || snapshot.text,
        direction: userDirection,
        goal: currentGoal,
        tone: TONES[toneIndex][0],
        context: snapshot.context,
        clarification
      });
      const result = response.data || {};
      if (!response.ok) throw new Error(result.error || 'Relay could not create this draft.');
      if (result.needsClarification) {
        clarificationLabel.textContent = result.clarification || 'What is the main point you want this to communicate?';
        clarificationInput.value = '';
        clarificationBox.classList.add('visible');
        refineWrap.classList.remove('visible');
        directionWrap.classList.remove('visible');
        status.textContent = 'One detail is needed. Your field has not changed.';
        void track('clarification_requested');
        setTimeout(() => clarificationInput.focus(), 0);
        return;
      }
      if (typeof result.draft !== 'string' || !result.draft.trim()) throw new Error('Relay returned an empty draft.');
      if (snapshot.editor && editor && isAttached(snapshot.editor) && snapshot.editor !== editor) {
        throw new Error('The writing field changed. Open Relay again.');
      }
      showDraft(result.draft.trim());
      if (!snapshot.editor || !isAttached(snapshot.editor)) {
        status.textContent = 'Draft ready — reopen the post box, click inside it, then Insert.';
      }
      void track('generation_succeeded', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Relay could not create this draft.';
      const visibleError = /emotion|gratitude|greeting|promise|placeholder|emoticon|currency|number|date/i.test(message)
        ? `${message} Try a clearer instruction, or Change tone after a successful draft.`
        : message;
      if (snapshot && !snapshot.text.trim()) {
        directionWrap.classList.add('visible');
        directionInput.value = userDirection;
        actionRow.classList.add('visible');
        updateDraftAvailability();
      }
      // updateDraftAvailability may refresh ordinary helper copy. Restore the
      // actual failure afterward so the top-layer Facebook panel cannot make a
      // failed request look like an unresponsive button.
      status.textContent = visibleError;
      void track('generation_failed', 'error');
    } finally {
      setBusy(false);
      positionUi();
    }
  }

  async function copyDraft() {
    if (!generatedDraft) return;
    try {
      await navigator.clipboard.writeText(generatedDraft);
    } catch {
      const temporary = document.createElement('textarea');
      temporary.value = generatedDraft;
      temporary.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
      document.documentElement.append(temporary);
      temporary.select();
      document.execCommand('copy');
      temporary.remove();
    }
    status.textContent = 'Copied — not sent';
    syncTopBridge();
    void track('copied', 'success');
  }

  function requestRefinement(instruction = refineInput.value.trim()) {
    if (!snapshot || busy || !generatedDraft) return;
    const more = String(instruction || '').trim();
    if (!more) return;
    refineInput.value = '';
    const bridgeRefine = topBridge?.querySelector('[data-relay-refine]');
    if (bridgeRefine) bridgeRefine.value = '';
    userDirection = more;
    currentGoal = 'improve_text';
    void generate({ draftBase: generatedDraft });
  }

  function requestToneChange() {
    if (!generatedDraft || busy) return;
    toneIndex = (toneIndex + 1) % TONES.length;
    void generate({ isToneRetry: true, clarification: clarificationAnswer });
  }

  // Keep modal composers (Facebook Lexical, etc.) from closing when Relay is used.
  chip.addEventListener('mousedown', event => { event.preventDefault(); });
  panel.addEventListener('mousedown', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('textarea, input, .direction, .clarify-input')) {
      holdRelayFocus = true;
      return;
    }
    event.preventDefault();
  });
  directionInput.addEventListener('pointerdown', event => {
    event.stopPropagation();
    holdRelayFocus = true;
    setTimeout(() => focusRelayField(directionInput), 0);
  });
  clarificationInput.addEventListener('pointerdown', event => {
    event.stopPropagation();
    holdRelayFocus = true;
    setTimeout(() => focusRelayField(clarificationInput), 0);
  });
  directionInput.addEventListener('blur', () => {
    if (!holdRelayFocus || !wantsInstructionCapture()) return;
    setTimeout(() => {
      if (holdRelayFocus && wantsInstructionCapture() && !isRelayUi(document.activeElement)) {
        focusRelayField(directionInput);
      }
    }, 0);
  });
  clarificationInput.addEventListener('blur', () => {
    if (!holdRelayFocus || !wantsInstructionCapture()) return;
    setTimeout(() => {
      if (holdRelayFocus && wantsInstructionCapture() && !isRelayUi(document.activeElement)) {
        focusRelayField(clarificationInput);
      }
    }, 0);
  });

  chip.addEventListener('click', () => {
    if (!eligibleEditor(editor)) return;
    panelOpen = true;
    if (snapshot && (snapshot.editor === editor || (!snapshot.editor && (generatedDraft || undoState)))) {
      snapshot.editor = editor;
      if (generatedDraft) showDraft(generatedDraft);
      else if (emptyFieldText(snapshot.text)) armModalInert();
      render();
      updateDraftAvailability();
      void track('panel_opened');
      return;
    }
    const text = normalizeEditorText(readEditorMessage(editor)).trim();
    const context = fieldContext(editor);
    rememberedSelection = '';
    rememberedSelectionAt = 0;
    snapshot = { editor, text, context };
    currentGoal = '';
    toneIndex = 0;
    generatedDraft = '';
    userDirection = '';
    clarificationAnswer = '';
    undoState = null;
    configureComposer(text);
    preview.classList.remove('visible');
    clarificationBox.classList.remove('visible');
    actions.classList.remove('visible');
    toneLabel.textContent = '';
    updateDraftAvailability();
    render();
    void track('panel_opened');
  });

  directionInput.addEventListener('input', () => {
    if (generatedDraft) {
      generatedDraft = '';
      preview.textContent = '';
      preview.classList.remove('visible');
      actions.classList.remove('visible');
      refineWrap.classList.remove('visible');
      toneLabel.textContent = '';
    }
    updateDraftAvailability();
  });

  function requestDraftGeneration() {
    if (!snapshot || busy) return;
    refreshSnapshotFromPage();
    userDirection = directionInput.value.trim();
    if (!userDirection && !snapshot.text.trim()) return updateDraftAvailability();
    holdRelayFocus = false;
    currentGoal = inferGoal(snapshot.text);
    toneIndex = 0;
    clarificationAnswer = '';
    void track('goal_selected');
    void generate();
  }

  function requestSuggestions() {
    if (!snapshot || busy) return;
    refreshSnapshotFromPage();
    userDirection = directionInput.value.trim();
    if (!userDirection && !hasConversationContext()) {
      status.textContent = 'Open the conversation with visible messages, then try Suggest replies again.';
      syncTopBridge();
      return updateDraftAvailability();
    }
    holdRelayFocus = false;
    currentGoal = 'suggest';
    toneIndex = 0;
    clarificationAnswer = '';
    void track('goal_selected');
    void generate();
  }

  draftButton.addEventListener('click', requestDraftGeneration);
  suggestButton.addEventListener('click', requestSuggestions);

  backBtn.addEventListener('click', startOver);

  refineBtn.addEventListener('click', () => requestRefinement());

  continueButton.addEventListener('click', () => {
    const answer = clarificationInput.value.trim();
    if (!answer || busy) return;
    holdRelayFocus = false;
    clarificationAnswer = answer;
    void track('clarification_completed');
    void generate({ clarification: clarificationAnswer });
  });

  clarificationInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    continueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  let insertInFlight = false;
  function requestInsert() {
    if (!generatedDraft || insertInFlight) return;
    insertInFlight = true;
    holdRelayFocus = false;
    releaseModalInert();
    const liveEditor = resolveLiveEditor();
    if (!liveEditor) {
      insertInFlight = false;
      panelOpen = true;
      status.textContent = 'Reopen the post box, click inside it, then press Insert again.';
      render();
      return;
    }
    editor = liveEditor;
    if (snapshot) {
      snapshot.editor = liveEditor;
      snapshot.text = normalizeEditorText(readEditorMessage(liveEditor)).trim();
    } else snapshot = { editor: liveEditor, text: '', context: fieldContext(liveEditor) };
    undoState = {
      editor: liveEditor,
      original: snapshot.text,
      originalHtml: liveEditor instanceof HTMLElement && liveEditor.isContentEditable ? liveEditor.innerHTML : null,
      draft: generatedDraft
    };
    replaceEditor(liveEditor, generatedDraft);
    if (isExactDouble(readEditorMessage(liveEditor), generatedDraft)) collapseDoubledEditor(liveEditor, generatedDraft);
    if (!editorReflects(liveEditor, generatedDraft)) {
      insertInFlight = false;
      panelOpen = true;
      status.textContent = 'Insert did not stick. Click inside the post box and try Insert again.';
      render();
      void track('inserted', 'error');
      return;
    }
    question.textContent = 'Inserted — not sent';
    preview.classList.remove('visible');
    insertButton.hidden = true;
    copyButton.hidden = true;
    toneButton.hidden = true;
    startOverButton.hidden = true;
    undoButton.hidden = false;
    doneButton.hidden = false;
    toneLabel.textContent = '';
    status.textContent = 'Undo restores the exact original.';
    panelOpen = false;
    render();
    void track('inserted', 'success');
    setTimeout(() => { insertInFlight = false; }, 500);
  }

  insertButton.addEventListener('click', requestInsert);

  undoButton.addEventListener('click', () => {
    if (!undoState) return;
    const liveEditor = (undoState.editor && isAttached(undoState.editor) && eligibleEditor(undoState.editor))
      ? undoState.editor
      : resolveLiveEditor();
    if (!liveEditor) {
      panelOpen = true;
      status.textContent = 'Reopen the post box, click inside it, then press Undo again.';
      render();
      return;
    }
    if (typeof undoState.originalHtml === 'string' && liveEditor instanceof HTMLElement && liveEditor.isContentEditable) {
      liveEditor.innerHTML = undoState.originalHtml;
      try { liveEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'historyUndo' })); }
      catch { liveEditor.dispatchEvent(new Event('input', { bubbles: true })); }
    } else {
      replaceEditor(liveEditor, undoState.original);
    }
    undoState = null;
    showDraft(generatedDraft);
    status.textContent = 'Original restored — draft not inserted';
    positionUi();
  });

  copyButton.addEventListener('click', () => { void copyDraft(); });
  startOverButton.addEventListener('click', startOver);
  doneButton.addEventListener('click', () => resetPanel());
  toneButton.addEventListener('click', requestToneChange);
  minimizeButton.addEventListener('click', () => {
    holdRelayFocus = false;
    releaseModalInert();
    closeTopBridge();
    panelOpen = false;
    render();
  });
  closeButton.addEventListener('click', () => resetPanel());

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const text = clean(selection?.toString(), 3000);
    if (!text) return;
    const anchor = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
    if (isRelayUi(anchor)) return;
    if (anchor && !nearestEditor(anchor)) {
      rememberedSelection = text;
      rememberedSelectionAt = Date.now();
    }
  }, true);

  document.addEventListener('focusin', event => {
    if (isRelayUi(event.target) || (typeof event.composedPath === 'function' && event.composedPath().some(isRelayUi))) return;
    if (holdRelayFocus && wantsInstructionCapture()) {
      queueMicrotask(() => focusRelayField());
      return;
    }
    const next = editorFromEvent(event);
    if (!next) {
      const candidate = event.target instanceof Element ? event.target.closest(EDITOR_SELECTOR) : null;
      if (candidate && !isRelayUi(candidate)) resetPanel(false);
      return;
    }
    if (editor !== next) {
      editor = next;
      if (panelOpen) resetPanel();
    }
    render();
  }, true);

  document.addEventListener('input', event => {
    if (isRelayUi(event.target) || (typeof event.composedPath === 'function' && event.composedPath().some(isRelayUi))) return;
    const changed = editorFromEvent(event);
    if (!changed) return;
    editor = changed;
    if (event.isTrusted) userEditedEditors.add(changed);
    if (internalWrite) return render();
    if (snapshot) resetPanel();
    render();
  }, true);

  function handleInstructionKeydown(event) {
    if (topBridge?.contains(event.target)) return;
    if (event.key === 'Escape' && panelOpen) {
      resetPanel();
      return;
    }
    if (!wantsInstructionCapture()) return;
    const field = activeRelayField();
    if (!field) return;
    if (event.isComposing || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (field === clarificationInput) continueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      else draftButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      applyRelayFieldInput(field, (value, start, end) => {
        if (start === end && start > 0) {
          return { value: value.slice(0, start - 1) + value.slice(end), caret: start - 1, inputType: 'deleteContentBackward' };
        }
        return { value: value.slice(0, start) + value.slice(end), caret: start, inputType: 'deleteContentBackward' };
      });
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      applyRelayFieldInput(field, (value, start, end) => {
        if (start === end) {
          return { value: value.slice(0, start) + value.slice(end + 1), caret: start, inputType: 'deleteContentForward' };
        }
        return { value: value.slice(0, start) + value.slice(end), caret: start, inputType: 'deleteContentForward' };
      });
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      applyRelayFieldInput(field, (value, start, end) => ({
        value: value.slice(0, start) + event.key + value.slice(end),
        caret: start + 1,
        inputType: 'insertText',
        data: event.key
      }));
    }
  }

  // Window capture runs before LinkedIn's dialog handlers. Do not also bind
  // document or each key would be applied twice.
  window.addEventListener('keydown', handleInstructionKeydown, true);

  function positionRelayUi() {
    positionUi();
    if (topBridge) positionTopBridge(topBridge);
  }

  let editorDiscoveryQueued = false;

  function liveSocialModalEditor() {
    const roots = Array.from(document.querySelectorAll(
      '[role="dialog"], dialog, .artdeco-modal, .share-box, .share-creation-state'
    )).reverse();
    for (const root of roots) {
      if (!(root instanceof HTMLElement) || isRelayUi(root)) continue;
      const candidates = collectEditors(root);
      const social = candidates.find(candidate => facebookComposerKind(candidate) || linkedinComposerKind(candidate));
      if (social) return social;
    }
    if (/(?:^|\.)linkedin\.com$/.test(location.hostname.toLowerCase())) {
      const candidates = collectEditors(document);
      const post = candidates.find(candidate => linkedinComposerKind(candidate) === 'post');
      if (post) return post;
      const reply = candidates.find(candidate => linkedinComposerKind(candidate) === 'reply');
      if (reply) return reply;
    }
    return null;
  }

  function adoptDiscoveredEditor(next) {
    if (!next || next === editor || !isAttached(next)) return;
    if (panelOpen) resetPanel(false);
    editor = next;
    render();
  }

  function queueAddedEditorDiscovery(addedNodes) {
    if (editorDiscoveryQueued) return;
    const roots = Array.from(addedNodes || []).filter(node => node instanceof Element && !isRelayUi(node));
    if (!roots.length) return;
    editorDiscoveryQueued = true;
    requestAnimationFrame(() => {
      editorDiscoveryQueued = false;
      const candidates = [];
      for (const root of roots) {
        if (!root.isConnected || isRelayUi(root)) continue;
        if (eligibleEditor(root)) candidates.push(root);
        collectEditors(root, candidates);
      }
      const next = liveSocialModalEditor()
        || candidates.find(candidate => candidate.closest('[role="dialog"], dialog, .artdeco-modal'))
        || candidates.at(-1);
      adoptDiscoveredEditor(next);
    });
  }

  function scheduleSocialComposerDiscovery(event) {
    if (!needsModalInert() || isRelayUi(event?.target)) return;
    const target = event?.target instanceof Element ? event.target : null;
    const label = clean(
      `${target?.getAttribute?.('aria-label') || ''} ${target?.innerText || ''}`,
      180
    ).toLowerCase();
    const modalOpen = Boolean(document.querySelector('[role="dialog"], dialog, .artdeco-modal, .share-box, .share-creation-state'));
    if (!modalOpen && !/\b(?:start|create|write|add|reply|comment|post)\b/.test(label)) return;
    for (const delay of [0, 80, 220, 500, 900]) {
      setTimeout(() => adoptDiscoveredEditor(liveSocialModalEditor()), delay);
    }
  }

  document.addEventListener('click', scheduleSocialComposerDiscovery, true);

  window.addEventListener('scroll', positionRelayUi, { passive: true });
  window.addEventListener('resize', positionRelayUi, { passive: true });
  // Facebook and other Meta pages mutate large parts of the document while a
  // composer is open. Rendering on every mutation can create a feedback loop
  // (Relay overlay mutation -> observer -> render) and freeze the host page.
  // Focus/input events already discover active editors; this observer is only
  // needed to preserve the session when the host removes that editor.
  new MutationObserver((mutations) => {
    if (editor && !isAttached(editor)) {
      if (panelOpen || generatedDraft || undoState) {
        keepPanelAliveWithoutEditor('Composer closed. Reopen it, click inside the field, then Insert.');
        return;
      }
      resetPanel(false);
    }
    // Discover newly opened site composers from their own added subtree. This
    // makes LinkedIn's empty post modal available before the user types, while
    // avoiding the old global render-on-every-mutation Facebook freeze loop.
    const addedNodes = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) addedNodes.push(node);
    }
    queueAddedEditorDiscovery(addedNodes);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
