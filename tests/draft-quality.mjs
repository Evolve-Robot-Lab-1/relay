import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:8791';
const wsBase = base.replace(/^http/, 'ws');
const CURRENCY_PATTERN = /[\u0024\u20ac\u00a3\u20b9\u00a5\u20a9\u20bd]|\b(?:usd|eur|gbp|inr|jpy|cny|rmb|cad|aud|nzd|chf|dollars?|euros?|british pounds?|pounds? sterling|rupees?|yen|yuan|krw|korean won|rubles?)\b/i;
const SMALL_NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const AI_PACING_MS = Number(process.env.RELAY_TEST_AI_PACING_MS || 10_000);
let lastAiRequestAt = 0;

async function paceAi() {
  const waitMs = Math.max(0, AI_PACING_MS - (Date.now() - lastAiRequestAt));
  if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
  lastAiRequestAt = Date.now();
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
        if (!waiter.predicate(message)) continue;
        clearTimeout(waiter.timer);
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        waiter.resolve(message);
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

  wait(predicate, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(new Error('Timed out waiting for draft. Recent: ' + JSON.stringify(this.messages.slice(-5))));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  async close() {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) return;
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 1000);
      this.socket.addEventListener('close', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.socket.close();
    });
  }
}

function qualityChecks(intent, draft, checks = {}) {
  assert.ok(draft.length >= 3 && draft.length <= (checks.maxLength || 360), `Draft length is not natural: ${draft.length}`);
  assert.ok(draft.split(/\s+/).filter(Boolean).length <= 80, 'Draft exceeds 80 words.');
  assert.doesNotMatch(draft, /private instruction|as an ai|as your representative|relay suggests|the user wants/i);
  assert.doesNotMatch(draft, /\[[^\]]{1,50}\]/, 'Draft contains a placeholder.');
  if (!/^(?:hi|hello|hey)\b/i.test(intent)) assert.doesNotMatch(draft, /^(?:hi|hello|hey)\b/i, 'Draft added a greeting.');
  if (!/\b(interested|happy|glad|excited)\b/i.test(intent)) assert.doesNotMatch(draft, /\b(interested|happy|glad|excited)\b/i, 'Draft invented an emotion or position.');
  if (!/\b(definitely|guarantee|promise|certainly)\b/i.test(intent)) assert.doesNotMatch(draft, /\b(definitely|guarantee|promise|certainly)\b/i, 'Draft strengthened certainty.');
  if (!/\b(?:thank\w*|appreciat\w*|grateful)\b/i.test(intent)) assert.doesNotMatch(draft, /\b(?:thank\w*|appreciat\w*|grateful)\b/i, 'Draft added gratitude.');
  if (!CURRENCY_PATTERN.test(intent)) assert.doesNotMatch(draft, CURRENCY_PATTERN, 'Draft invented a currency.');
  if (CURRENCY_PATTERN.test(intent)) assert.match(draft, CURRENCY_PATTERN, 'Draft omitted the stated currency.');
  const numbers = intent.match(/\d+(?:[.,]\d+)*/g) || [];
  for (const number of numbers) {
    const numeric = Number(number.replace(/,/g, ''));
    const word = Number.isInteger(numeric) ? SMALL_NUMBER_WORDS[numeric] : '';
    const isTime = new RegExp(number.replace(/\./g, '\\.') + '\\s*(?:a\\.?m\\.?|p\\.?m\\.?)\\b', 'i').test(intent);
    assert.ok(draft.toLowerCase().includes(number.toLowerCase()) || (isTime && word && new RegExp('\\b' + word + '\\b', 'i').test(draft)), 'Draft changed or omitted the number ' + number + '.');
  }
  const sourceMeridiems = [...intent.toLowerCase().matchAll(/\d[\d:.]*\s*(a\.?m\.?|p\.?m\.?)/g)].map(match => match[1].replace(/\./g, ''));
  const normalizedDraft = draft.toLowerCase().replace(/\./g, '');
  for (const meridiem of sourceMeridiems) {
    const pattern = meridiem === 'am' ? /\b(?:am|morning)\b/ : /\b(?:pm|afternoon|evening|night)\b/;
    assert.match(normalizedDraft, pattern, 'Draft changed or omitted ' + meridiem + '.');
  }
  assert.doesNotMatch(draft, /\b(?:happy|glad|excited) to (?:agree|help|support|proceed)\b/i, 'Draft invented enthusiasm.');
  for (const pattern of checks.include || []) assert.match(draft, pattern, `Missing ${pattern} for: ${intent}`);
  for (const pattern of checks.exclude || []) assert.doesNotMatch(draft, pattern, `Added ${pattern} for: ${intent}`);
  if (checks.question) assert.match(draft, /\?|\b(?:please|could you|can you|would you|will you|let me know)\b/i, `Expected a clear request for: ${intent}`);
}

function draftSimilarity(first, second) {
  const left = first.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const right = second.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (left[row - 1] === right[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

const failures = [];

function evaluate(label, intent, draft, checks = {}) {
  try {
    qualityChecks(intent, draft, checks);
    console.log('Result: PASS');
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    console.log(`Result: FAIL - ${error.message}`);
  }
}

const openingCases = [
  {
    name: 'borrow request',
    intent: 'i need to ask my friend to lend me 14k and i can repay by Friday',
    include: [/14(?:,?000|k)/i, /Friday/i, /lend|borrow|loan/i],
    question: true
  },
  {
    name: 'explicit currency',
    intent: 'ask if they can lend me INR 14,000 and I can repay by Friday',
    include: [/\bINR\b|\brupees?\b|\u20b9/i, /14,?000/i, /Friday/i, /lend|borrow|loan/i],
    exclude: [/\b(?:USD|EUR|GBP|dollars?|euros?|pounds?)\b|[\u0024\u20ac\u00a3]/i],
    question: true
  },
  {
    name: 'work boundary',
    intent: 'tell my manager I cannot work Saturday and I do not want to give a reason',
    include: [/cannot|can\W?t|unable|not available|will not be available/i, /Saturday/i, /prefer not|do not want|don\W?t want|won\W?t|will not|keep.{0,20}private/i],
    exclude: [/because|family emergency|appointment|medical/i]
  },
  {
    name: 'supplier question without commitment',
    intent: 'ask the supplier if they can deliver 500 units by Tuesday without promising that I will buy them',
    include: [/500/i, /Tuesday/i, /deliver/i],
    exclude: [/I (?:will|can) (?:buy|order)|place the order|confirm the order/i],
    question: true
  },
  {
    name: 'decline',
    intent: 'decline the offer but thank them for their time',
    include: [/decline|not (?:accept|proceed|move forward)|won\W?t be (?:accepting|moving forward)/i, /thank/i]
  },
  {
    name: 'salary privacy',
    intent: 'I am not comfortable sharing my salary. Ask if a salary range is enough.',
    include: [/not comfortable|prefer not|rather not|do not wish|don\W?t want|private/i, /salary range|range/i],
    question: true
  },
  {
    name: 'cancel and reschedule',
    intent: "cancel tomorrow's meeting and ask if we can meet next week instead",
    include: [/cancel/i, /tomorrow/i, /next week/i],
    question: true
  },
  {
    name: 'disagreement and closure',
    intent: 'I disagree with the decision and want to close the conversation politely',
    include: [/disagree|do not agree|don\W?t agree/i, /close|end|conclude|leave it there|nothing further/i]
  },
  {
    name: 'accept time, reject location',
    intent: 'yes 8pm works for me but I am not willing to meet at my house',
    include: [/(?:8|eight).{0,20}(?:p\.?m\.?|evening|night)/i, /works|available|can meet/i, /not willing|cannot|can\W?t|will not meet at my house|not to meet at my house|different location/i]
  },
  {
    name: 'persuasion becomes a concrete ask',
    intent: 'I want to convince my colleague to test the product for one week before deciding',
    include: [/test|trial|try/i, /product/i, /one week|a week/i, /decid|decis/i],
    exclude: [/I want to convince|I need to convince|persuade you/i]
  },
  {
    name: 'criticism with next step',
    intent: 'tell my colleague this plan is too expensive and ask them for a cheaper option',
    include: [/too expensive|cost|budget/i, /cheaper|lower-cost|less expensive|alternative/i],
    question: true
  }
];

const profiles = await Promise.all([createProfile(), createProfile(), createProfile(), createProfile()]);
const [owner, peer, contextOwner, contextPeer] = profiles.map(profile => new Client(profile));

async function deleteGoal(client, goalId) {
  const deleted = client.wait(message => message.type === 'conversation-deleted' && message.goalId === goalId);
  client.send({ type: 'delete-conversation-everyone', goalId });
  await deleted;
}

async function createDraft(client, intent, tone = 'professional') {
  await paceAi();
  client.send({ type: 'create-goal', message: intent, tone });
  const result = await client.wait(message =>
    (message.type === 'goal-created' && message.goal.pendingDraft?.original === intent)
    || (message.type === 'error' && message.action === 'create-goal')
  );
  if (result.type === 'error') {
    failures.push(`generation ${intent}: ${result.message}`);
    console.log(`\nIntent: ${intent}\nDraft:  [NO DRAFT]\nResult: FAIL - ${result.message}`);
    return null;
  }
  return result;
}

try {
  await Promise.all([owner.connect(), peer.connect(), contextOwner.connect(), contextPeer.connect()]);
  owner.send({ type: 'set-name', name: 'Quality Owner' });
  peer.send({ type: 'set-name', name: 'Quality Peer' });
  contextOwner.send({ type: 'set-name', name: 'Context Owner' });
  contextPeer.send({ type: 'set-name', name: 'Context Peer' });

  console.log('\nOPENING DRAFTS');
  for (const test of openingCases) {
    const created = await createDraft(owner, test.intent);
    if (!created) continue;
    const draft = created.goal.pendingDraft.draft;
    console.log(`\n[${test.name}]\nIntent: ${test.intent}\nDraft:  ${draft}`);
    evaluate(test.name, test.intent, draft, test);
    await deleteGoal(owner, created.goal.id);
  }

  console.log('\n\nTONE VARIANTS');
  const toneIntent = 'ask my colleague to review the budget by Friday and tell me if they disagree';
  const toneCreated = await createDraft(owner, toneIntent);
  if (!toneCreated) throw new Error('Cannot evaluate tone variants without the opening draft.');
  const toneGoalId = toneCreated.goal.id;
  const toneDrafts = { professional: toneCreated.goal.pendingDraft.draft };
  for (const tone of ['friendly', 'direct', 'casual']) {
    await paceAi();
    owner.send({ type: 'redraft', goalId: toneGoalId, tone });
    const update = await owner.wait(message =>
      (message.type === 'goal-updated' && message.goal.id === toneGoalId && message.goal.pendingDraft?.tone === tone)
      || (message.type === 'error' && message.action === 'redraft')
    );
    if (update.type === 'error') {
      failures.push(`tone ${tone}: ${update.message}`);
      console.log(`\n[${tone}] [NO DRAFT]\nResult: FAIL - ${update.message}`);
      continue;
    }
    toneDrafts[tone] = update.goal.pendingDraft.draft;
  }
  for (const [tone, draft] of Object.entries(toneDrafts)) {
    console.log(`\n[${tone}] ${draft}`);
    evaluate(`tone ${tone}`, toneIntent, draft, { include: [/Friday/i, /budget/i, /disagree|concern|object|issue|feedback|thought|see (?:it )?differently|feel(?:s)? off|look(?:s)? off|seem(?:s)? (?:wrong|off)/i] });
  }
  if (toneDrafts.professional) assert.doesNotMatch(toneDrafts.professional, /\b(?:can't|won't|don't|isn't|aren't|I'm|I'd|I'll|we're|we've|you're|you've|they're|they've)\b/i, 'Professional tone should not use contractions.');
  if (toneDrafts.direct) assert.doesNotMatch(toneDrafts.direct, /\b(?:could you|would you)\b/i, 'Direct tone should not remain indirect.');
  if (toneDrafts.casual) assert.doesNotMatch(toneDrafts.casual, /\b(?:could you|would you|advise|regarding|whether|sufficient|constitute)\b/i, 'Casual tone should avoid formal wording.');
  if (Object.keys(toneDrafts).length === 4 && new Set(Object.values(toneDrafts).map(value => value.toLowerCase())).size !== 4) {
    failures.push('tone variants: All four tones must produce distinct drafts.');
  }
  if (Object.keys(toneDrafts).length === 4) {
    const entries = Object.entries(toneDrafts);
    for (let first = 0; first < entries.length; first += 1) {
      for (let second = first + 1; second < entries.length; second += 1) {
        if (entries[first][0] === 'direct' || entries[second][0] === 'direct') continue;
        const similarity = draftSimilarity(entries[first][1], entries[second][1]);
        if (similarity > 0.82) failures.push(`tone variants: ${entries[first][0]} and ${entries[second][0]} are too similar (${similarity.toFixed(2)}).`);
      }
    }
  }
  await deleteGoal(owner, toneGoalId);

  console.log('\n\nCONTEXTUAL REPLIES');
  const seed = await createDraft(contextOwner, 'I need 500 units as soon as possible.');
  if (!seed) throw new Error('Cannot evaluate contextual replies without the opening draft.');
  const inviteReady = contextOwner.wait(message => message.type === 'invite-ready' && message.goalId === seed.goal.id);
  contextOwner.send({ type: 'approve-outbound', goalId: seed.goal.id });
  await contextOwner.wait(message => message.type === 'goal-updated' && message.goal.id === seed.goal.id && message.goal.thread.length === 1);
  const inviteUrl = new URL((await inviteReady).shareUrl);
  const invite = /^\/i\/([A-Za-z0-9_-]{22})$/.exec(inviteUrl.pathname)?.[1] || inviteUrl.searchParams.get('invite');
  contextPeer.send({ type: 'claim-invite', invite });
  await contextPeer.wait(message => message.type === 'invite-claimed' && message.goal.id === seed.goal.id);
  contextOwner.send({ type: 'toggle-representative', goalId: seed.goal.id });
  await contextOwner.wait(message => message.type === 'goal-updated' && message.goal.id === seed.goal.id && message.goal.representativeMode === false);
  const replyCases = [
    { context: 'I need 500 units as soon as possible.', intent: 'reason why?', include: [/why|reason|explain/i, /500|units|urgent|soon/i], exclude: [/\bI (?:need|am in).{0,30}500/i], question: true },
    { context: 'Can you guarantee delivery by Thursday?', intent: 'I cannot guarantee it. I can only estimate Friday.', include: [/cannot|can\W?t|unable/i, /guarantee/i, /Thursday/i, /Friday/i], exclude: [/^I guarantee|will deliver/i] },
    { context: 'Why do you need the units so urgently?', intent: 'I am not comfortable sharing that. Cancel my request.', include: [/not comfortable|prefer not|do not wish|don\W?t want|private/i, /cancel|withdraw/i] },
    { context: 'Would Monday or Tuesday work better for delivery?', intent: 'Tuesday is better for me', include: [/Tuesday/i], exclude: [/Monday is better for me|discuss.{0,20}Tuesday/i] }
  ];
  for (const test of replyCases) {
    const contextBefore = contextPeer.messages.filter(message => message.type === 'goal-updated' && message.goal.id === seed.goal.id).at(-1)?.goal.thread.length || 1;
    contextOwner.send({ type: 'draft-reply', goalId: seed.goal.id, text: test.context });
    const contextUpdate = await contextPeer.wait(message => message.type === 'goal-updated' && message.goal.id === seed.goal.id && message.goal.thread.length > contextBefore);
    const before = contextUpdate.goal.thread.length;
    await paceAi();
    contextPeer.send({ type: 'draft-reply', goalId: seed.goal.id, text: test.intent });
    const update = await contextPeer.wait(message =>
      (message.type === 'goal-updated' && message.goal.id === seed.goal.id && message.goal.thread.length > before)
      || (message.type === 'error' && message.action === 'draft-reply')
    );
    if (update.type === 'error') {
      failures.push(`reply ${test.intent}: ${update.message}`);
      console.log(`\nIntent: ${test.intent}\nDraft:  [NO DRAFT]\nResult: FAIL - ${update.message}`);
      continue;
    }
    const draft = update.goal.thread.at(-1).text;
    console.log(`\nIntent: ${test.intent}\nDraft:  ${draft}`);
    evaluate(`reply ${test.intent}`, test.intent, draft, test);
  }
  await deleteGoal(contextOwner, seed.goal.id);

  if (failures.length) {
    console.error(`\nDraft quality evaluation failed (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('\nDraft quality evaluation passed.');
  }
} finally {
  await Promise.all([owner.close(), peer.close(), contextOwner.close(), contextPeer.close()]);
}

process.exit(process.exitCode || 0);
