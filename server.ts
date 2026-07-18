import { RelayStore } from './backend';
import { HTML } from './ui';

export { RelayStore };

const INTERNAL_ORIGIN = 'https://relay.internal';

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

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws') return forward(request, env, url);
    if (/^\/relay-[a-z-]+\.png$/.test(url.pathname)) return env.ASSETS.fetch(request);
    if (url.pathname === '/favicon.ico') return env.ASSETS.fetch(new Request(new URL('/relay-mark.png', url.origin), request));
    if (request.method !== 'GET' || url.pathname !== '/') return new Response('Not found', { status: 404 });
    const scriptNonce = nonce();
    return new Response(HTML.replace('__NONCE__', scriptNonce), { headers: securityHeaders(scriptNonce) });
  }
};
