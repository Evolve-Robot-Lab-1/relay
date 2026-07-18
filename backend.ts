const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const DELETED_VALUE = '__relay_deleted_v1__';
const PROFILE_PREFIX = 'RLY1';
const TONES = new Set(['professional', 'friendly', 'direct', 'casual']);
const FACT_KEYS = ['date', 'time', 'location'];

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}

function randomHex(bytes = 16) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
}

function randomSecret(bytes = 24) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  data.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function cleanText(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanName(value: unknown) {
  return cleanText(value, 48).replace(/[\u0000-\u001f\u007f]/g, '');
}

function validProfileId(value: unknown) {
  return typeof value === 'string' && /^A[0-9a-f]{4,64}$/i.test(value);
}

function validGoalId(value: unknown) {
  return typeof value === 'string' && /^G[0-9a-f]{6,64}$/i.test(value);
}

function parseRecovery(value: unknown) {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split('.');
  if (parts.length !== 3 || parts[0] !== PROFILE_PREFIX || !validProfileId(parts[1])) return null;
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(parts[2])) return null;
  return { profileId: parts[1], secret: parts[2] };
}

function parseStored(value: unknown) {
  if (typeof value !== 'string') return value;
  if (value === DELETED_VALUE) return null;
  try { return JSON.parse(value); } catch { return value; }
}

function factsFrom(value: any) {
  const facts: Record<string, string | null> = { date: null, time: null, location: null };
  for (const key of FACT_KEYS) {
    const item = value?.[key];
    const raw = typeof item === 'object' && item ? item.value : item;
    facts[key] = cleanText(raw, 120) || null;
  }
  return facts;
}

function mergeFacts(current: any, proposed: any) {
  return { ...factsFrom(current), ...Object.fromEntries(FACT_KEYS.map(key => [key, factsFrom(proposed)[key] || factsFrom(current)[key]])) };
}

function statusFromLegacy(status: string, participants: string[]) {
  if (status === 'agreed') return 'resolved';
  if (status === 'completed' || status === 'cancelled') return 'closed';
  if (status === 'drafting') return 'draft';
  return participants.length === 2 ? 'active' : 'waiting';
}

function resultFromAgreement(agreement: any) {
  const facts = factsFrom(agreement);
  const requiresConfirmation = FACT_KEYS.some(key => Boolean(facts[key]));
  const confirmed = Boolean(agreement?.lockedAt || agreement?.status === 'agreed');
  return {
    version: Number(agreement?.version || 0),
    summary: cleanText(agreement?.summary, 500),
    type: requiresConfirmation ? 'commitment' : 'progress',
    requiresConfirmation,
    ...facts,
    status: confirmed ? 'confirmed' : requiresConfirmation && agreement?.status === 'proposed' ? 'confirming' : 'open',
    confirmations: agreement?.confirmations || {},
    lockedAt: confirmed ? (agreement?.lockedAt || Date.now()) : null
  };
}

function publicProfile(profile: any) {
  return { id: profile.id, name: profile.name || '', createdAt: profile.createdAt };
}

export class RelayStore {
  state: any;
  storage: any;
  env: any;
  sessions: Map<any, { profileId: string | null; origin: string }>;
  sockets: Map<string, Set<any>>;
  rates: Map<string, number[]>;
  queues: Map<string, Promise<unknown>>;

  constructor(state: any, env: any) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
    this.sessions = new Map();
    this.sockets = new Map();
    this.rates = new Map();
    this.queues = new Map();
  }

  async read(key: string) {
    const stored = await this.storage.get(key);
    if (stored !== undefined) return parseStored(stored);
    if (!this.env.AGENTS_KV) return null;
    const legacy = await this.env.AGENTS_KV.get(key);
    return legacy === null ? null : parseStored(legacy);
  }

  async write(key: string, value: unknown) {
    await this.storage.put(key, value);
  }

  async tombstone(key: string) {
    await this.storage.put(key, DELETED_VALUE);
  }

  allow(bucket: string, limit: number, windowMs: number) {
    const now = Date.now();
    const recent = (this.rates.get(bucket) || []).filter(time => now - time < windowMs);
    if (recent.length >= limit) return false;
    recent.push(now);
    this.rates.set(bucket, recent);
    return true;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'relay', release: 'outcome-v1.1', storage: 'durable-object', time: new Date().toISOString() });
    }
    if (url.pathname === '/api/profile' && request.method === 'POST') return this.createProfile(request);
    if (url.pathname === '/api/profile/restore' && request.method === 'POST') return this.restoreProfile(request);
    if (url.pathname === '/api/bootstrap' && request.method === 'GET') {
      const profile = await this.authenticateRequest(request);
      if (!profile) return json({ error: 'Invalid recovery code.' }, 401);
      return json(await this.bootstrap(profile.id));
    }
    if (url.pathname === '/ws' && request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return this.openSocket(request);
    }
    return json({ error: 'Not found.' }, 404);
  }

  async createProfile(request: Request) {
    if (!this.allow('profile-create', 30, 60_000)) return json({ error: 'Please wait before creating another profile.' }, 429);
    let body: any = {};
    try { body = await request.json(); } catch {}
    const requestedLegacy = validProfileId(body.legacyId) ? String(body.legacyId) : null;
    const profileId = requestedLegacy || `A${randomHex(16)}`;
    const secret = randomSecret();
    const secretHash = await sha256(secret);
    const now = Date.now();
    let outcome: 'created' | 'claimed' | 'conflict' = 'created';

    await this.storage.transaction(async (tx: any) => {
      const existing = parseStored(await tx.get(`profile:${profileId}`));
      const claimed = requestedLegacy ? await tx.get(`legacy-claimed:${profileId}`) : null;
      if (existing || claimed) {
        outcome = 'conflict';
        return;
      }
      const legacyName = requestedLegacy ? cleanName(parseStored(await tx.get(`name:${profileId}`))) : '';
      await tx.put(`profile:${profileId}`, { id: profileId, secretHash, name: cleanName(body.name) || legacyName, createdAt: now, updatedAt: now });
      if (requestedLegacy) {
        await tx.put(`legacy-claimed:${profileId}`, now);
        outcome = 'claimed';
      }
    });

    if (outcome === 'conflict') return json({ error: 'That legacy profile has already been protected. Restore it with its recovery code.' }, 409);
    const recoveryCode = `${PROFILE_PREFIX}.${profileId}.${secret}`;
    return json({ profile: { id: profileId, name: cleanName(body.name), createdAt: now }, recoveryCode, legacyClaimed: outcome === 'claimed' }, 201);
  }

  async restoreProfile(request: Request) {
    let body: any = {};
    try { body = await request.json(); } catch {}
    const profile = await this.authenticateRecovery(body.recoveryCode);
    if (!profile) return json({ error: 'Recovery code not recognized.' }, 401);
    return json({ profile: publicProfile(profile) });
  }

  async authenticateRequest(request: Request) {
    const header = request.headers.get('authorization') || '';
    return this.authenticateRecovery(header.startsWith('Bearer ') ? header.slice(7) : '');
  }

  async authenticateRecovery(recoveryCode: unknown) {
    const parsed = parseRecovery(recoveryCode);
    if (!parsed) return null;
    const profile = await this.read(`profile:${parsed.profileId}`);
    if (!profile?.secretHash) return null;
    const hash = await sha256(parsed.secret);
    return hash === profile.secretHash ? profile : null;
  }

  openSocket(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as any[];
    server.accept();
    const origin = request.headers.get('x-relay-origin') || 'https://agent-network.salesagent.workers.dev';
    this.sessions.set(server, { profileId: null, origin });
    server.addEventListener('message', (event: MessageEvent) => {
      this.state.waitUntil(this.enqueueSocketMessage(server, event.data));
    });
    const close = () => this.closeSocket(server);
    server.addEventListener('close', close);
    server.addEventListener('error', close);
    return new Response(null, { status: 101, webSocket: client } as any);
  }

  closeSocket(socket: any) {
    const session = this.sessions.get(socket);
    if (session?.profileId) {
      const set = this.sockets.get(session.profileId);
      set?.delete(socket);
      if (set?.size === 0) this.sockets.delete(session.profileId);
    }
    this.sessions.delete(socket);
  }

  send(socket: any, message: unknown) {
    try { socket.send(JSON.stringify(message)); } catch { this.closeSocket(socket); }
  }

  sendTo(profileId: string, message: unknown) {
    for (const socket of this.sockets.get(profileId) || []) this.send(socket, message);
  }

  enqueueSocketMessage(socket: any, raw: unknown) {
    let parsed: any = {};
    try { parsed = JSON.parse(String(raw)); } catch {}
    const session = this.sessions.get(socket);
    const inviteGoal = parsed.type === 'claim-invite' && typeof parsed.invite === 'string' ? parsed.invite.split('.')[0] : '';
    const queueKey = validGoalId(parsed.goalId) ? `goal:${parsed.goalId}` : validGoalId(inviteGoal) ? `goal:${inviteGoal}` : `profile:${session?.profileId || randomHex(6)}`;
    const previous = this.queues.get(queueKey) || Promise.resolve();
    const next = previous.catch(() => {}).then(() => this.handleSocketMessage(socket, raw));
    this.queues.set(queueKey, next);
    return next.finally(() => {
      if (this.queues.get(queueKey) === next) this.queues.delete(queueKey);
    });
  }

  async handleSocketMessage(socket: any, raw: unknown) {
    let message: any;
    try { message = JSON.parse(String(raw)); } catch { return this.send(socket, { type: 'error', message: 'Invalid message.' }); }
    const session = this.sessions.get(socket);
    if (!session) return;

    if (message.type === 'init') {
      const profile = await this.authenticateRecovery(message.recoveryCode);
      if (!profile) return this.send(socket, { type: 'auth-error', message: 'Profile recovery is required.' });
      session.profileId = profile.id;
      if (!this.sockets.has(profile.id)) this.sockets.set(profile.id, new Set());
      this.sockets.get(profile.id)!.add(socket);
      return this.send(socket, { type: 'welcome', ...(await this.bootstrap(profile.id)) });
    }

    const profileId = session.profileId;
    if (!profileId) return this.send(socket, { type: 'auth-error', message: 'Authenticate first.' });

    try {
      switch (message.type) {
        case 'set-name': return await this.setName(profileId, message.name);
        case 'create-goal': return await this.createGoal(profileId, message, session.origin);
        case 'claim-invite': return await this.claimInvite(profileId, message.invite, session.origin, socket);
        case 'open-goal': return await this.openGoal(profileId, message.goalId, socket);
        case 'draft-reply': return await this.draftReply(profileId, message);
        case 'approve-outbound': return await this.approveDraft(profileId, message.goalId);
        case 'reject-outbound': return await this.rejectDraft(profileId, message.goalId);
        case 'redraft': return await this.redraft(profileId, message);
        case 'delete-message': return await this.deleteMessage(profileId, message);
        case 'remove-conversation': return await this.removeConversation(profileId, message.goalId);
        case 'delete-conversation-everyone': return await this.deleteConversationEveryone(profileId, message.goalId);
        case 'clear-conversations': return await this.clearConversations(profileId);
        case 'rotate-invite': return await this.rotateInvite(profileId, message.goalId, session.origin, socket);
        case 'remove-contact': return await this.removeContact(profileId, message.contactId);
        case 'block-contact': return await this.blockContact(profileId, message.contactId);
        case 'unblock-contact': return await this.unblockContact(profileId, message.contactId);
        case 'confirm-result': return await this.confirmResult(profileId, message.goalId, message.version);
        case 'mark-resolved': return await this.markResolved(profileId, message.goalId);
        case 'close-conversation': return await this.closeConversation(profileId, message.goalId);
        case 'continue-conversation': return await this.continueConversation(profileId, message.goalId);
        default: return this.send(socket, { type: 'error', message: 'Unsupported action.' });
      }
    } catch (error: any) {
      this.send(socket, { type: 'error', action: message.type, message: error?.message || 'The action could not be completed.' });
    }
  }

  async setName(profileId: string, value: unknown) {
    const name = cleanName(value);
    if (!name) throw new Error('Enter a display name.');
    const profile = await this.read(`profile:${profileId}`);
    profile.name = name;
    profile.updatedAt = Date.now();
    await this.write(`profile:${profileId}`, profile);
    await this.write(`name:${profileId}`, name);
    await this.refreshContactName(profileId, name);
    await this.pushBootstrap(profileId);
  }

  async refreshContactName(profileId: string, name: string) {
    const threads = await this.threadEntries(profileId);
    const peers = new Set<string>();
    for (const entry of threads) {
      const goal = await this.getGoal(entry.goalId);
      goal?.participants?.forEach((id: string) => { if (id !== profileId) peers.add(id); });
    }
    for (const peerId of peers) {
      const contacts = await this.contacts(peerId);
      if (contacts[profileId]) {
        contacts[profileId].name = name;
        contacts[profileId].updatedAt = Date.now();
        await this.write(`contacts:${peerId}`, contacts);
        await this.pushBootstrap(peerId);
      }
    }
  }

  async createGoal(profileId: string, message: any, origin: string) {
    if (!this.allow(`create:${profileId}`, 12, 60_000)) throw new Error('Please wait before starting another conversation.');
    const raw = cleanText(message.message);
    if (!raw) throw new Error('Describe the conversation you want help with.');
    const tone = TONES.has(message.tone) ? message.tone : 'professional';
    const targetId = validProfileId(message.targetId) && message.targetId !== profileId ? message.targetId : null;
    if (targetId) {
      const target = await this.read(`profile:${targetId}`);
      if (!target) throw new Error('Contact is unavailable.');
      if (await this.isBlockedEitherWay(profileId, targetId)) throw new Error('Contact is unavailable.');
      const contacts = await this.contacts(profileId);
      if (!contacts[targetId]) throw new Error('Choose an existing contact.');
    }

    const drafted = await this.makeDraft(profileId, targetId, raw, tone, null);
    const now = Date.now();
    const goalId = `G${randomHex(16)}`;
    const inviteSecret = targetId ? null : randomSecret();
    const goal: any = {
      schema: 2,
      id: goalId,
      creatorId: profileId,
      participants: targetId ? [profileId, targetId] : [profileId],
      inviteHash: inviteSecret ? await sha256(inviteSecret) : null,
      inviteClaimedAt: targetId ? now : null,
      status: 'draft',
      tone,
      thread: [],
      privateNotes: [{ id: `N${randomHex(12)}`, ownerId: profileId, text: raw, createdAt: now }],
      pendingDraft: { ownerId: profileId, draft: drafted.draft, noteId: null, facts: drafted.facts, resultSummary: drafted.resultSummary, resultType: drafted.resultType, requiresConfirmation: drafted.requiresConfirmation, tone, createdAt: now },
      result: { version: 0, summary: '', type: 'progress', requiresConfirmation: false, date: null, time: null, location: null, status: 'open', confirmations: {}, lockedAt: null },
      removedBy: [],
      createdAt: now,
      updatedAt: now
    };
    goal.pendingDraft.noteId = goal.privateNotes[0].id;
    await this.write(`goal:${goalId}`, goal);
    for (const id of goal.participants) await this.addThread(id, goalId);
    if (targetId) await this.ensureContacts(profileId, targetId);
    await this.broadcastGoal(goal);
    const shareUrl = inviteSecret ? `${origin}/?invite=${encodeURIComponent(`${goalId}.${inviteSecret}`)}` : null;
    this.sendTo(profileId, { type: 'goal-created', goal: await this.viewGoal(goal, profileId), shareUrl });
  }

  async claimInvite(profileId: string, token: unknown, origin: string, socket: any) {
    const value = cleanText(token, 300);
    const dot = value.indexOf('.');
    const goalId = dot > 0 ? value.slice(0, dot) : '';
    const secret = dot > 0 ? value.slice(dot + 1) : '';
    if (!validGoalId(goalId) || !/^[A-Za-z0-9_-]{24,128}$/.test(secret)) throw new Error('Invite unavailable.');
    const goal = await this.getGoal(goalId);
    if (!goal || goal.deletedAt) throw new Error('Invite unavailable.');
    if (goal.participants.includes(profileId)) return this.send(socket, { type: 'goal-loaded', goal: await this.viewGoal(goal, profileId) });
    if (goal.participants.length !== 1 || !goal.inviteHash || await sha256(secret) !== goal.inviteHash) throw new Error('Invite unavailable.');
    if (await this.isBlockedEitherWay(goal.creatorId, profileId)) throw new Error('Invite unavailable.');

    goal.participants.push(profileId);
    goal.inviteHash = null;
    goal.inviteClaimedAt = Date.now();
    if (goal.status === 'waiting') goal.status = goal.result?.status === 'confirming' ? 'confirming' : 'active';
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.addThread(profileId, goal.id);
    await this.ensureContacts(goal.creatorId, profileId);
    await this.broadcastGoal(goal);
    this.send(socket, { type: 'invite-claimed', goal: await this.viewGoal(goal, profileId), origin });
  }

  async openGoal(profileId: string, goalId: unknown, socket: any) {
    if (!validGoalId(goalId)) throw new Error('Conversation not found.');
    const goal = await this.getGoal(String(goalId));
    if (!goal || goal.deletedAt || !goal.participants.includes(profileId)) throw new Error('Conversation not found.');
    await this.addThread(profileId, goal.id);
    this.send(socket, { type: 'goal-loaded', goal: await this.viewGoal(goal, profileId) });
  }

  async draftReply(profileId: string, message: any) {
    const goal = await this.authorizedGoal(profileId, message.goalId);
    if (goal.status === 'resolved' || goal.status === 'closed') throw new Error('Continue this conversation before sending another message.');
    if (goal.pendingDraft) throw new Error('Review the current draft first.');
    const raw = cleanText(message.text);
    if (!raw) throw new Error('Enter a message.');
    const tone = goal.tone || 'professional';
    const peerId = goal.participants.find((id: string) => id !== profileId) || null;
    const drafted = await this.makeDraft(profileId, peerId, raw, tone, goal);
    const note = { id: `N${randomHex(12)}`, ownerId: profileId, text: raw, createdAt: Date.now() };
    goal.privateNotes.push(note);
    goal.thread.push({ id: `M${randomHex(16)}`, from: profileId, text: drafted.draft, createdAt: Date.now(), deletedAt: null });
    this.updateResultFromDraft(goal, drafted);
    goal.status = goal.participants.length === 1 ? 'waiting' : goal.result.status === 'confirming' ? 'confirming' : 'active';
    goal.updatedAt = Date.now();
    goal.removedBy = [];
    await this.write(`goal:${goal.id}`, goal);
    for (const id of goal.participants) await this.addThread(id, goal.id);
    await this.broadcastGoal(goal);
  }

  async approveDraft(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    const pending = goal.pendingDraft;
    if (!pending || pending.ownerId !== profileId) throw new Error('No draft is waiting for your approval.');
    const message = { id: `M${randomHex(16)}`, from: profileId, text: pending.draft, createdAt: Date.now(), deletedAt: null };
    goal.thread.push(message);
    goal.pendingDraft = null;
    this.updateResultFromDraft(goal, pending);
    goal.status = goal.participants.length === 1 ? 'waiting' : goal.result.status === 'confirming' ? 'confirming' : 'active';
    goal.updatedAt = Date.now();
    goal.removedBy = [];
    await this.write(`goal:${goal.id}`, goal);
    for (const id of goal.participants) await this.addThread(id, goal.id);
    await this.broadcastGoal(goal);
  }

  async rejectDraft(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    if (!goal.pendingDraft || goal.pendingDraft.ownerId !== profileId) throw new Error('No draft is waiting for your review.');
    goal.pendingDraft = null;
    goal.status = goal.thread.length ? (goal.participants.length === 2 ? 'active' : 'waiting') : 'draft';
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  async redraft(profileId: string, message: any) {
    const goal = await this.authorizedGoal(profileId, message.goalId);
    const pending = goal.pendingDraft;
    if (!pending || pending.ownerId !== profileId) throw new Error('No draft is waiting for your review.');
    const note = goal.privateNotes.find((item: any) => item.id === pending.noteId && item.ownerId === profileId);
    if (!note) throw new Error('Original note not found.');
    const tone = TONES.has(message.tone) ? message.tone : goal.tone || 'professional';
    const peerId = goal.participants.find((id: string) => id !== profileId) || null;
    const drafted = await this.makeDraft(profileId, peerId, note.text, tone, goal);
    goal.pendingDraft = { ...pending, draft: drafted.draft, facts: drafted.facts, resultSummary: drafted.resultSummary, resultType: drafted.resultType, requiresConfirmation: drafted.requiresConfirmation, tone, createdAt: Date.now() };
    goal.tone = tone;
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  updateResultFromDraft(goal: any, pending: any) {
    const previous = goal.result || {};
    const mergedFacts = mergeFacts(previous, pending.facts);
    const requiresConfirmation = pending.requiresConfirmation === true;
    goal.result = {
      version: Number(previous.version || 0) + 1,
      summary: cleanText(pending.resultSummary, 500) || cleanText(pending.draft, 500),
      type: cleanText(pending.resultType, 40) || 'progress',
      requiresConfirmation,
      ...mergedFacts,
      status: requiresConfirmation ? 'confirming' : 'open',
      confirmations: {},
      lockedAt: null
    };
  }

  async deleteMessage(profileId: string, payload: any) {
    const goal = await this.authorizedGoal(profileId, payload.goalId);
    const message = goal.thread.find((item: any) => item.id === payload.messageId);
    if (!message || message.deletedAt) throw new Error('Message not found.');
    if (message.from !== profileId) throw new Error('You can only delete your own messages.');
    message.deletedAt = Date.now();
    if (!['confirmed', 'resolved', 'closed'].includes(goal.result.status)) {
      const last = [...goal.thread].reverse().find((item: any) => !item.deletedAt);
      goal.result.version = Number(goal.result.version || 0) + 1;
      goal.result.summary = last?.text || '';
      goal.result.status = goal.result.requiresConfirmation && last ? 'confirming' : 'open';
      goal.result.confirmations = {};
      goal.status = last && goal.result.requiresConfirmation ? 'confirming' : (goal.participants.length === 2 ? 'active' : 'waiting');
    }
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  async removeConversation(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    if (!goal.removedBy.includes(profileId)) goal.removedBy.push(profileId);
    await this.removeThread(profileId, goal.id);
    await this.write(`goal:${goal.id}`, goal);
    this.sendTo(profileId, { type: 'conversation-removed', goalId: goal.id });
    await this.pushBootstrap(profileId);
  }

  async deleteConversationEveryone(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    if (goal.creatorId !== profileId) throw new Error('Only the conversation creator can delete it for everyone.');
    goal.deletedAt = Date.now();
    goal.inviteHash = null;
    await this.write(`goal:${goal.id}`, goal);
    for (const id of goal.participants) {
      await this.removeThread(id, goal.id);
      this.sendTo(id, { type: 'conversation-deleted', goalId: goal.id });
      await this.pushBootstrap(id);
    }
  }

  async clearConversations(profileId: string) {
    const entries = await this.threadEntries(profileId);
    for (const entry of entries) {
      const goal = await this.getGoal(entry.goalId);
      if (goal && !goal.removedBy.includes(profileId)) {
        goal.removedBy.push(profileId);
        await this.write(`goal:${goal.id}`, goal);
      }
    }
    await this.write(`threads:${profileId}`, []);
    this.sendTo(profileId, { type: 'conversations-cleared' });
    await this.pushBootstrap(profileId);
  }

  async rotateInvite(profileId: string, goalId: unknown, origin: string, socket: any) {
    const goal = await this.authorizedGoal(profileId, goalId);
    if (goal.creatorId !== profileId || goal.participants.length !== 1) throw new Error('This conversation cannot accept another participant.');
    const secret = randomSecret();
    goal.inviteHash = await sha256(secret);
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    this.send(socket, { type: 'invite-rotated', goalId: goal.id, shareUrl: `${origin}/?invite=${encodeURIComponent(`${goal.id}.${secret}`)}` });
  }

  async confirmResult(profileId: string, goalId: unknown, version: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    if (goal.participants.length !== 2 || !goal.result.requiresConfirmation) throw new Error('This result does not require mutual confirmation.');
    if (goal.result.status === 'confirmed') return;
    if (goal.result.status !== 'confirming' || Number(version) !== Number(goal.result.version)) throw new Error('The details changed. Review the latest version.');
    goal.result.confirmations[profileId] = goal.result.version;
    const complete = goal.participants.every((id: string) => goal.result.confirmations[id] === goal.result.version);
    if (complete) {
      goal.result.status = 'confirmed';
      goal.result.lockedAt = Date.now();
      goal.status = 'resolved';
    }
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  async markResolved(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    goal.result.status = 'resolved';
    goal.result.resolvedBy = profileId;
    goal.result.resolvedAt = Date.now();
    goal.status = 'resolved';
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  async closeConversation(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    goal.result.status = 'closed';
    goal.result.closedBy = profileId;
    goal.result.closedAt = Date.now();
    goal.status = 'closed';
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  async continueConversation(profileId: string, goalId: unknown) {
    const goal = await this.authorizedGoal(profileId, goalId);
    if (!['resolved', 'closed', 'confirmed'].includes(goal.result.status)) throw new Error('This conversation is already active.');
    goal.result.version = Number(goal.result.version || 0) + 1;
    goal.result.status = 'open';
    goal.result.requiresConfirmation = false;
    goal.result.confirmations = {};
    goal.result.lockedAt = null;
    goal.status = goal.participants.length === 2 ? 'active' : 'waiting';
    goal.updatedAt = Date.now();
    await this.write(`goal:${goal.id}`, goal);
    await this.broadcastGoal(goal);
  }

  async removeContact(profileId: string, contactId: unknown) {
    if (!validProfileId(contactId)) return;
    const contacts = await this.contacts(profileId);
    delete contacts[String(contactId)];
    await this.write(`contacts:${profileId}`, contacts);
    await this.pushBootstrap(profileId);
  }

  async blockContact(profileId: string, contactId: unknown) {
    if (!validProfileId(contactId) || contactId === profileId) return;
    const blocks = await this.blocks(profileId);
    blocks[String(contactId)] = { id: String(contactId), blockedAt: Date.now() };
    await this.write(`blocks:${profileId}`, blocks);
    await this.removeContact(profileId, contactId);
    await this.pushBootstrap(profileId);
  }

  async unblockContact(profileId: string, contactId: unknown) {
    const blocks = await this.blocks(profileId);
    delete blocks[String(contactId)];
    await this.write(`blocks:${profileId}`, blocks);
    await this.pushBootstrap(profileId);
  }

  async isBlockedEitherWay(first: string, second: string) {
    const [a, b] = await Promise.all([this.blocks(first), this.blocks(second)]);
    return Boolean(a[second] || b[first]);
  }

  async ensureContacts(first: string, second: string) {
    if (first === second) return;
    const [firstProfile, secondProfile, firstContacts, secondContacts] = await Promise.all([
      this.read(`profile:${first}`), this.read(`profile:${second}`), this.contacts(first), this.contacts(second)
    ]);
    const now = Date.now();
    firstContacts[second] = { id: second, name: secondProfile?.name || '', updatedAt: now };
    secondContacts[first] = { id: first, name: firstProfile?.name || '', updatedAt: now };
    await Promise.all([this.write(`contacts:${first}`, firstContacts), this.write(`contacts:${second}`, secondContacts)]);
    await Promise.all([this.pushBootstrap(first), this.pushBootstrap(second)]);
  }

  async contacts(profileId: string) {
    const value = await this.read(`contacts:${profileId}`);
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    if (value[profileId]) {
      delete value[profileId];
      await this.write(`contacts:${profileId}`, value);
    }
    return value;
  }

  async blocks(profileId: string) {
    const value = await this.read(`blocks:${profileId}`);
    return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
  }

  async threadEntries(profileId: string) {
    const value = await this.read(`threads:${profileId}`);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.map((item: any) => typeof item === 'string' ? { goalId: item, updatedAt: 0 } : item)
      .filter((item: any) => validGoalId(item?.goalId) && !seen.has(item.goalId) && seen.add(item.goalId));
  }

  async addThread(profileId: string, goalId: string) {
    const entries = (await this.threadEntries(profileId)).filter(item => item.goalId !== goalId);
    entries.unshift({ goalId, updatedAt: Date.now() });
    await this.write(`threads:${profileId}`, entries.slice(0, 200));
  }

  async removeThread(profileId: string, goalId: string) {
    await this.write(`threads:${profileId}`, (await this.threadEntries(profileId)).filter(item => item.goalId !== goalId));
  }

  async bootstrap(profileId: string) {
    const profile = await this.read(`profile:${profileId}`);
    const entries = await this.threadEntries(profileId);
    const threads: any[] = [];
    for (const entry of entries) {
      const goal = await this.getGoal(entry.goalId);
      if (!goal || goal.deletedAt || !goal.participants.includes(profileId) || goal.removedBy.includes(profileId)) continue;
      const visible = goal.thread.filter((item: any) => !item.deletedAt);
      const peerId = goal.participants.find((id: string) => id !== profileId) || null;
      const peer = peerId ? await this.read(`profile:${peerId}`) : null;
      const ownPending = goal.pendingDraft?.ownerId === profileId ? goal.pendingDraft.draft : '';
      threads.push({
        goalId: goal.id,
        title: cleanText(visible.at(-1)?.text || ownPending || 'New conversation', 80),
        status: goal.status,
        peer: peerId ? { id: peerId, name: peer?.name || '' } : null,
        creator: goal.creatorId === profileId,
        updatedAt: goal.updatedAt
      });
    }
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    const contacts = Object.values(await this.contacts(profileId)).sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const blocks = Object.values(await this.blocks(profileId)).sort((a: any, b: any) => (b.blockedAt || 0) - (a.blockedAt || 0));
    return { profile: publicProfile(profile), threads, contacts, blocks };
  }

  async pushBootstrap(profileId: string) {
    if (!this.sockets.has(profileId)) return;
    this.sendTo(profileId, { type: 'bootstrap', ...(await this.bootstrap(profileId)) });
  }

  async authorizedGoal(profileId: string, goalId: unknown) {
    if (!validGoalId(goalId)) throw new Error('Conversation not found.');
    const goal = await this.getGoal(String(goalId));
    if (!goal || goal.deletedAt || !goal.participants.includes(profileId)) throw new Error('Conversation not found.');
    return goal;
  }

  async getGoal(goalId: string) {
    const raw: any = await this.read(`goal:${goalId}`);
    if (!raw || typeof raw !== 'object') return null;
    if (raw.schema === 2) {
      raw.thread ||= [];
      raw.privateNotes ||= [];
      raw.removedBy ||= [];
      if (!raw.result) {
        raw.result = resultFromAgreement(raw.agreement);
        if (raw.status === 'agreed') raw.status = 'resolved';
        else if (raw.status === 'proposed') raw.status = raw.result.requiresConfirmation ? 'confirming' : (raw.participants?.length === 2 ? 'active' : 'waiting');
        delete raw.agreement;
        await this.write(`goal:${goalId}`, raw);
      }
      return raw;
    }
    const participants = [raw.from, raw.to].filter(validProfileId);
    if (!participants.length) return null;
    const now = Date.now();
    const thread = (Array.isArray(raw.thread) ? raw.thread : []).filter((item: any) => item?.shared !== false && validProfileId(item?.from)).map((item: any) => ({
      id: item.id || `M${randomHex(16)}`,
      from: item.from,
      text: cleanText(item.text),
      createdAt: item.createdAt || item.time || now,
      deletedAt: item.deletedAt || null
    }));
    const pendingOwner = validProfileId(raw.pendingMessage?.for) ? raw.pendingMessage.for : null;
    const legacyFacts = factsFrom(raw.facts);
    const requiresConfirmation = FACT_KEYS.some(key => Boolean(legacyFacts[key]));
    const normalized: any = {
      schema: 2,
      id: raw.id || goalId,
      creatorId: raw.from,
      participants: [...new Set(participants)],
      inviteHash: null,
      inviteClaimedAt: raw.to ? (raw.updatedAt || now) : null,
      status: statusFromLegacy(raw.status, participants),
      tone: TONES.has(raw.tone) ? raw.tone : 'professional',
      thread,
      privateNotes: raw.original ? [{ id: `N${randomHex(12)}`, ownerId: raw.from, text: cleanText(raw.original), createdAt: raw.createdAt || now }] : [],
      pendingDraft: pendingOwner ? { ownerId: pendingOwner, draft: cleanText(raw.pendingMessage.draft), noteId: null, facts: factsFrom(raw.pendingMessage.proposedFacts), resultSummary: cleanText(raw.pendingMessage.draft), resultType: 'progress', requiresConfirmation: false, tone: raw.tone || 'professional', createdAt: raw.pendingMessage.createdAt || now } : null,
      result: { version: raw.status === 'agreed' ? 1 : 0, summary: cleanText(thread.at(-1)?.text || raw.message, 500), type: requiresConfirmation ? 'commitment' : 'progress', requiresConfirmation, ...legacyFacts, status: raw.status === 'agreed' ? 'confirmed' : requiresConfirmation ? 'confirming' : 'open', confirmations: {}, lockedAt: raw.status === 'agreed' ? (raw.updatedAt || now) : null },
      removedBy: [],
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || now,
      deletedAt: raw.deletedAt || null
    };
    await this.write(`goal:${goalId}`, normalized);
    return normalized;
  }

  async viewGoal(goal: any, profileId: string) {
    const profiles: Record<string, any> = {};
    for (const id of goal.participants) {
      const profile = await this.read(`profile:${id}`);
      profiles[id] = { id, name: profile?.name || '' };
    }
    return {
      id: goal.id,
      creatorId: goal.creatorId,
      participants: goal.participants.map((id: string) => profiles[id]),
      status: goal.status,
      tone: goal.tone,
      thread: goal.thread.filter((item: any) => !item.deletedAt).map((item: any) => ({ id: item.id, from: item.from, text: item.text, createdAt: item.createdAt })),
      privateNotes: goal.privateNotes.filter((item: any) => item.ownerId === profileId).map((item: any) => ({ id: item.id, text: item.text, createdAt: item.createdAt })),
      pendingDraft: goal.pendingDraft?.ownerId === profileId ? { draft: goal.pendingDraft.draft, noteId: goal.pendingDraft.noteId, facts: goal.pendingDraft.facts, tone: goal.pendingDraft.tone } : null,
      result: goal.result,
      canDeleteEveryone: goal.creatorId === profileId,
      canInvite: goal.creatorId === profileId && goal.participants.length === 1,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    };
  }

  async broadcastGoal(goal: any) {
    for (const profileId of goal.participants) {
      this.sendTo(profileId, { type: 'goal-updated', goal: await this.viewGoal(goal, profileId) });
      await this.pushBootstrap(profileId);
    }
  }

  async makeDraft(profileId: string, peerId: string | null, raw: string, tone: string, goal: any) {
    const fallback = { draft: raw, resultSummary: raw, resultType: 'progress', requiresConfirmation: false, facts: { date: null, time: null, location: null } };
    if (!this.env.AI || !this.allow(`ai:${profileId}`, 40, 60_000)) return fallback;
    const history = goal?.thread?.filter((item: any) => !item.deletedAt).slice(-8).map((item: any) => `${item.from === profileId ? 'You' : 'Other'}: ${item.text}`).join('\n') || '(none)';
    const prompt = `You are Relay, a private communication representative. Understand the user's intent and improve the wording in a ${tone} tone. Keep the draft short, natural, and faithful to the user's meaning. Protect private thoughts and never invent facts or commitments. Move the conversation toward a clear result, but do not push for agreement. A result may be an agreement, answer, clarification, rejection, delivered request, communicated boundary, or closed conversation. Set requiresConfirmation to true only for a mutual commitment that both people should explicitly confirm. Extract optional date, time, and location. Return only valid JSON with this shape: {"draft":"...","resultSummary":"...","resultType":"agreement|answer|clarification|rejection|request_delivered|boundary|closed|progress","requiresConfirmation":false,"facts":{"date":null,"time":null,"location":null}}.`;
    try {
      const result = await this.env.AI.run(AI_MODEL, { messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Other participant: ${peerId || 'not joined'}\nRecent shared conversation:\n${history}\n\nPrivate instruction:\n${raw}` }
      ] });
      let response = cleanText(result?.response, 10_000).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}');
      if (start >= 0 && end > start) response = response.slice(start, end + 1);
      const parsed = JSON.parse(response);
      return {
        draft: cleanText(parsed.draft) || raw,
        resultSummary: cleanText(parsed.resultSummary, 500) || cleanText(parsed.draft, 500) || raw,
        resultType: ['agreement', 'answer', 'clarification', 'rejection', 'request_delivered', 'boundary', 'closed', 'progress'].includes(parsed.resultType) ? parsed.resultType : 'progress',
        requiresConfirmation: parsed.requiresConfirmation === true,
        facts: factsFrom(parsed.facts)
      };
    } catch {
      return fallback;
    }
  }
}
