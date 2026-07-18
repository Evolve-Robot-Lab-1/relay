import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:8791';
const wsBase = base.replace(/^http/, 'ws');

async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function createProfile() {
  const { response, body } = await request('/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 201);
  assert.match(body.profile.id, /^A[0-9a-f]{32}$/);
  assert.match(body.recoveryCode, /^RLY1\./);
  return body;
}

class Client {
  constructor(profile) {
    this.profile = profile;
    this.messages = [];
    this.waiters = [];
  }

  async connect() {
    this.socket = new WebSocket(wsBase + '/ws');
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      this.messages.push(message);
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message)) {
          clearTimeout(waiter.timer);
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    });
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.send({ type: 'init', recoveryCode: this.profile.recoveryCode });
    await this.wait(message => message.type === 'welcome');
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  wait(predicate, timeoutMs = 45_000) {
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(new Error('Timed out waiting for WebSocket event. Recent: ' + JSON.stringify(this.messages.slice(-5))));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  close() {
    this.socket?.close();
  }
}

const profiles = await Promise.all([createProfile(), createProfile(), createProfile()]);
const [owner, participant, outsider] = profiles.map(profile => new Client(profile));

try {
  const unauthenticated = await request('/api/bootstrap');
  assert.equal(unauthenticated.response.status, 401);

  await Promise.all([owner.connect(), participant.connect(), outsider.connect()]);
  owner.send({ type: 'set-name', name: 'Owner Test' });
  participant.send({ type: 'set-name', name: 'Participant Test' });

  owner.send({ type: 'create-goal', message: 'Meet Friday at 3pm in the main office.', tone: 'professional' });
  const created = await owner.wait(message => message.type === 'goal-created');
  const goalId = created.goal.id;
  assert.match(goalId, /^G[0-9a-f]{32}$/);
  assert.ok(created.shareUrl.includes('?invite='));
  assert.equal(created.goal.privateNotes[0].text, 'Meet Friday at 3pm in the main office.');

  owner.send({ type: 'redraft', goalId, tone: 'friendly' });
  await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.pendingDraft?.tone === 'friendly');
  owner.send({ type: 'approve-outbound', goalId });
  const ownerApproved = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 1);
  assert.equal(ownerApproved.goal.thread[0].from, profiles[0].profile.id);

  const invite = new URL(created.shareUrl).searchParams.get('invite');
  participant.send({ type: 'claim-invite', invite });
  const joined = await participant.wait(message => message.type === 'invite-claimed' && message.goal.id === goalId);
  assert.equal(joined.goal.participants.length, 2);
  assert.equal(joined.goal.privateNotes.length, 0, 'private owner text must not cross profiles');

  outsider.send({ type: 'claim-invite', invite });
  const denied = await outsider.wait(message => message.type === 'error' && message.action === 'claim-invite');
  assert.equal(denied.message, 'Invite unavailable.');

  assert.ok(owner.messages.some(message => message.type === 'bootstrap' && message.contacts.some(contact => contact.id === profiles[1].profile.id)));
  assert.ok(participant.messages.some(message => message.type === 'bootstrap' && message.contacts.some(contact => contact.id === profiles[0].profile.id)));

  participant.send({ type: 'draft-reply', goalId, text: 'That works for me.', tone: 'friendly' });
  const replied = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 2);
  assert.equal(replied.goal.pendingDraft, null, 'replies should auto-send after the first approval');
  assert.equal(replied.goal.tone, 'friendly', 'the first approved tone should remain fixed');
  const replyId = replied.goal.thread.find(message => message.from === profiles[1].profile.id).id;

  const ownerDeletion = owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 1);
  const senderDeletion = participant.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 1);
  participant.send({ type: 'delete-message', goalId, messageId: replyId });
  const [deletedForOwner, deletedForSender] = await Promise.all([ownerDeletion, senderDeletion]);
  assert.equal(deletedForOwner.goal.thread.length, deletedForSender.goal.thread.length);

  if (deletedForOwner.goal.result.requiresConfirmation) {
    const version = deletedForOwner.goal.result.version;
    owner.send({ type: 'confirm-result', goalId, version });
    await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.result.confirmations[profiles[0].profile.id] === version);
    participant.send({ type: 'confirm-result', goalId, version });
    const confirmed = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.status === 'resolved');
    assert.ok(confirmed.goal.result.lockedAt);
  } else {
    owner.send({ type: 'mark-resolved', goalId });
    await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.status === 'resolved');
  }

  owner.send({ type: 'continue-conversation', goalId });
  await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.status === 'active');

  participant.send({ type: 'remove-conversation', goalId });
  await participant.wait(message => message.type === 'conversation-removed' && message.goalId === goalId);
  const ownerBootstrap = await request('/api/bootstrap', { headers: { authorization: 'Bearer ' + profiles[0].recoveryCode } });
  assert.ok(ownerBootstrap.body.threads.some(thread => thread.goalId === goalId));

  const ownerGlobalDeletion = owner.wait(message => message.type === 'conversation-deleted' && message.goalId === goalId);
  const participantGlobalDeletion = participant.wait(message => message.type === 'conversation-deleted' && message.goalId === goalId);
  owner.send({ type: 'delete-conversation-everyone', goalId });
  await Promise.all([ownerGlobalDeletion, participantGlobalDeletion]);

  owner.send({ type: 'create-goal', message: 'Concurrency check.', tone: 'direct' });
  const raceCreated = await owner.wait(message => message.type === 'goal-created' && message.goal.id !== goalId);
  const raceInvite = new URL(raceCreated.shareUrl).searchParams.get('invite');
  const participantRace = participant.wait(message => message.type === 'invite-claimed' || (message.type === 'error' && message.action === 'claim-invite'));
  const outsiderRace = outsider.wait(message => message.type === 'invite-claimed' || (message.type === 'error' && message.action === 'claim-invite'));
  participant.send({ type: 'claim-invite', invite: raceInvite });
  outsider.send({ type: 'claim-invite', invite: raceInvite });
  const [participantOutcome, outsiderOutcome] = await Promise.all([participantRace, outsiderRace]);
  assert.equal([participantOutcome, outsiderOutcome].filter(message => message.type === 'invite-claimed').length, 1);
  assert.equal([participantOutcome, outsiderOutcome].filter(message => message.type === 'error').length, 1);
  owner.send({ type: 'delete-conversation-everyone', goalId: raceCreated.goal.id });
  await owner.wait(message => message.type === 'conversation-deleted' && message.goalId === raceCreated.goal.id);

  console.log('E2E passed: auth, privacy, atomic invite lock, contacts, real-time deletion, result handling, and conversation removal.');
} finally {
  owner.close();
  participant.close();
  outsider.close();
}

// Node's built-in WebSocket keeps the close handshake alive longer than the test needs.
process.exit(0);
