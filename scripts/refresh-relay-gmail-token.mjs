import { createServer } from 'node:http';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const credentialsPath = process.argv[2];
const outputPath = process.argv[3] || '/tmp/relay-gmail-refresh-token';
if (!credentialsPath) throw new Error('Pass the Google OAuth credentials.json path.');

const credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
const client = credentials.web || credentials.installed;
if (!client?.client_id || !client?.client_secret) throw new Error('Invalid Google OAuth credentials file.');

const redirectUri = 'http://localhost:9999/callback';
if (!client.redirect_uris?.includes(redirectUri)) {
  throw new Error(`${redirectUri} is not registered in the Google OAuth client.`);
}

const state = randomBytes(24).toString('hex');
const authorizationUrl = new URL(client.auth_uri || 'https://accounts.google.com/o/oauth2/auth');
authorizationUrl.search = new URLSearchParams({
  client_id: client.client_id,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/gmail.send',
  access_type: 'offline',
  prompt: 'consent',
  state
}).toString();

const result = new Promise((resolve, reject) => {
  const server = createServer(async (request, response) => {
    const callback = new URL(request.url || '/', redirectUri);
    if (callback.pathname !== '/callback') {
      response.writeHead(404).end('Not found');
      return;
    }
    if (callback.searchParams.get('state') !== state) {
      response.writeHead(400).end('Invalid OAuth state. You can close this tab.');
      server.close();
      reject(new Error('Google returned an invalid OAuth state.'));
      return;
    }
    const code = callback.searchParams.get('code');
    if (!code) {
      response.writeHead(400).end('Google authorization was not completed. You can close this tab.');
      server.close();
      reject(new Error(callback.searchParams.get('error') || 'Google authorization was not completed.'));
      return;
    }
    try {
      const tokenResponse = await fetch(client.token_uri || 'https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: client.client_id,
          client_secret: client.client_secret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.refresh_token) throw new Error(tokenData.error || 'Google did not return a refresh token.');
      await writeFile(outputPath, tokenData.refresh_token, { mode: 0o600 });
      await chmod(outputPath, 0o600);
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Relay Gmail authorization complete. You can close this tab and return to Codex.');
      server.close();
      resolve();
    } catch (error) {
      response.writeHead(500).end('Could not complete Gmail authorization. You can close this tab.');
      server.close();
      reject(error);
    }
  });
  server.listen(9999, '127.0.0.1', () => {
    console.log('Waiting for Google authorization in your browser...');
    const browser = spawn('xdg-open', [authorizationUrl.toString()], {
      detached: true,
      stdio: 'ignore'
    });
    browser.once('error', () => {
      if (server.listening) {
        server.close();
        reject(new Error('Could not open the browser for Google authorization.'));
      }
    });
    browser.unref();
  });
});

await result;
console.log('Google authorization completed; refresh token saved securely.');
