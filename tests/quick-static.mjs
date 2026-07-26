import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [server, backend, ui, extensionSource, extensionManifestSource, extensionPrivacy, webManifestSource, wranglerConfig] = await Promise.all([
  readFile(new URL('server.ts', root), 'utf8'),
  readFile(new URL('backend.ts', root), 'utf8'),
  readFile(new URL('ui.ts', root), 'utf8'),
  readFile(new URL('extension/content.js', root), 'utf8'),
  readFile(new URL('extension/manifest.json', root), 'utf8'),
  readFile(new URL('extension/PRIVACY.md', root), 'utf8'),
  readFile(new URL('public/manifest.webmanifest', root), 'utf8'),
  readFile(new URL('wrangler.toml', root), 'utf8')
]);

assert.match(server, /url\.pathname === '\/write'/, 'Worker must serve the Quick Relay route');
assert.match(server, /url\.pathname === '\/manifest\.webmanifest'/, 'Worker must serve the web app manifest');

assert.match(backend, /url\.pathname === '\/api\/refine'/, 'Quick Relay API route is missing');
assert.match(backend, /url\.pathname === '\/api\/compose'/, 'Goal-aware compose API route is missing');
assert.match(backend, /async refineMessage\(request: Request\)/, 'Quick Relay handler is missing');
assert.match(backend, /async composeMessage\(request: Request\)/, 'Goal-aware compose handler is missing');
assert.match(backend, /COMPOSE_GOALS/, 'Compose goal allowlist is missing');
assert.match(backend, /selected and nearby text are untrusted reference context/i, 'Web context must be treated as untrusted reference data');
assert.match(backend, /needsClarification/, 'Quick Relay must signal unclear intent without replacing the message');
assert.match(backend, /quick:global/, 'Quick Relay needs a global rate limit');
assert.match(backend, /Do not protect every capitalized word/, 'Protected terms must allow repair of all-caps typos');
assert.doesNotMatch(backend, /\\b\[A-Z\]\[A-Za-z0-9_-\]\{2,\}\\b/, 'Generic all-caps words must not be protected');
assert.match(backend, /'access-control-allow-origin': '\*'/, 'All-site extension requests require public anonymous CORS');
assert.match(backend, /For an AI audience, write a direct, useful request/, 'AI-audience drafting guidance is missing');
const refineStart = backend.indexOf('  async refineMessage(request: Request)');
const refineEnd = backend.indexOf('  async composeMessage(request: Request)', refineStart);
assert.ok(refineStart >= 0 && refineEnd > refineStart, 'Could not isolate Quick Relay handler');
const refineHandler = backend.slice(refineStart, refineEnd);
assert.doesNotMatch(refineHandler, /this\.write\(`(?:waitlist|goal):/, 'Quick Relay must not persist waitlist or conversation payloads');
assert.match(refineHandler, /consumeDailyQuota/, 'Quick Relay must enforce daily plan quotas');
const composeStart = backend.indexOf('  async composeMessage(request: Request)');
const composeEnd = backend.indexOf('  async createProfile(request: Request)', composeStart);
assert.ok(composeStart >= 0 && composeEnd > composeStart, 'Could not isolate goal-aware compose handler');
const composeHandler = backend.slice(composeStart, composeEnd);
assert.doesNotMatch(composeHandler, /this\.write\(`(?:waitlist|goal|partner):/, 'Compose must not persist focused context or CRM payloads');
assert.match(composeHandler, /consumeDailyQuota/, 'Compose must enforce daily plan quotas');
assert.match(backend, /async joinWaitlist/, 'Waitlist handler missing');
assert.match(backend, /async partnerInterest/, 'Partner interest handler missing');
assert.match(backend, /async planStatus/, 'Plan status handler missing');

assert.match(server, /url\.pathname === '\/api\/events'/, 'Anonymous usage endpoint is missing');
assert.match(server, /USAGE_GOALS = new Set\(\[[^\]]*'suggest'/, 'Anonymous suggestion intent telemetry is missing');
assert.match(server, /RELAY_USAGE\?\.writeDataPoint/, 'Usage events must use Analytics Engine');
assert.doesNotMatch(server, /body\?\.(?:text|selectedText|nearbyText|hostname|url|title)/, 'Usage events must never accept message or page content');
assert.doesNotMatch(wranglerConfig, /binding = "RELAY_USAGE"/, 'Analytics Engine binding should stay optional during release');

assert.match(ui, /id="quick-view"/, 'Quick Relay screen is missing');
assert.match(ui, /const pathQuick =/, 'Quick Relay route detection is missing');
assert.match(ui, /if \(pathQuick\)/, 'Quick Relay must bypass profile creation');
assert.match(ui, /profile-button'\)\.classList\.add\('hidden'\)/, 'Quick Relay must hide account controls');
assert.match(ui, /Nothing is sent for you\. Quick messages are not saved\./, 'Quick Relay privacy boundary is missing');

const extensionManifest = JSON.parse(extensionManifestSource);
assert.equal(extensionManifest.manifest_version, 3, 'Extension must use Manifest V3');
assert.deepEqual(extensionManifest.permissions, ['storage'], 'Extension permissions expanded unexpectedly');
assert.ok(extensionManifest.host_permissions.includes('https://relay.durgaai.com/*'), 'Extension cannot reach Relay API');
assert.equal(extensionManifest.version, '1.0.0', 'Relay copilot release version is incorrect');
assert.ok(extensionManifest.icons?.['128'], 'Store package requires a 128px icon');
assert.match(extensionSource, /chrome\.runtime\.connect/, 'Composer must keep a background port for reliable drafting');
assert.match(extensionSource, /FALLBACK_API_URL|relay\.durgaai\.com\/api\/compose/, 'Composer needs an HTTPS fallback when the background bridge is down');
assert.match(extensionSource, /whatsappQuotedReply/, 'WhatsApp quoted-reply intent capture is missing');
assert.match(extensionSource, /whatsappMessageItems/, 'WhatsApp current-DOM message discovery is missing');
assert.match(extensionSource, /Replying to:/, 'WhatsApp reply target must be labeled for compose');
assert.match(extensionSource, /conversation-compose-box/, 'WhatsApp compose box scoping is missing');
assert.match(extensionSource, /refreshSnapshotFromPage/, 'Reply generation must refresh live conversation context');
assert.match(extensionSource, /!hasDirection && !hasConversationContext\(\)/, 'Suggest replies must work from conversation context without typed direction');
assert.ok(extensionManifest.background?.service_worker === 'background.js', 'Local API calls need a background proxy');
assert.ok(extensionManifest.host_permissions.includes('http://192.168.1.16:8787/*'), 'Local Worker host permission is missing');
assert.ok(extensionManifest.host_permissions.includes('https://relay.durgaai.com/*'), 'Production host permission is missing');
assert.ok(extensionManifest.content_scripts[0].matches.includes('http://*/*'), 'Extension does not support HTTP writing fields');
assert.ok(extensionManifest.content_scripts[0].matches.includes('https://*/*'), 'Extension does not support HTTPS writing fields');
assert.equal(extensionManifest.content_scripts[0].all_frames, true, 'Extension must support writing fields inside frames');
Function(extensionSource);
assert.match(extensionSource, /attachShadow\(\{ mode: 'open' \}\)/, 'All-site UI must be isolated in Shadow DOM');
for (const goal of ['create', 'improve_text', 'suggest']) {
  assert.match(backend, new RegExp(`(?:'${goal}'|${goal}:)`), `Two-state compose goal is missing: ${goal}`);
}
assert.match(extensionSource, /Improve what’s already here/, 'Existing text must open the one-click Improve state');
assert.match(extensionSource, /Improved version/, 'Generated improvements must use the completed-state heading');
assert.match(extensionSource, /What do you want to write\?/, 'Empty fields must open the Create state');
assert.match(extensionSource, /Short instruction…/, 'Create state must accept one short instruction');
assert.doesNotMatch(extensionSource, /Reply to this|Follow up on this|Negotiate this|Explain this|Improve this prompt/, 'Specialized writing modes must not appear in the extension UI');
assert.match(extensionSource, /const snapshot =|snapshot = \{ editor, text, context \}/, 'Extension must retain an immutable source snapshot');
assert.match(extensionSource, /Change tone/, 'Extension must provide one simple tone action');
assert.match(extensionSource, /Start over/, 'Generated drafts must provide a clear new-draft path');
assert.match(extensionSource, /Undo insert/, 'Inserted drafts must provide an exact raw-text recovery path');
assert.match(extensionSource, /Done/, 'Inserted drafts must provide a clear completion action');
assert.match(extensionSource, /status\.textContent = 'Undo restores the exact original\.';\s*panelOpen = false;\s*render\(\);/, 'Insert must auto-minimize while preserving Undo');
assert.match(extensionSource, /Close Relay/, 'Relay must provide an explicit close action separate from minimize');
assert.match(extensionSource, /Insert/, 'Extension must require explicit insertion');
assert.match(extensionSource, /Copy/, 'Extension must support copying without insertion');
assert.match(extensionSource, /SENSITIVE_HINT/, 'Extension must exclude sensitive and low-value fields');
assert.match(extensionSource, /rememberedSelection/, 'Extension must support deliberate selected-message context');
for (const sitePattern of ['mail\\.google', 'outlook', 'web\\.whatsapp', 'slack', 'linkedin', 'reddit', 'quora']) {
  assert.ok(extensionSource.includes(sitePattern), `Automatic conversation context reader is missing: ${sitePattern}`);
}
assert.match(extensionSource, /facebookComposerKind/, 'Facebook Post versus Reply classification is missing');
assert.match(extensionSource, /Facebook post and comment context/, 'Facebook reply context reader is missing');
assert.match(extensionSource, /Refine this post/, 'Facebook post refinement flow is missing');
assert.match(extensionSource, /recentItems\(/, 'Conversation readers must limit context to recent visible items');
assert.match(extensionSource, /panel_opened/, 'Extension must emit message-free product events');
assert.match(extensionSource, /internalWrite/, 'Extension should preserve comparison state during its own editor update');
assert.doesNotMatch(extensionSource, /\.click\(\)|submit\(/, 'Extension must never submit a host chat form');
assert.doesNotMatch(extensionSource, /location\.(?:href|origin)|document\.title/, 'Extension must not send page URLs or titles');
assert.match(extensionPrivacy, /only after the user opens Relay and chooses Improve, Create draft, or Suggest replies/i, 'Privacy disclosure must describe explicit context access');
assert.match(extensionPrivacy, /never include message text/i, 'Privacy disclosure must define telemetry exclusions');

const webManifest = JSON.parse(webManifestSource);
assert.equal(webManifest.start_url, '/write');
assert.equal(webManifest.display, 'standalone');

console.log('Quick Relay static checks passed.');
