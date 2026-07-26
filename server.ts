import { RelayStore } from './backend';
import { HTML } from './ui';

export { RelayStore };

const INTERNAL_ORIGIN = 'https://relay.internal';
const USAGE_EVENTS = new Set(['panel_opened', 'goal_selected', 'generation_succeeded', 'generation_failed', 'clarification_requested', 'clarification_completed', 'inserted', 'copied', 'tone_retried']);
const USAGE_PAGE_TYPES = new Set(['ai', 'email', 'form', 'messaging', 'crm', 'generic']);
const USAGE_GOALS = new Set(['create', 'improve_text', 'suggest', 'write', 'reply', 'follow_up', 'ask', 'decline', 'negotiate', 'explain', 'improve_prompt', 'fill_field', 'none']);
const USAGE_TONES = new Set(['natural', 'warm', 'direct', 'none']);

function nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = '';
  bytes.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary);
}

function securityHeaders(scriptNonce: string) {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': `default-src 'none'; script-src 'nonce-${scriptNonce}'; style-src 'unsafe-inline'; connect-src 'self' wss:; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  };
}

function store(env: any) {
  return env.RELAY_STORE.get(env.RELAY_STORE.idFromName('relay-mvp-v1'));
}

async function forward(request: Request, env: any, url: URL) {
  const forwarded = new Request(INTERNAL_ORIGIN + url.pathname + url.search, request);
  forwarded.headers.set('x-relay-origin', url.origin);
  return store(env).fetch(forwarded);
}

function publicApiHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'cache-control': 'no-store'
  };
}

async function anonymousInstallHash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`relay-extension:${value}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function recordUsage(request: Request, env: any) {
  const headers = publicApiHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
  if (Number(request.headers.get('content-length') || 0) > 4096) return Response.json({ error: 'Event is too large.' }, { status: 413, headers });

  let body: any;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid event.' }, { status: 400, headers }); }
  const event = USAGE_EVENTS.has(body?.event) ? String(body.event) : '';
  const pageType = USAGE_PAGE_TYPES.has(body?.pageType) ? String(body.pageType) : 'generic';
  const goal = USAGE_GOALS.has(body?.goal) ? String(body.goal) : 'none';
  const tone = USAGE_TONES.has(body?.tone) ? String(body.tone) : 'none';
  const result = /^(?:success|error|none)$/.test(body?.result) ? String(body.result) : 'none';
  const version = /^\d+\.\d+\.\d+$/.test(body?.version) ? String(body.version) : 'unknown';
  const clientId = /^[A-Za-z0-9_-]{8,128}$/.test(body?.clientId) ? String(body.clientId) : '';
  if (!event || !clientId) return Response.json({ error: 'Invalid event.' }, { status: 400, headers });

  env.RELAY_USAGE?.writeDataPoint({
    blobs: [event, pageType, goal, tone, version, result],
    doubles: [1],
    indexes: [await anonymousInstallHash(clientId)]
  });
  return new Response(null, { status: 204, headers });
}

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    if (url.pathname === '/api/events') return recordUsage(request, env);
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws') return forward(request, env, url);

    const marketingPages: Record<string, string> = {
      '/privacy': '/privacy.html',
      '/privacy/': '/privacy.html',
      '/support': '/support.html',
      '/support/': '/support.html',
      '/pricing': '/pricing.html',
      '/pricing/': '/pricing.html',
      '/waitlist': '/waitlist.html',
      '/waitlist/': '/waitlist.html',
      '/partners': '/partners.html',
      '/partners/': '/partners.html',
      '/extension': '/extension.html',
      '/extension/': '/extension.html',
      '/use/whatsapp': '/use/whatsapp.html',
      '/use/whatsapp/': '/use/whatsapp.html',
      '/use/linkedin': '/use/linkedin.html',
      '/use/linkedin/': '/use/linkedin.html',
      '/use/chatgpt': '/use/chatgpt.html',
      '/use/chatgpt/': '/use/chatgpt.html'
    };
    if (request.method === 'GET' && marketingPages[url.pathname]) {
      const assetUrl = new URL(marketingPages[url.pathname], url.origin);
      // Pass a Request rather than a URL object. The local asset simulator accepts
      // both, while the production binding resolves clean-route rewrites reliably
      // only from a Request carrying the rewritten pathname.
      const assetRequest = new Request(assetUrl.toString(), { method: 'GET', headers: request.headers });
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      if (assetResponse.ok) {
        const headers = new Headers(assetResponse.headers);
        headers.set('content-type', 'text/html; charset=utf-8');
        headers.set('cache-control', 'public, max-age=60');
        return new Response(assetResponse.body, { status: 200, headers });
      }
      // Some asset configurations 307 clean URLs; fall through to a direct HTML body fetch once.
      if (assetResponse.status >= 300 && assetResponse.status < 400) {
        const retry = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET', headers: request.headers }));
        if (retry.ok) {
          return new Response(await retry.text(), {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' }
          });
        }
      }
    }
    if (request.method === 'GET' && (url.pathname === '/css/marketing.css' || /^\/use\/.+\.html$/.test(url.pathname) || /^\/[a-z-]+\.html$/.test(url.pathname))) {
      return env.ASSETS.fetch(request);
    }

    if (/^\/relay-[a-z-]+\.png$/.test(url.pathname)) return env.ASSETS.fetch(request);
    if (url.pathname === '/manifest.webmanifest') return env.ASSETS.fetch(request);
    if (request.method === 'GET' && url.pathname === '/downloads/relay-extension.zip') {
      const token = url.searchParams.get('token') || '';
      if (!token) {
        return new Response('A valid email request is required before downloading the extension.', {
          status: 403,
          headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }
        });
      }
      const authorization = await store(env).fetch(new Request(INTERNAL_ORIGIN + '/api/extension-download/consume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token })
      }));
      if (!authorization.ok) {
        return new Response('The download link is expired or invalid. Request a new test build.', {
          status: 403,
          headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }
        });
      }
      const assetResponse = await env.ASSETS.fetch(request);
      if (!assetResponse.ok) return new Response('Extension build is not available.', { status: 404 });
      const headers = new Headers(assetResponse.headers);
      headers.set('content-type', 'application/zip');
      headers.set('content-disposition', 'attachment; filename="relay-extension.zip"');
      headers.set('cache-control', 'no-store');
      headers.set('referrer-policy', 'no-referrer');
      headers.set('x-content-type-options', 'nosniff');
      return new Response(assetResponse.body, { status: 200, headers });
    }
    if (url.pathname === '/favicon.ico') return env.ASSETS.fetch(new Request(new URL('/relay-mark.png', url.origin), request));
    const appRoute = url.pathname === '/'
      || url.pathname === '/write'
      || /^\/i\/[A-Za-z0-9_-]{22}\/?$/.test(url.pathname)
      || /^\/c\/G[0-9a-f]{32}\/?$/i.test(url.pathname);
    if (request.method !== 'GET' || !appRoute) return new Response('Not found', { status: 404 });
    const scriptNonce = nonce();
    return new Response(HTML.replace('__NONCE__', scriptNonce), { headers: securityHeaders(scriptNonce) });
  }
};
