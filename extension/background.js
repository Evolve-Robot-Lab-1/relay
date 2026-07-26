'use strict';

// Local development targets the wrangler dev server. Store packages rewrite these
// URLs to https://relay.durgaai.com via `npm run extension:package`.
const DEV_API_URL = 'http://192.168.1.16:8787/api/compose';
const DEV_EVENT_URL = 'http://192.168.1.16:8787/api/events';
const PROD_API_URL = 'https://relay.durgaai.com/api/compose';
const PROD_EVENT_URL = 'https://relay.durgaai.com/api/events';

async function clientId() {
  const stored = await chrome.storage.local.get('relayClientId');
  if (/^[A-Za-z0-9_-]{8,128}$/.test(stored.relayClientId || '')) return stored.relayClientId;
  const value = 'X' + crypto.randomUUID().replace(/-/g, '');
  await chrome.storage.local.set({ relayClientId: value });
  return value;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { ok: response.ok, status: response.status, data };
}

async function handleRelayMessage(message) {
  if (!message || (message.type !== 'relay-compose' && message.type !== 'relay-event' && message.type !== 'relay-ping')) {
    return null;
  }
  if (message.type === 'relay-ping') {
    return { ok: true, status: 200, data: { version: chrome.runtime.getManifest().version } };
  }

  const id = await clientId();
  const version = chrome.runtime.getManifest().version;
  const isCompose = message.type === 'relay-compose';
  const body = {
    ...(message.body || {}),
    clientId: id,
    version: message.body?.version || version,
    extensionVersion: message.body?.extensionVersion || version
  };
  // Try local dev server first, then fall back to production.
  const urls = isCompose ? [DEV_API_URL, PROD_API_URL] : [DEV_EVENT_URL, PROD_EVENT_URL];
  let lastError;
  for (const url of urls) {
    try {
      // The unpacked development build needs enough capacity for repeated
      // cross-site regression testing. Never carry this test plan into the
      // production fallback request or the packaged store extension.
      const requestBody = DEV_API_URL.startsWith('http://') && url === DEV_API_URL && isCompose
        ? { ...body, planCode: 'RELAY-PRO-LOCALTEST' }
        : body;
      return await postJson(url, requestBody);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Failed to fetch');
}

chrome.runtime.onInstalled.addListener(() => {});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'relay') return;
  port.onMessage.addListener(async (message) => {
    try {
      const result = await handleRelayMessage(message);
      if (result) port.postMessage({ id: message.id, ...result });
    } catch (error) {
      port.postMessage({
        id: message.id,
        ok: false,
        status: 0,
        data: { error: error instanceof Error ? error.message : 'Failed to fetch' }
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || (message.type !== 'relay-compose' && message.type !== 'relay-event' && message.type !== 'relay-ping')) {
    return undefined;
  }
  handleRelayMessage(message)
    .then((result) => sendResponse(result || { ok: false, status: 0, data: { error: 'Unknown Relay message.' } }))
    .catch((error) => {
      sendResponse({
        ok: false,
        status: 0,
        data: { error: error instanceof Error ? error.message : 'Failed to fetch' }
      });
    });
  return true;
});
