import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:8791';
const wsBase = base.replace(/^http/, 'ws');

function shortInviteFrom(url) {
  const parsed = new URL(url);
  const match = /^\/i\/([A-Za-z0-9_-]{22})$/.exec(parsed.pathname);
  assert.ok(match, 'new invites should use the short /i/<token> path');
  assert.equal(parsed.search, '');
  return match[1];
}

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

  const restored = await request('/api/profile/restore', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recoveryCode: profiles[0].recoveryCode })
  });
  assert.equal(restored.response.status, 200, 'a saved recovery code should restore the same profile');
  assert.equal(restored.body.profile.id, profiles[0].profile.id);

  await Promise.all([owner.connect(), participant.connect(), outsider.connect()]);
  owner.send({ type: 'set-name', name: 'Owner Test' });
  participant.send({ type: 'set-name', name: 'Participant Test' });

  owner.send({ type: 'create-goal', message: 'Meet Friday at 3pm in the main office.', tone: 'professional' });
  const created = await owner.wait(message => message.type === 'goal-created');
  const goalId = created.goal.id;
  assert.match(goalId, /^G[0-9a-f]{32}$/);
  assert.equal(created.shareUrl, null, 'an invite must not exist before the first message is approved');
  assert.equal(created.goal.canInvite, false);
  owner.send({ type: 'rotate-invite', goalId });
  const prematureShare = await owner.wait(message => message.type === 'error' && message.action === 'rotate-invite');
  assert.equal(prematureShare.message, 'Approve the first message before sharing.');
  assert.equal((await fetch(base + '/i/too-short')).status, 404, 'malformed invite routes should not serve the app');
  assert.equal(created.goal.privateNotes[0].text, 'Meet Friday at 3pm in the main office.');

  const assertMeaningPreserved = draft => {
    assert.match(draft, /Friday/i, 'tone rewrite must preserve the date');
    assert.match(draft, /\b(?:3|three)\b/i, 'tone rewrite must preserve the time');
    assert.match(draft, /\b(?:p\.?m\.?|afternoon|evening)\b/i, 'tone rewrite must preserve the time period');
    assert.match(draft, /main office/i, 'tone rewrite must preserve the location');
  };
  const professionalDraft = created.goal.pendingDraft.draft;
  assertMeaningPreserved(professionalDraft);
  const ownerDraftBootstrap = await request('/api/bootstrap', { headers: { authorization: 'Bearer ' + profiles[0].recoveryCode } });
  const ownerDraftThread = ownerDraftBootstrap.body.threads.find(thread => thread.goalId === goalId);
  assert.match(ownerDraftThread.title, /Friday/i, 'the owner should see a useful private-safe draft title');
  assert.equal(ownerDraftThread.displayStatus, 'Ready for approval');
  assert.equal(ownerDraftThread.statusKey, 'approval');
  assert.equal(ownerDraftThread.actionRequired, true);
  assert.doesNotMatch([ownerDraftThread.title, ownerDraftThread.summary, ownerDraftThread.peerLabel, ownerDraftThread.displayStatus].join(' '), /\bA[0-9a-f]{4,64}\b/i, 'presentation fields must not expose profile IDs');

  owner.send({ type: 'redraft', goalId, tone: 'friendly' });
  const friendlyUpdate = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.pendingDraft?.tone === 'friendly');
  const friendlyDraft = friendlyUpdate.goal.pendingDraft.draft;
  assertMeaningPreserved(friendlyDraft);
  assert.notEqual(friendlyDraft.toLowerCase(), professionalDraft.toLowerCase(), 'Friendly must visibly restyle Professional');

  owner.send({ type: 'redraft', goalId, tone: 'direct' });
  const directUpdate = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.pendingDraft?.tone === 'direct');
  const directDraft = directUpdate.goal.pendingDraft.draft;
  assertMeaningPreserved(directDraft);
  assert.notEqual(directDraft.toLowerCase(), friendlyDraft.toLowerCase(), 'Direct must visibly restyle Friendly');

  owner.send({ type: 'redraft', goalId, tone: 'casual' });
  const casualUpdate = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.pendingDraft?.tone === 'casual');
  const casualDraft = casualUpdate.goal.pendingDraft.draft;
  assertMeaningPreserved(casualDraft);
  assert.notEqual(casualDraft.toLowerCase(), directDraft.toLowerCase(), 'Casual must visibly restyle Direct');

  owner.send({ type: 'redraft', goalId, tone: 'friendly' });
  const finalTone = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.pendingDraft?.tone === 'friendly');
  assertMeaningPreserved(finalTone.goal.pendingDraft.draft);
  const inviteReady = owner.wait(message => message.type === 'invite-ready' && message.goalId === goalId);
  const approvedUpdate = owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 1);
  owner.send({ type: 'approve-outbound', goalId });
  const [ownerApproved, ready] = await Promise.all([approvedUpdate, inviteReady]);
  assert.equal(ownerApproved.goal.thread[0].from, profiles[0].profile.id);
  assert.equal(ownerApproved.goal.thread[0].privateOriginal, 'Meet Friday at 3pm in the main office.');
  assert.equal(ownerApproved.goal.canInvite, true);
  const originalInvite = shortInviteFrom(ready.shareUrl);
  assert.equal(ready.shareUrl.includes(goalId), false, 'the share URL must not expose the conversation ID');
  const invitePage = await fetch(base + new URL(ready.shareUrl).pathname);
  assert.equal(invitePage.status, 200, `the short invite route should serve Relay: ${ready.shareUrl}`);
  assert.match(await invitePage.text(), /<title>Relay<\/title>/);

  owner.send({ type: 'rotate-invite', goalId });
  const rotated = await owner.wait(message => message.type === 'invite-rotated' && message.goalId === goalId);
  const invite = shortInviteFrom(rotated.shareUrl);
  outsider.send({ type: 'claim-invite', invite: originalInvite });
  const expiredInvite = await outsider.wait(message => message.type === 'error' && message.action === 'claim-invite');
  assert.equal(expiredInvite.message, 'Invite unavailable.', 'rotating an invite should invalidate its old token');
  participant.send({ type: 'claim-invite', invite: `${goalId}.${invite}` });
  const joined = await participant.wait(message => message.type === 'invite-claimed' && message.goal.id === goalId);
  assert.equal(joined.goal.participants.length, 2);
  assert.equal(joined.goal.privateNotes.length, 0, 'private owner text must not cross profiles');
  assert.equal(joined.goal.thread[0].privateOriginal, null, 'private originals must not cross profiles');
  const joinedBootstrap = await request('/api/bootstrap', { headers: { authorization: 'Bearer ' + profiles[1].recoveryCode } });
  const joinedThread = joinedBootstrap.body.threads.find(thread => thread.goalId === goalId);
  assert.equal(joinedThread.title, ownerApproved.goal.title, 'both participants should receive the stable approved title');
  assert.equal(joinedThread.displayStatus, 'Needs your response');
  assert.equal(joinedThread.actionRequired, true);

  outsider.send({ type: 'claim-invite', invite });
  const denied = await outsider.wait(message => message.type === 'error' && message.action === 'claim-invite');
  assert.equal(denied.message, 'Invite unavailable.');

  assert.ok(owner.messages.some(message => message.type === 'bootstrap' && message.contacts.some(contact => contact.id === profiles[1].profile.id)));
  assert.ok(participant.messages.some(message => message.type === 'bootstrap' && message.contacts.some(contact => contact.id === profiles[0].profile.id)));

  const ownerReply = owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 2);
  const participantReply = participant.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 2);
  const replyAcknowledged = participant.wait(message => message.type === 'reply-sent' && message.goalId === goalId);
  participant.send({ type: 'draft-reply', goalId, text: 'That works for me.', tone: 'direct' });
  const [replied, senderView] = await Promise.all([ownerReply, participantReply, replyAcknowledged]);
  assert.equal(replied.goal.pendingDraft, null, 'replies should auto-send after the first approval');
  assert.equal(replied.goal.tone, 'friendly', 'the first approved tone should remain fixed');
  assert.equal(replied.goal.thread.at(-1).privateOriginal, null, 'reply originals must stay private');
  assert.equal(senderView.goal.thread.at(-1).privateOriginal, 'That works for me.');
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

  participant.send({ type: 'toggle-representative', goalId });
  await participant.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.representativeMode === false);
  participant.send({ type: 'draft-reply', goalId, text: 'send this exact pls' });
  const directReply = await owner.wait(message => message.type === 'goal-updated' && message.goal.id === goalId && message.goal.thread.length === 2);
  assert.equal(directReply.goal.thread.at(-1).text, 'send this exact pls', 'Representative OFF should send the exact reply');

  participant.send({ type: 'remove-conversation', goalId });
  await participant.wait(message => message.type === 'conversation-removed' && message.goalId === goalId);
  const ownerBootstrap = await request('/api/bootstrap', { headers: { authorization: 'Bearer ' + profiles[0].recoveryCode } });
  assert.ok(ownerBootstrap.body.threads.some(thread => thread.goalId === goalId));
  assert.ok(ownerBootstrap.body.contacts.some(contact => contact.id === profiles[1].profile.id), 'contacts should persist with the restored profile');

  const ownerGlobalDeletion = owner.wait(message => message.type === 'conversation-deleted' && message.goalId === goalId);
  const participantGlobalDeletion = participant.wait(message => message.type === 'conversation-deleted' && message.goalId === goalId);
  owner.send({ type: 'delete-conversation-everyone', goalId });
  await Promise.all([ownerGlobalDeletion, participantGlobalDeletion]);

  owner.send({
    type: 'create-goal',
    message: "I'm in a tight spot and need 500 units ASAP.",
    tone: 'professional',
    targetId: profiles[1].profile.id
  });
  const attributionCreated = await owner.wait(message => message.type === 'goal-created' && message.goal.id !== goalId);
  const attributionGoalId = attributionCreated.goal.id;
  const preApprovalPeerBootstrap = await request('/api/bootstrap', { headers: { authorization: 'Bearer ' + profiles[1].recoveryCode } });
  const preApprovalPeerThread = preApprovalPeerBootstrap.body.threads.find(thread => thread.goalId === attributionGoalId);
  assert.equal(preApprovalPeerThread, undefined, 'an unapproved direct draft must not appear in the recipient conversation list');
  owner.send({ type: 'approve-outbound', goalId: attributionGoalId });
  const attributionApproved = await participant.wait(message => message.type === 'goal-updated' && message.goal.id === attributionGoalId && message.goal.thread.length === 1);
  const attributionOwnerView = owner.wait(message => message.type === 'goal-updated' && message.goal.id === attributionGoalId && message.goal.thread.length === 2);
  const attributionSenderView = participant.wait(message => message.type === 'goal-updated' && message.goal.id === attributionGoalId && message.goal.thread.length === 2);
  participant.send({ type: 'draft-reply', goalId: attributionGoalId, text: 'reason why?' });
  const [attributionReply, attributionPrivate] = await Promise.all([attributionOwnerView, attributionSenderView]);
  const clarification = attributionReply.goal.thread.at(-1).text;
  assert.match(clarification, /why|reason|explain/i, 'the reply should ask for the reason');
  assert.doesNotMatch(clarification, /\bI(?:'m| am) in a tight spot|\bI need 500/i, 'the reply must not adopt the other person\'s claim');
  assert.equal(attributionReply.goal.thread.at(-1).privateOriginal, null);
  assert.equal(attributionPrivate.goal.thread.at(-1).privateOriginal, 'reason why?');
  const stableTitleBootstrap = await request('/api/bootstrap', { headers: { authorization: 'Bearer ' + profiles[0].recoveryCode } });
  assert.equal(stableTitleBootstrap.body.threads.find(thread => thread.goalId === attributionGoalId).title, attributionApproved.goal.title, 'later replies must not replace the approved conversation title');
  const boundaryOwnerView = owner.wait(message => message.type === 'goal-updated' && message.goal.id === attributionGoalId && message.goal.thread.length === 3);
  const boundaryPeerView = participant.wait(message => message.type === 'goal-updated' && message.goal.id === attributionGoalId && message.goal.thread.length === 3);
  owner.send({ type: 'draft-reply', goalId: attributionGoalId, text: "I'm not comfortable sharing that. Cancel my request." });
  const [boundarySender, boundaryPeer] = await Promise.all([boundaryOwnerView, boundaryPeerView]);
  const boundary = boundarySender.goal.thread.at(-1).text;
  assert.match(boundary, /prefer not|not comfortable|rather not|don't want|do not want|do not wish|don't wish|can(?:not|'t|’t) (?:share|disclose|provide)|keep .{0,20}private/i, 'the reply should preserve the user\'s boundary');
  assert.match(boundary, /cancel|withdraw/i, 'the reply should preserve the cancellation');
  assert.doesNotMatch(boundary, /agree|happy to|glad to/i, 'the reply must not force agreement or enthusiasm');
  assert.equal(boundarySender.goal.thread.at(-1).privateOriginal, "I'm not comfortable sharing that. Cancel my request.");
  assert.equal(boundaryPeer.goal.thread.at(-1).privateOriginal, null);
  const attributionOwnerDeleted = owner.wait(message => message.type === 'conversation-deleted' && message.goalId === attributionGoalId);
  const attributionParticipantDeleted = participant.wait(message => message.type === 'conversation-deleted' && message.goalId === attributionGoalId);
  owner.send({ type: 'delete-conversation-everyone', goalId: attributionGoalId });
  await Promise.all([attributionOwnerDeleted, attributionParticipantDeleted]);

  owner.send({ type: 'block-contact', contactId: profiles[1].profile.id });
  await owner.wait(message => message.type === 'bootstrap' && message.blocks.some(block => block.id === profiles[1].profile.id) && !message.contacts.some(contact => contact.id === profiles[1].profile.id));
  participant.send({ type: 'create-goal', message: 'This direct conversation should be blocked.', targetId: profiles[0].profile.id });
  const blockedDirect = await participant.wait(message => message.type === 'error' && message.action === 'create-goal');
  assert.equal(blockedDirect.message, 'Contact is unavailable.');
  owner.send({ type: 'unblock-contact', contactId: profiles[1].profile.id });
  await owner.wait(message => message.type === 'bootstrap' && !message.blocks.some(block => block.id === profiles[1].profile.id));

  owner.send({ type: 'create-goal', message: 'Concurrency check.', tone: 'direct' });
  const raceCreated = await owner.wait(message => message.type === 'goal-created' && message.goal.id !== goalId);
  assert.equal(raceCreated.shareUrl, null);
  const raceReady = owner.wait(message => message.type === 'invite-ready' && message.goalId === raceCreated.goal.id);
  owner.send({ type: 'approve-outbound', goalId: raceCreated.goal.id });
  const raceInvite = shortInviteFrom((await raceReady).shareUrl);
  const participantRace = participant.wait(message => message.type === 'invite-claimed' || (message.type === 'error' && message.action === 'claim-invite'));
  const outsiderRace = outsider.wait(message => message.type === 'invite-claimed' || (message.type === 'error' && message.action === 'claim-invite'));
  participant.send({ type: 'claim-invite', invite: raceInvite });
  outsider.send({ type: 'claim-invite', invite: raceInvite });
  const [participantOutcome, outsiderOutcome] = await Promise.all([participantRace, outsiderRace]);
  assert.equal([participantOutcome, outsiderOutcome].filter(message => message.type === 'invite-claimed').length, 1);
  assert.equal([participantOutcome, outsiderOutcome].filter(message => message.type === 'error').length, 1);
  owner.send({ type: 'delete-conversation-everyone', goalId: raceCreated.goal.id });
  await owner.wait(message => message.type === 'conversation-deleted' && message.goalId === raceCreated.goal.id);

  await new Promise(resolve => process.stdout.write('E2E passed: recovery, four tones, speaker attribution, privacy, short and legacy invite locks, rotation, persistent contacts, blocking, deletion, results, Representative modes, and conversation removal.\n', resolve));
} finally {
  owner.close();
  participant.close();
  outsider.close();
}

// Node's built-in WebSocket keeps the close handshake alive longer than the test needs.
process.exit(0);
