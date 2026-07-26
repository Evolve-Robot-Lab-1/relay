#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$DIST/relay-extension"
ZIP="$DIST/relay-extension.zip"
PUBLIC_DIR="$ROOT/public/downloads"
PUBLIC_ZIP="$PUBLIC_DIR/relay-extension.zip"

rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE/icons" "$PUBLIC_DIR"

# Store build always targets production.
cp "$ROOT/extension/content.js" "$STAGE/content.js"
cp "$ROOT/extension/PRIVACY.md" "$STAGE/PRIVACY.md"
cp "$ROOT/extension/STORE_LISTING.md" "$STAGE/STORE_LISTING.md"
cp "$ROOT/extension/README.md" "$STAGE/README.md"
cp "$ROOT/extension/icons/"*.png "$STAGE/icons/"

python3 - "$ROOT" <<'PY'
import sys
from pathlib import Path
root = Path(sys.argv[1])
stage = root / 'dist' / 'relay-extension'
bg = (root / 'extension' / 'background.js').read_text()
for local_origin in ('http://127.0.0.1:8787', 'http://192.168.1.16:8787'):
    bg = bg.replace(f'{local_origin}/api/compose', 'https://relay.durgaai.com/api/compose')
    bg = bg.replace(f'{local_origin}/api/events', 'https://relay.durgaai.com/api/events')
local_test_block = """      const requestBody = DEV_API_URL.startsWith('http://') && url === DEV_API_URL && isCompose
        ? { ...body, planCode: 'RELAY-PRO-LOCALTEST' }
        : body;
      return await postJson(url, requestBody);"""
if local_test_block not in bg:
    raise SystemExit('local test allowance block not found in background.js')
bg = bg.replace(local_test_block, "      return await postJson(url, body);")
if 'RELAY-PRO-LOCALTEST' in bg or 'http://192.168.1.16:8787' in bg or 'http://127.0.0.1:8787' in bg:
    raise SystemExit('production extension background still contains local-only configuration')
(stage / 'background.js').write_text(bg)
manifest = {
  "manifest_version": 3,
  "name": "Relay — Context-aware reply copilot",
  "version": "1.0.0",
  "description": "Know what to say on WhatsApp, Gmail, LinkedIn, and AI chats. You review every draft—Relay never sends.",
  "permissions": ["storage"],
  "host_permissions": ["https://relay.durgaai.com/*"],
  "background": {"service_worker": "background.js"},
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_title": "Relay",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png"
    }
  },
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*"],
    "js": ["content.js"],
    "run_at": "document_idle",
    "all_frames": True
  }],
  "homepage_url": "https://relay.durgaai.com"
}
import json
(stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('store manifest ready')
PY

(
  cd "$DIST"
  rm -f relay-extension.zip
  zip -qr relay-extension.zip relay-extension
)

cp "$ZIP" "$PUBLIC_ZIP"

echo "Packaged $ZIP"
ls -la "$ZIP"
echo "Published download asset $PUBLIC_ZIP"
