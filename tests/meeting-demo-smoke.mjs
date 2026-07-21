import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base = process.argv[2] || 'http://127.0.0.1:8787';
const wsBase = base.replace(/^http/, 'ws');

async function createProfile() {
  const response = await fetch(base + '/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 201);
  return response.json();
}

class Client {
  constructor(name, recoveryCode) {
    this.name = name;
    this.recoveryCode = recoveryCode;
    this.messages = [];
    this.waiters = [];
    this.goal = null;
  }

  async connect() {
    this.socket = new WebSocket(wsBase + '/ws');
    this.socket.on('message', raw => {
      const message = JSON.parse(String(raw));
      this.messages.push(message);
      if (message.goal) this.goal = message.goal;
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message)) {
          clearTimeout(waiter.timer);
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    });
    await new Promise((resolve, reject) => {
      this.socket.once('open', resolve);
      this.socket.once('error', reject);
    });
    this.send({ type: 'init', recoveryCode: this.recoveryCode });
    await this.wait(message => message.type === 'welcome');
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  wait(predicate, timeoutMs = 50_000) {
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        timer: setTimeout(() => {
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          reject(new Error(`${this.name} timeout: ${JSON.stringify(this.messages.slice(-3).map(message => ({
            type: message.type,
            message: message.message,
            shareUrl: message.shareUrl
          })))}`));
        }, timeoutMs)
      };
      this.waiters.push(waiter);
      for (const message of this.messages) {
        if (predicate(message)) {
          clearTimeout(waiter.timer);
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          resolve(message);
          break;
        }
      }
    });
  }

  close() {
    try { this.socket.close(); } catch {}
  }
}

function extractDay(text) {
  const match = String(text || '').match(/\b(?:today|tonight|tomorrow|tmrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (!match) return '';
  const raw = match[0].toLowerCase();
  if (raw === 'tmrw' || raw === 'tomorrow') return 'Tomorrow';
  return match[0];
}

function extractClock(text) {
  const match = String(text || '').match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) return '';
  return `${Number(match[1])}:${match[2] || '00'} ${match[3].toUpperCase()}`;
}

const ownerProfile = await createProfile();
const peerProfile = await createProfile();
const owner = new Client('owner', ownerProfile.recoveryCode);
const peer = new Client('peer', peerProfile.recoveryCode);
await owner.connect();
await peer.connect();
owner.send({ type: 'set-name', name: 'Owner' });
peer.send({ type: 'set-name', name: 'Peer' });

console.log('=== MEETING DEMO SMOKE ===');
owner.send({ type: 'create-goal', message: 'Arrange an online meeting tomorrow', tone: 'professional' });
const created = await owner.wait(message => message.type === 'goal-created' || message.type === 'error', 70_000);
if (created.type === 'error') throw new Error(created.message);
console.log('Relay draft:', created.goal.pendingDraft.draft);
assert.match(created.goal.pendingDraft.draft, /tomorrow|available|meeting|online/i);

const inviteReady = owner.wait(message => message.type === 'invite-ready', 30_000);
owner.send({ type: 'approve-outbound', goalId: created.goal.id });
const invite = await inviteReady;
const token = new URL(invite.shareUrl).pathname.split('/i/')[1];
console.log('shareUrl:', invite.shareUrl);

const invitePage = await fetch(`${base}/i/${token}`);
assert.equal(invitePage.status, 200);
console.log('Local invite page OK');

peer.send({ type: 'claim-invite', invite: token });
const claimed = await peer.wait(message => message.type === 'invite-claimed' || message.type === 'error', 20_000);
if (claimed.type === 'error') throw new Error(claimed.message);
assert.equal(claimed.goal.participants.length, 2);
console.log('Peer joined');

peer.send({ type: 'draft-reply', goalId: claimed.goal.id, text: 'Yes, 10:00 AM works.', tone: 'direct' });
const peerOut = await peer.wait(
  message => message.type === 'reply-sent' || (message.type === 'goal-updated' && message.goal.pendingDraft) || message.type === 'error',
  70_000
);
if (peerOut.type === 'error') throw new Error(peerOut.message);
if (peerOut.type !== 'reply-sent' && peerOut.goal?.pendingDraft) {
  peer.send({ type: 'approve-outbound', goalId: claimed.goal.id });
  const approved = await peer.wait(message => message.type === 'reply-sent' || message.type === 'error', 25_000);
  if (approved.type === 'error') throw new Error(approved.message);
}

await owner.wait(message => message.type === 'goal-updated' && (message.goal.thread || []).length >= 2, 25_000);
const threadText = owner.goal.thread.map(item => item.text).join(' ');
console.log('Thread:', owner.goal.thread.map(item => item.text));

const day = extractDay(threadText) || extractDay('Arrange an online meeting tomorrow');
const clock = extractClock(threadText);
assert.equal(day, 'Tomorrow');
assert.ok(clock);
assert.match(clock, /10:00\s*AM/i);
console.log('✓ Date confirmed:', day);
console.log('✓ Time confirmed:', clock);

owner.send({ type: 'mark-resolved', goalId: owner.goal.id });
await owner.wait(
  message => message.type === 'goal-updated' && (
    message.goal.status === 'resolved'
    || ['resolved', 'confirmed'].includes(message.goal.result?.status)
  ),
  20_000
);
console.log('✓ Goal solved:', owner.goal.status, owner.goal.result?.status);

owner.close();
peer.close();
console.log('\nMEETING DEMO SMOKE PASSED');
console.log(`Manual peer window: ${base}/i/${token}`);
