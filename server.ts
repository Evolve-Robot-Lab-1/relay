const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

const FACT_SLOTS = ['date', 'time', 'location'];
const PROTOCOL_STATES = ['drafting', 'sent', 'agreed', 'completed', 'cancelled'];

const VALID_TRANSITIONS = {
  drafting:        ['sent', 'cancelled'],
  sent:            ['sent', 'agreed', 'cancelled'],
  agreed:          ['agreed', 'completed', 'cancelled'],
  completed:       ['cancelled'],
  cancelled:       []
};

function validateTransition(from, to) {
  return VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to);
}

function emptyFacts() {
  const f = {};
  FACT_SLOTS.forEach(s => { f[s] = { value: null, status: 'unknown' }; });
  return f;
}

function cloneFacts(facts) {
  const f = {};
  FACT_SLOTS.forEach(s => { f[s] = { value: facts[s]?.value || null, status: facts[s]?.status || 'unknown' }; });
  return f;
}

function confirmFacts(current, proposed) {
  const result = cloneFacts(current);
  FACT_SLOTS.forEach(s => {
    if (proposed[s] && proposed[s].value !== null && proposed[s].value !== undefined) {
      result[s] = { value: proposed[s].value, status: 'agreed' };
    }
  });
  return result;
}

function factCountConfirmed(facts) {
  return FACT_SLOTS.filter(s => facts[s]?.status === 'agreed').length;
}

function allConfirmed(facts) {
  const total = FACT_SLOTS.filter(s => facts[s]?.status === 'proposed' || facts[s]?.status === 'agreed').length;
  return total > 0 && total === factCountConfirmed(facts);
}

function getOtherId(goal, myId) {
  return goal.from === myId ? goal.to : goal.from;
}

function isYourTurnToApproveOutbound(goal, myId) {
  return goal.pendingMessage && goal.pendingMessage.for === myId;
}

function isYourTurnToReview(goal, myId) {
  return goal.pendingReview && goal.pendingReview.for === myId;
}

const TONES = ['professional', 'friendly', 'direct', 'casual'];
const TONE_INSTRUCTIONS = {
  professional: 'Write in a professional, courteous tone. Use proper grammar and polite language.',
  friendly: 'Write in a warm, friendly tone. Be approachable and personable.',
  direct: 'Write in a direct, straightforward tone. Be concise and to the point.',
  casual: 'Write in a casual, relaxed tone. Use everyday language.'
};

const AI_ROLE_DRAFT = `You are a communication representative.

YOUR IDENTITY (you): your_id
OTHER AGENT: other_id

SCENE: Your user gives you a private instruction. Draft a message to send to the other agent.

RULES:
- draft: Rewrite the user's message in a clear, grammatically correct way that matches the requested tone. Fix obvious grammar issues while keeping the original intent and facts intact.
- Extract facts about date, time, and location if mentioned. Output values only — status is handled server-side.
- If no facts found, set facts to null.
- Tone: {tone_instruction}
- Example: user says "Can we meet Thursday at 2pm at Starbucks?" → draft: "Can we meet Thursday at 2pm at Starbucks?" and facts: {date:{value:"Thursday"},time:{value:"2pm"},location:{value:"Starbucks"}}
- Example: user says "I need to ask my friend for ₹1000" → draft: "Would you be able to repay ₹1000 this week?" and facts: null

Reply with ONLY this JSON:
{"draft":"...","confidence":"high|medium|low","facts":{"date":{"value":"..."},"time":{"value":"..."},"location":{"value":"..."}}|null}`;

// In-memory registry for active WebSocket connections — works within the same Worker instance
const WS_REGISTRY = new Map();
const STORE_ORIGIN = 'https://relay-store.internal';
const DELETED_VALUE = '__relay_deleted_v1__';

export class RelayStore {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });

    if (request.method === 'GET') {
      const value = await this.storage.get(key);
      if (value === undefined) return new Response(null, { status: 404 });
      if (value === DELETED_VALUE) return new Response(null, { status: 410 });
      return new Response(value);
    }

    if (request.method === 'PUT') {
      await this.storage.put(key, await request.text());
      return new Response(null, { status: 204 });
    }

    if (request.method === 'DELETE') {
      // Keep a tombstone so a deleted legacy KV record cannot reappear.
      await this.storage.put(key, DELETED_VALUE);
      return new Response(null, { status: 204 });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}

function createStore(env) {
  const id = env.RELAY_STORE.idFromName('relay-mvp-v1');
  const stub = env.RELAY_STORE.get(id);

  return {
    async get(key, type) {
      const response = await stub.fetch(STORE_ORIGIN + '/value?key=' + encodeURIComponent(key));
      if (response.status === 410) return null;
      if (response.status === 404) return env.AGENTS_KV.get(key, type);
      if (!response.ok) throw new Error('Store read failed: ' + response.status);
      const value = await response.text();
      return type === 'json' ? JSON.parse(value) : value;
    },

    async put(key, value) {
      const response = await stub.fetch(STORE_ORIGIN + '/value?key=' + encodeURIComponent(key), {
        method: 'PUT',
        body: String(value)
      });
      if (!response.ok) throw new Error('Store write failed: ' + response.status);
    },

    async delete(key) {
      const response = await stub.fetch(STORE_ORIGIN + '/value?key=' + encodeURIComponent(key), {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Store delete failed: ' + response.status);
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const store = createStore(env);

    if (url.pathname === '/api/poll') {
      const goalId = url.searchParams.get('goalId');
      const forId = url.searchParams.get('for');
      if (!goalId) return new Response('{}', { status: 400 });
      const goal = await store.get('goal:' + goalId, 'json');
      if (!goal) return new Response('{}', { status: 404 });
      const pending = goal.pendingMessage && goal.pendingMessage.for === forId ? goal.pendingMessage : null;
      const review = goal.pendingReview && goal.pendingReview.for === forId ? goal.pendingReview : null;
      const representativeMode = goal.representativeMode ? goal.representativeMode[forId] : undefined;
      return new Response(JSON.stringify({ thread: goal.thread, status: goal.status, facts: goal.facts, tone: goal.tone, representativeMode: representativeMode, pendingMessage: pending, pendingReview: review, version: goal.updatedAt || goal.createdAt || 0 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (url.pathname === '/api/threads' || url.pathname === '/api/contacts') {
      const forId = url.searchParams.get('for');
      if (!forId || !/^A[0-9a-f]{4,}$/.test(forId)) {
        return new Response(JSON.stringify({ error: 'Invalid agent ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const isThreads = url.pathname === '/api/threads';
      const value = await store.get((isThreads ? 'threads:' : 'contacts:') + forId, 'json');
      return new Response(JSON.stringify(isThreads ? { threads: value || [] } : { contacts: value || {} }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (url.pathname === '/api/test') {
      const role = url.searchParams.get('role') || 'draft';
      const other = url.searchParams.get('other') || 'Meeting at 3pm on Thursday?';
      const user = url.searchParams.get('user') || 'Yes, Thursday 3pm at food court works';
      const prompt = AI_ROLE_DRAFT;
      const msg = 'Conversation history:\n' + (role === 'draft' ? '(none)' : '[Other agent: ' + other + ']') + '\n\nCurrent agreed values: none\n\nYour user\'s EXACT words: "' + user + '"\n\nReply with ONLY this JSON (no other text):\n{"draft":"...","confidence":"high|medium|low","facts":{"date":{"value":"..."},"time":{"value":"..."},"location":{"value":"..."}}|null}';
      return env.AI.run(AI_MODEL, {
        messages: [
          { role: 'system', content: prompt },
          { role: 'system', content: 'your_id: test_agent\nother_id: test_other' },
          { role: 'user', content: msg }
        ]
      }).then(r => {
        let raw = r.response.trim();
        if (raw.startsWith('{')) {
          let open = 0;
          for (let c of raw) { if (c === '{') open++; else if (c === '}') open--; }
          while (open > 0) { raw += '}'; open--; }
        }
        try {
          const p = JSON.parse(raw);
          return new Response(JSON.stringify({ input: { other, user }, output: p, raw }, null, 2), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        } catch (e) {
          return new Response(JSON.stringify({ input: { other, user }, output: raw, error: e.message }, null, 2), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
      }).catch(e => new Response(JSON.stringify({ error: e.message }), { status: 500 }));
    }

    if (request.headers.get('upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      let myId = null;

      function send(d) { try { server.send(JSON.stringify(d)); } catch(e) {} }

      // On close, remove from registry
      server.addEventListener('close', () => {
        if (myId) WS_REGISTRY.delete(myId);
      });

      function isAgentMsg(r) { return typeof r.from === 'string' && r.from.startsWith('A'); }

      function formatThread(thread, myId) {
        const recent = thread.slice(-6); // keep last 6 messages to stay within context
        return recent.filter(r => r.shared !== false).map(r => {
          if (!isAgentMsg(r)) return `[System: user said "${r.text}"]`;
          if (r.from === myId) return `[You: ${r.text}]`;
          return `[Other agent (${r.from}): ${r.text}]`;
        }).join('\n');
      }

      function buildAIInput(myId, otherId, rawUserInput, currentFacts, tone, thread) {
        const factsStr = currentFacts ? JSON.stringify({ date: { value: currentFacts.date?.value || null }, time: { value: currentFacts.time?.value || null }, location: { value: currentFacts.location?.value || null } }) : 'none';
        const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
        const prompt = AI_ROLE_DRAFT.replace('{tone_instruction}', toneInstruction);
        const historyStr = thread && thread.length > 0 ? '\n\nConversation so far:\n' + formatThread(thread, myId) : '';
        return {
          messages: [
            { role: 'system', content: prompt },
            { role: 'system', content: 'your_id: ' + myId + '\nother_id: ' + (otherId || 'unknown') },
            { role: 'user', content: 'Current agreed values: ' + factsStr + historyStr + '\n\nYour user\'s EXACT words: "' + rawUserInput + '"\n\nReply with ONLY this JSON (no other text):\n{"draft":"...","confidence":"high|medium|low","facts":{"date":{"value":"<value or null>"},"time":{"value":"<value or null>"},"location":{"value":"<value or null>"}}|null}' }
          ]
        };
      }

      function parseAIResult(aiResult) {
        let draft = null, confidence = 'high', aiFacts = null;
        try {
          let raw = aiResult.response.trim();
          if (raw.startsWith('{')) {
            let open = 0;
            for (let c of raw) { if (c === '{') open++; else if (c === '}') open--; }
            while (open > 0) { raw += '}'; open--; }
          }
          const parsed = JSON.parse(raw);
          draft = parsed.draft;
          confidence = parsed.confidence || 'high';
          aiFacts = parsed.facts || null;
        } catch {}
        return { draft, confidence, aiFacts };
      }

      function buildNewProposedFacts(aiFacts, currentFacts) {
        const f = cloneFacts(currentFacts);
        let changed = false;
        if (aiFacts) {
          FACT_SLOTS.forEach(s => {
            const aiVal = aiFacts[s]?.value;
            if (aiVal === null || aiVal === undefined) return;
            if (currentFacts[s]?.status === 'agreed' && aiVal === currentFacts[s]?.value) return;
            if (currentFacts[s]?.status === 'proposed' && aiVal === currentFacts[s]?.value) {
              f[s] = { value: aiVal, status: 'agreed' };
              changed = true;
              return;
            }
            if (aiVal !== currentFacts[s]?.value) {
              f[s] = { value: aiVal, status: 'proposed' };
              changed = true;
            }
          });
        }
        return changed ? f : null;
      }

      function notifyOtherClient(targetId, msg) {
        const ws = WS_REGISTRY.get(targetId);
        if (ws) {
          try { ws.send(JSON.stringify(msg)); } catch(e) {}
        }
      }

      function notifyGoalUpdate(targetId, goal) {
        if (!targetId) return;
        notifyOtherClient(targetId, {
          type: 'new-data',
          goalId: goal.id,
          thread: goal.thread,
          status: goal.status,
          facts: goal.facts,
          tone: goal.tone,
          representativeMode: goal.representativeMode?.[targetId],
          pendingMessage: goal.pendingMessage?.for === targetId ? goal.pendingMessage : null,
          pendingReview: goal.pendingReview?.for === targetId ? goal.pendingReview : null,
          version: goal.updatedAt || goal.createdAt || 0
        });
      }

      function maybeSetPendingReview(goal, otherId, message, facts, fromId) {
        // Only set pendingReview if peer has representativeMode OFF (needs to review manually)
        if (goal.representativeMode[otherId] === false) {
          goal.pendingReview = { for: otherId, message, facts, from: fromId, createdAt: Date.now() };
          if (validateTransition(goal.status, 'sent')) {
            goal.status = 'sent';
          }
        } else {
          goal.pendingReview = null;
          if (validateTransition(goal.status, 'sent')) {
            goal.status = 'sent';
          }
        }
      }

      server.addEventListener('message', (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch(e) { return; }

        if (msg.type === 'init') {
          const savedId = msg.agentId;
          if (savedId && /^A[0-9a-f]{4,}$/.test(savedId)) {
            myId = savedId;
            Promise.all([
              store.get('threads:' + myId, 'json'),
              store.get('contacts:' + myId, 'json')
            ]).then(([threads, contacts]) => {
              send({ type: 'welcome', id: myId, threads: threads || [], contacts: contacts || {} });
            }).catch(() => {
              send({ type: 'welcome', id: myId, threads: [] });
            });
            // Register in-memory for push notifications
            WS_REGISTRY.set(myId, server);
          } else {
            myId = 'A' + hex(4);
            send({ type: 'welcome', id: myId, threads: [], contacts: {} });
            ctx.waitUntil(store.put('threads:' + myId, JSON.stringify([])));
            ctx.waitUntil(store.put('contacts:' + myId, JSON.stringify({})));
            WS_REGISTRY.set(myId, server);
          }
        }

        if (msg.type === 'set-name' && myId) {
          const name = (msg.name || '').toString().trim();
          if (!name) return;
          ctx.waitUntil(
            store.get('name:' + myId).then((currentName) => {
              if (currentName === name) return;
              return store.put('name:' + myId, name);
            }).then(() => {
              send({ type: 'name-set', name: name });
            })
          );
        }

        if (msg.type === 'create-goal' && myId) {
          const goalId = 'G' + hex(6);
          const tone = msg.tone || 'professional';
          const targetId = msg.targetId && /^A[0-9a-f]{4,}$/.test(msg.targetId) ? msg.targetId : null;

          const processAndCreate = env.AI.run(AI_MODEL, buildAIInput(myId, null, msg.message, null, tone)).then((aiResult) => {
            const { draft, confidence, aiFacts } = parseAIResult(aiResult);
            const agentDraft = draft || msg.message;

            const initialFacts = aiFacts ? buildNewProposedFacts(aiFacts, emptyFacts()) : null;

            const goal = {
              id: goalId, from: myId, message: agentDraft, original: msg.message, to: targetId,
              thread: [],
              status: 'drafting',
              facts: initialFacts || emptyFacts(),
              tone: tone,
              representativeMode: {},
              pendingMessage: {
                for: myId,
                draft: agentDraft,
                original: msg.message,
                proposedFacts: initialFacts,
                createdAt: Date.now()
              },
              pendingReview: null,
              createdAt: Date.now(), updatedAt: Date.now()
            };

            const entry = { goalId, message: agentDraft.substring(0, 60), status: goal.status, with: targetId };

            return store.put('goal:' + goalId, JSON.stringify(goal)).then(() => {
              return store.get('threads:' + myId, 'json').then((t) => {
                t = t || [];
                t.unshift(entry);
                return store.put('threads:' + myId, JSON.stringify(t));
              });
            }).then(() => {
              if (targetId) {
                return store.get('threads:' + targetId, 'json').then((t) => {
                  t = t || [];
                  t.unshift(entry);
                  return store.put('threads:' + targetId, JSON.stringify(t));
                });
              }
            }).then(() => {
              send({ type: 'goal-created', goalId, shareUrl: targetId ? null : url.origin + '?goal=' + goalId, message: agentDraft, original: msg.message, status: goal.status, facts: goal.facts, tone: goal.tone, pendingMessage: goal.pendingMessage });
              notifyGoalUpdate(targetId, goal);
            });
          }).catch(() => {
            const goal = {
              id: goalId, from: myId, message: msg.message, original: msg.message, to: targetId,
              thread: [], status: 'drafting', facts: emptyFacts(),
              tone: tone, representativeMode: {},
              pendingMessage: { for: myId, draft: msg.message, original: msg.message, proposedFacts: null, createdAt: Date.now() },
              pendingReview: null,
              createdAt: Date.now(), updatedAt: Date.now()
            };
            const entry = { goalId, message: msg.message.substring(0, 60), status: goal.status, with: targetId };
            return store.put('goal:' + goalId, JSON.stringify(goal)).then(() => {
              return store.get('threads:' + myId, 'json').then((t) => {
                t = t || [];
                t.unshift(entry);
                return store.put('threads:' + myId, JSON.stringify(t));
              });
            }).then(() => {
              if (targetId) {
                return store.get('threads:' + targetId, 'json').then((t) => {
                  t = t || [];
                  t.unshift(entry);
                  return store.put('threads:' + targetId, JSON.stringify(t));
                });
              }
            }).then(() => {
              send({ type: 'goal-created', goalId, shareUrl: targetId ? null : url.origin + '?goal=' + goalId, message: msg.message, original: msg.message, status: goal.status, facts: goal.facts, tone: goal.tone, pendingMessage: goal.pendingMessage });
              notifyGoalUpdate(targetId, goal);
            });
          }).catch((error) => {
            console.error('create-goal failed', error);
            send({ type: 'error', action: 'create-goal', message: 'Could not create the conversation. Please try again.' });
          });

          ctx.waitUntil(processAndCreate);
        }

        if (msg.type === 'open-goal' && myId) {
          const gid = msg.goalId;
          store.get('goal:' + gid, 'json').then((goal) => {
            if (!goal) {
              send({ type: 'goal-loaded', goalId: gid, message: 'Goal not found', thread: [], from: '?' });
              return;
            }
            if (!goal.to && goal.from !== myId) {
              goal.to = myId;
              // Save contacts for both users
              const saveBothContacts = (async () => {
                const myName = await store.get('name:' + myId);
                const theirName = await store.get('name:' + goal.from);
                if (myName) {
                  const theirContacts = (await store.get('contacts:' + goal.from, 'json')) || {};
                  theirContacts[myId] = { id: myId, name: myName, lastSeen: Date.now() };
                  await store.put('contacts:' + goal.from, JSON.stringify(theirContacts));
                }
                if (theirName) {
                  const myContacts = (await store.get('contacts:' + myId, 'json')) || {};
                  myContacts[goal.from] = { id: goal.from, name: theirName, lastSeen: Date.now() };
                  await store.put('contacts:' + myId, JSON.stringify(myContacts));
                }
              })();
              ctx.waitUntil(saveBothContacts);
            }
            // Default representativeMode ON for everyone (before any checks)
            if (goal.representativeMode[myId] === undefined) goal.representativeMode[myId] = true;
            // If the peer just opened and there's a message from the other side waiting for them
            if (!goal.pendingReview && goal.thread.length > 0 && goal.from !== myId && (goal.status === 'sent')) {
              const lastMsg = goal.thread[goal.thread.length - 1];
              if (lastMsg.from !== myId) {
                // Only set pendingReview if this user has representativeMode OFF
                if (goal.representativeMode[myId] === false) {
                  goal.pendingReview = {
                    for: myId,
                    message: lastMsg.text,
                    facts: null,
                    from: lastMsg.from,
                    createdAt: Date.now()
                  };
                  if (validateTransition(goal.status, 'sent')) {
                    goal.status = 'sent';
                  }
                }
              }
            }
            // Compute after potentially setting pendingReview above
            const myPendingMessage = isYourTurnToApproveOutbound(goal, myId) || goal.pendingMessage?.for === myId ? goal.pendingMessage : null;
            const myPendingReview = isYourTurnToReview(goal, myId) || goal.pendingReview?.for === myId ? goal.pendingReview : null;
            send({ type: 'goal-loaded', goalId: gid, message: goal.message, thread: goal.thread, from: goal.from, myId: myId, status: goal.status, facts: goal.facts, tone: goal.tone, representativeMode: goal.representativeMode[myId], pendingMessage: myPendingMessage, pendingReview: myPendingReview });

            const p = store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
              return store.get('threads:' + myId, 'json').then((ft) => {
                ft = ft || [];
                if (!ft.some((e) => e.goalId === gid)) {
                  ft.unshift({ goalId: gid, message: goal.message, status: goal.status, with: goal.from });
                }
                return store.put('threads:' + myId, JSON.stringify(ft));
              });
            }).then(() => {
              return store.get('threads:' + goal.from, 'json').then((ct) => {
                ct = ct || [];
                const idx = ct.findIndex((e) => e.goalId === gid);
                if (idx >= 0) { ct[idx].status = goal.status; ct[idx].with = myId; }
                else { ct.unshift({ goalId: gid, message: goal.message, status: goal.status, with: myId }); }
                return store.put('threads:' + goal.from, JSON.stringify(ct));
              });
            });
            ctx.waitUntil(p);
          });
        }

        if (msg.type === 'draft-reply' && myId) {
          const gid = msg.goalId;
          const rawText = msg.text;

          const processAndSave = store.get('goal:' + gid, 'json').then((goal) => {
            if (!goal) return;

            // Default representativeMode ON if not set

            if (goal.representativeMode[myId] === undefined) goal.representativeMode[myId] = true;

            if (goal.pendingMessage) {
              send({ type: 'clarify', goalId: gid, original: rawText, reason: 'You already have a draft awaiting your approval. Approve or reject it first.' });
              return;
            }

            // If representativeMode OFF for this user, skip AI entirely and push directly to thread
            if (!goal.representativeMode[myId]) {
              const sharedMsg = { from: myId, text: rawText, original: rawText, shared: true, time: Date.now() };
              goal.thread.push(sharedMsg);
              goal.pendingMessage = null;
              goal.updatedAt = Date.now();

              const otherId = getOtherId(goal, myId);
              if (allConfirmed(goal.facts) && validateTransition(goal.status, 'agreed')) {
                goal.status = 'agreed';
              } else if (validateTransition(goal.status, 'sent')) {
                goal.status = 'sent';
              }

              if (otherId && goal.to) {
                maybeSetPendingReview(goal, otherId, rawText, null, myId);
              }

              const shareUrl = url.origin + '?goal=' + gid;
              return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
                send({ type: 'outbound-approved', goalId: gid, message: rawText, status: goal.status, facts: goal.facts, thread: goal.thread, pendingReview: goal.pendingReview, shareUrl: shareUrl, myId: myId });
                notifyGoalUpdate(otherId, goal);
              });
            }

            const otherId = getOtherId(goal, myId);

            return env.AI.run(AI_MODEL, buildAIInput(myId, otherId, rawText, goal.facts, goal.tone, goal.thread)).then((aiResult) => {
              const { draft, confidence, aiFacts } = parseAIResult(aiResult);
              const agentDraft = draft || rawText;

              if (confidence === 'low') {
                send({ type: 'clarify', goalId: gid, original: rawText, reason: 'The AI is unsure how to draft this. Please rephrase.' });
                return;
              }

              const proposedFacts = aiFacts ? buildNewProposedFacts(aiFacts, goal.facts) : null;

              // With representativeMode ON, auto-approve replies — push directly to thread
              const sharedMsg = { from: myId, text: agentDraft, original: rawText, shared: true, time: Date.now() };
              goal.thread.push(sharedMsg);
              goal.pendingMessage = null;
              goal.updatedAt = Date.now();

              // Apply proposed facts
              if (proposedFacts) {
                goal.facts = proposedFacts;
              }

              if (allConfirmed(goal.facts) && validateTransition(goal.status, 'agreed')) {
                goal.status = 'agreed';
              } else if (validateTransition(goal.status, 'sent')) {
                goal.status = 'sent';
              }

              if (otherId && goal.to) {
                maybeSetPendingReview(goal, otherId, agentDraft, proposedFacts ? cloneFacts(goal.facts) : null, myId);
              }

              const shareUrl = url.origin + '?goal=' + gid;
              return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
                send({ type: 'outbound-approved', goalId: gid, message: agentDraft, status: goal.status, facts: goal.facts, thread: goal.thread, pendingReview: goal.pendingReview, shareUrl: shareUrl, myId: myId });
                notifyGoalUpdate(otherId, goal);
              });
            }).catch(() => {
              // AI error fallback — push raw text
              const sharedMsg = { from: myId, text: rawText, original: rawText, shared: true, time: Date.now() };
              goal.thread.push(sharedMsg);
              goal.pendingMessage = null;
              goal.updatedAt = Date.now();

              if (allConfirmed(goal.facts) && validateTransition(goal.status, 'agreed')) {
                goal.status = 'agreed';
              } else if (validateTransition(goal.status, 'sent')) {
                goal.status = 'sent';
              }

              if (otherId && goal.to) {
                maybeSetPendingReview(goal, otherId, rawText, null, myId);
              }

              const shareUrl = url.origin + '?goal=' + gid;
              return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
                send({ type: 'outbound-approved', goalId: gid, message: rawText, status: goal.status, facts: goal.facts, thread: goal.thread, pendingReview: goal.pendingReview, shareUrl: shareUrl, myId: myId });
                notifyGoalUpdate(otherId, goal);
              });
            });
          });

          ctx.waitUntil(processAndSave);
        }

        if (msg.type === 'toggle-representative' && myId) {
          const gid = msg.goalId;
          ctx.waitUntil(
            store.get('goal:' + gid, 'json').then((goal) => {
              if (!goal) return;
              if (goal.representativeMode[myId] === undefined) goal.representativeMode[myId] = true;
              goal.representativeMode[myId] = !goal.representativeMode[myId];
              goal.updatedAt = Date.now();
              return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
                send({ type: 'representative-toggled', goalId: gid, representativeMode: goal.representativeMode[myId] });
              });
            })
          );
        }

        if (msg.type === 're-draft' && myId) {
          const gid = msg.goalId;
          const tone = msg.tone;
          ctx.waitUntil(
            store.get('goal:' + gid, 'json').then((goal) => {
              if (!goal || !goal.pendingMessage || goal.pendingMessage.for !== myId) return;
              if (!tone || !TONES.includes(tone)) return;

              goal.tone = tone;
              const pm = goal.pendingMessage;
              const otherId = getOtherId(goal, myId);

              return env.AI.run(AI_MODEL, buildAIInput(myId, otherId, pm.original, goal.facts, tone, goal.thread)).then((aiResult) => {
                const { draft, confidence, aiFacts } = parseAIResult(aiResult);
                if (draft) {
                  pm.draft = draft;
                }
                if (aiFacts) {
                  pm.proposedFacts = buildNewProposedFacts(aiFacts, goal.facts);
                }
                pm.createdAt = Date.now();
                goal.pendingMessage = pm;
                goal.updatedAt = Date.now();
                return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
                  send({ type: 'draft-ready', goalId: gid, pendingMessage: pm });
                });
              }).catch(() => {
                // If AI fails, keep existing draft
                send({ type: 'draft-ready', goalId: gid, pendingMessage: pm });
              });
            })
          );
        }

        if (msg.type === 'approve-outbound' && myId) {
          const gid = msg.goalId;
          const processAndSave = store.get('goal:' + gid, 'json').then((goal) => {
            if (!goal || !goal.pendingMessage) return;
            if (goal.pendingMessage.for !== myId) {
              send({ type: 'error', message: 'Not your draft to approve.' });
              return;
            }

            const pm = goal.pendingMessage;
            const otherId = getOtherId(goal, myId);

            // Persist tone update if provided
            if (msg.tone && TONES.includes(msg.tone)) {
              goal.tone = msg.tone;
            }

            // Apply proposed facts
            if (pm.proposedFacts) {
              goal.facts = pm.proposedFacts;
            }

            // Add to thread: shared message (no original) + private message (with original)
            const sharedMsg = { from: myId, text: pm.draft, original: pm.original, shared: true, time: Date.now() };
            goal.thread.push(sharedMsg);

            goal.pendingMessage = null;
            goal.updatedAt = Date.now();

            if (allConfirmed(goal.facts) && validateTransition(goal.status, 'agreed')) {
              goal.status = 'agreed';
            } else if (validateTransition(goal.status, 'sent')) {
              goal.status = 'sent';
            }

            // If there's another party, set pendingReview for them
            if (otherId && goal.to) {
              maybeSetPendingReview(goal, otherId, pm.draft, pm.proposedFacts ? cloneFacts(goal.facts) : null, myId);
            } else if (otherId && !goal.to) {
              // Peer hasn't opened yet — set review for the non-creator side
              // (will be shown when they open)
              maybeSetPendingReview(goal, otherId, pm.draft, pm.proposedFacts ? cloneFacts(goal.facts) : null, myId);
            }

            return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
              send({ type: 'outbound-approved', goalId: gid, reply: sharedMsg, status: goal.status, facts: goal.facts, pendingReview: goal.pendingReview, shareUrl: url.origin + '?goal=' + gid });
              notifyGoalUpdate(otherId, goal);
            });
          });
          ctx.waitUntil(processAndSave);
        }

        if (msg.type === 'reject-outbound' && myId) {
          const gid = msg.goalId;
          const processAndSave = store.get('goal:' + gid, 'json').then((goal) => {
            if (!goal || !goal.pendingMessage) return;
            if (goal.pendingMessage.for !== myId) return;

            goal.pendingMessage = null;
            goal.updatedAt = Date.now();

            return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
              send({ type: 'outbound-rejected', goalId: gid });
            });
          });
          ctx.waitUntil(processAndSave);
        }

        if (msg.type === 'approve-inbound' && myId) {
          const gid = msg.goalId;
          const processAndSave = store.get('goal:' + gid, 'json').then((goal) => {
            if (!goal || !goal.pendingReview) return;
            if (goal.pendingReview.for !== myId) {
              send({ type: 'error', message: 'Not your turn to review.' });
              return;
            }

            // Confirm any proposed facts from the other party
            if (goal.pendingReview.facts) {
              goal.facts = confirmFacts(goal.facts, goal.pendingReview.facts);
            }

            goal.pendingReview = null;
            goal.updatedAt = Date.now();

            if (allConfirmed(goal.facts) && validateTransition(goal.status, 'agreed')) {
              goal.status = 'agreed';
            } else if (validateTransition(goal.status, 'sent')) {
              goal.status = 'sent';
            }

            store.put('goal:' + gid, JSON.stringify(goal));
            send({ type: 'inbound-result', goalId: gid, approved: true, status: goal.status, facts: goal.facts });
          });
          ctx.waitUntil(processAndSave);
        }

        if (msg.type === 'reject-inbound' && myId) {
          const gid = msg.goalId;
          const processAndSave = store.get('goal:' + gid, 'json').then((goal) => {
            if (!goal || !goal.pendingReview) return;
            if (goal.pendingReview.for !== myId) {
              send({ type: 'error', message: 'Not your turn to reject.' });
              return;
            }

            goal.pendingReview = null;
            goal.updatedAt = Date.now();

            if (validateTransition(goal.status, 'sent')) {
              goal.status = 'sent';
            }

            store.put('goal:' + gid, JSON.stringify(goal));
            send({ type: 'inbound-result', goalId: gid, approved: false, status: goal.status, facts: goal.facts });
          });
          ctx.waitUntil(processAndSave);
        }

        if (msg.type === 'delete-goal' && myId) {
          const gid = msg.goalId;
          const p = store.delete('goal:' + gid).then(() => {
            return store.get('threads:' + myId, 'json').then((t) => {
              if (t) {
                const filtered = t.filter((e) => e.goalId !== gid);
                return store.put('threads:' + myId, JSON.stringify(filtered));
              }
            });
          }).then(() => {
            send({ type: 'goal-deleted', goalId: gid });
          });
          ctx.waitUntil(p);
        }

        if (msg.type === 'delete-message' && myId) {
          const gid = msg.goalId;
          const idx = msg.index;
          ctx.waitUntil(
            store.get('goal:' + gid, 'json').then((goal) => {
              if (!goal || !goal.thread || idx < 0 || idx >= goal.thread.length) return;
              // Only allow deleting your own messages
              if (goal.thread[idx].from !== myId) return;
              goal.thread.splice(idx, 1);
              goal.updatedAt = Date.now();
              return store.put('goal:' + gid, JSON.stringify(goal)).then(() => {
                send({ type: 'message-deleted', goalId: gid, index: idx, thread: goal.thread });
              });
            })
          );
        }

        if (msg.type === 'clear-goals' && myId) {
          const p = store.get('threads:' + myId, 'json').then((t) => {
            if (t) {
              const deletes = t.map((e) => store.delete('goal:' + e.goalId));
              return Promise.all(deletes).then(() => {
                return store.put('threads:' + myId, JSON.stringify([]));
              });
            }
          }).then(() => {
            send({ type: 'goals-cleared' });
          });
          ctx.waitUntil(p);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response(HTML, { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } });
  }
};

function hex(n) {
  return [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relay</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;justify-content:center;padding:0}
.wrap{max-width:500px;width:100%;display:flex;flex-direction:column;min-height:100vh}
.hdr{text-align:center;padding:16px 16px 8px;cursor:pointer}
.hdr h1{font-size:20px}
.hdr p{color:#666;font-size:11px}
.id{background:#111;padding:8px 16px;font-family:monospace;font-size:12px;margin:0 16px 12px;border-radius:6px}
.id span{color:#00ff88}
.sec{background:#111;padding:12px;border-radius:8px;margin:0 16px 10px}
.sec h3{font-size:11px;color:#555;margin-bottom:8px;text-transform:uppercase}
.btn{background:#00ff88;color:#000;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;width:100%}
.btn:hover{background:#00cc6a}
.btn.sm{width:auto;padding:6px 12px;font-size:12px}
.btn.outline{background:transparent;border:1px solid #00ff88;color:#00ff88}
.btn.danger{background:#ff4444}
.btn.danger:hover{background:#cc0000}
.inp{width:100%;padding:10px;border:none;border-radius:6px;background:#0a0a0a;color:#fff;font-size:13px;margin-bottom:8px;font-family:inherit}
.goal-item{background:#0a0a0a;padding:10px;border-radius:6px;margin-bottom:8px;cursor:pointer;border:1px solid #333}
.goal-item:hover{border-color:#00ff88}
.gi-head{display:flex;justify-content:space-between;margin-bottom:4px;align-items:center}
.gi-share{cursor:pointer;font-size:13px;padding:0 4px;opacity:0.6}
.gi-share:hover{opacity:1}
.gi-del{cursor:pointer;color:#ff4444;font-size:16px;line-height:1;padding:0 4px}
.gi-del:hover{color:#ff0000}
.gi-msg{color:#999;font-size:12px}
.gi-status{font-size:10px;padding:2px 6px;border-radius:10px}
.gi-status.drafting{background:#333;color:#888}
.gi-status.sent{background:#ffaa0033;color:#ffaa00}
.gi-status.agreed{background:#00ff8833;color:#00ff88}
.gi-status.completed{background:#00ff8833;color:#00ff88}
.gi-status.cancelled{background:#333;color:#555}
.clear-all{font-size:10px;color:#ff4444;cursor:pointer;font-weight:400;text-transform:none;float:right}
.clear-all:hover{color:#ff0000}
.nf{position:fixed;top:16px;right:16px;background:#00ff88;color:#000;padding:10px 16px;border-radius:8px;font-weight:600;font-size:13px;animation:sl .3s ease;max-width:280px;z-index:100;display:none}
@keyframes sl{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.bot{position:fixed;bottom:8px;left:16px;font-size:11px;color:#333}
.view{display:none;flex:1;flex-direction:column}
.view.active{display:flex}
.back{background:none;border:none;color:#00ff88;cursor:pointer;font-size:13px;padding:0;margin-bottom:8px;text-align:left}
.new-convo-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:28px;background:#00ff88;color:#000;font-size:28px;border:none;display:flex;align-items:center;justify-content:center;z-index:100;cursor:pointer;box-shadow:0 4px 12px rgba(0,255,136,0.4);font-weight:bold}
.new-convo-fab:active{transform:scale(0.95)}
/* --- Convo layout --- */
.convo-header{padding:0 16px;margin-bottom:8px}
.convo-header h2{font-size:16px}
.convo-header .status-row{display:flex;align-items:center;gap:8px;margin-top:4px}
.convo-header .status-badge{font-size:10px;padding:2px 8px;border-radius:10px;text-transform:capitalize}
.convo-header .status-badge.drafting{background:#333;color:#888}
.convo-header .status-badge.sent{background:#ffaa0033;color:#ffaa00}
.convo-header .status-badge.agreed,.convo-header .status-badge.completed{background:#00ff8833;color:#00ff88}
.convo-header .status-badge.cancelled{background:#333;color:#555}
.convo-header .progress-bar{height:4px;background:#222;border-radius:2px;overflow:hidden;flex:1;max-width:120px}
.convo-header .progress-bar .fill{height:100%;background:#00ff88;border-radius:2px;transition:width .3s}
.agreement-section{background:#0a0a0a;margin:0 16px 8px;padding:10px 12px;border-radius:6px;border:1px solid #222}
.agreement-section h3{font-size:10px;color:#555;text-transform:uppercase;margin-bottom:6px}
.agreement-facts{display:flex;flex-wrap:wrap;gap:4px}
.fact-chip{display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600}
.fact-chip.agreed{background:#003322;color:#00ff88}
.fact-chip.proposed{background:#332200;color:#ffaa00}
.fact-chip.unknown{background:#111;color:#555}
/* --- Tab bar --- */
.tab-bar{display:flex;margin:0 16px;border-bottom:1px solid #222;gap:0}
.tab{flex:1;text-align:center;padding:8px 0;font-size:12px;color:#555;cursor:pointer;border-bottom:2px solid transparent}
.tab.active{color:#00ff88;border-bottom-color:#00ff88}
/* --- Thread area (scrollable) --- */
.thread-wrap{flex:1;overflow-y:auto;padding:8px 16px}
.thread{max-height:100%}
.msg{padding:8px 10px;border-radius:6px;margin-bottom:6px;font-size:13px;max-width:90%}
.msg.you{background:#003322;margin-left:auto;text-align:right}
.msg.them{background:#1a1a1a;margin-right:auto}
.msg.rep{background:#0d2137;margin-left:auto;text-align:right;border:1px solid #0055aa}
.msg.them{background:#1a0d0d;margin-right:auto;text-align:left;border:1px solid #aa3333}
.msg-label{font-size:10px;color:#888;margin-bottom:2px;font-weight:600}
.msg-label.mine{color:#4488ff}
.msg-label.theirs{color:#ff6644}
.msg-del{float:right;cursor:pointer;color:#ff4444;font-size:14px;line-height:1;padding:2px 6px;margin:-2px -2px 0 0;opacity:0.6}
.msg-del:hover,.msg-del:active{opacity:1}
.msg-original{font-size:11px;color:#666;font-style:italic;margin-top:4px;border-top:1px solid #333;padding-top:4px}
/* --- Input row --- */
.input-area{padding:8px 16px;border-top:1px solid #222;background:#0a0a0a}
.input-area .reply-row{display:flex;gap:8px}
.input-area .reply-row .inp{flex:1;margin-bottom:0;background:#111}
.input-area .representative-mode-row{margin-top:6px;display:flex;justify-content:flex-end}
.input-area .representative-mode-btn{font-size:11px;color:#888;cursor:pointer;padding:2px 8px;border-radius:4px;border:1px solid #333;transition:all .2s;user-select:none}
.input-area .representative-mode-btn.active{color:#00ff88;border-color:#00ff88;background:#003322}
/* --- Approval card --- */
.approval-card{background:#1a1a1a;margin:0 16px 10px;padding:12px;border-radius:8px;border:1px solid #00ff8833;display:none}
.approval-card h4{font-size:11px;color:#00ff88;text-transform:uppercase;margin-bottom:6px}
.approval-card .draft-text{background:#0a0a0a;padding:10px;border-radius:6px;font-size:13px;margin-bottom:8px;color:#ccc;border-left:2px solid #00ff88}
.approval-card .draft-facts{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.approval-card .tone-row{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap}
.approval-card .tone-btn{flex:1;min-width:60px;padding:4px 6px;font-size:10px;border-radius:4px;border:1px solid #333;background:#0a0a0a;color:#888;cursor:pointer;transition:all .2s;text-align:center}
.approval-card .tone-btn.active{border-color:#00ff88;color:#00ff88;background:#003322}
.approval-card .approval-btns{display:flex;gap:8px}
.approval-card .approval-btns .btn{flex:1}
/* --- Review card (inbound) --- */
.review-card{background:#1a0000;margin:0 16px 10px;padding:12px;border-radius:8px;border:1px solid #ff444433;display:none}
.review-card h4{font-size:11px;color:#ff4444;text-transform:uppercase;margin-bottom:6px}
.review-card .review-text{background:#0a0a0a;padding:10px;border-radius:6px;font-size:13px;margin-bottom:8px;color:#ccc;border-left:2px solid #ff4444}
.review-card .review-facts{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.review-card .review-btns{display:flex;gap:8px}
.review-card .review-btns .btn{flex:1}
/* --- New Convo modal --- */
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:200;display:none;align-items:center;justify-content:center;padding:16px}
.modal{background:#111;padding:16px;border-radius:8px;width:100%;max-width:460px}
.modal h3{font-size:14px;margin-bottom:8px}
.modal textarea{width:100%;padding:10px;border:none;border-radius:6px;background:#0a0a0a;color:#fff;font-size:13px;margin-bottom:8px;resize:none;font-family:inherit;min-height:80px}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr" onclick="event.stopPropagation();goHome()"><h1>Relay</h1><p>The conversations you avoid often matter the most. Relay helps you have them.</p></div>
  <div class="id">Private: <span id="aid">...</span></div>

  <!-- Home -->
  <div class="view active" id="v-home">
    <div id="need-attention" style="display:none" class="sec">
      <h3>Needs Attention</h3>
      <div id="attention-list"></div>
    </div>
    <div class="sec" style="padding-bottom:70px"><h3>Active Conversations <span class="clear-all" onclick="clearAll()">Clear all</span></h3><div id="goal-list">No conversations yet</div></div>
    <div class="new-convo-fab" onclick="showNewConvo()">+</div>
  </div>

  <!-- Conversation -->
  <div class="view" id="v-convo">
    <div style="padding:0 16px 0"><button class="back" onclick="goHome()">&#8592; Home</button></div>

    <!-- Share banner (shown after first approval) -->
    <div id="share-banner" style="display:none;margin:0 16px 8px;padding:10px 12px;background:#003322;border-radius:6px;border:1px solid #00ff88">
      <div style="font-size:11px;color:#00ff88;margin-bottom:6px">Share this link with the other person:</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="share-url-input" readonly style="flex:1;background:#0a0a0a;border:none;color:#00ff88;font-family:monospace;font-size:11px;padding:6px;border-radius:4px">
        <button class="btn sm" style="width:auto;padding:4px 10px;font-size:10px" onclick="var i=document.getElementById('share-url-input');i.select();document.execCommand('copy');nf('Copied!')">Copy</button>
      </div>
    </div>

    <div class="convo-header" id="convo-header">
      <h2 id="convo-title">Conversation</h2>
      <div class="status-row">
        <span class="status-badge" id="convo-status">drafting</span>
        <div class="progress-bar"><div class="fill" id="convo-progress" style="width:0%"></div></div>
        <span id="convo-health" style="font-size:10px;color:#555"></span>
      </div>
    </div>

    <div class="agreement-section" id="agreement-section">
      <h3>Agreement</h3>
      <div class="agreement-facts" id="agreement-facts"></div>
    </div>

    <!-- Approval Card (outbound draft awaiting your approval) -->
    <div class="approval-card" id="approval-card">
      <h4>Your Representative Has Drafted</h4>
      <div class="draft-text" id="draft-text"></div>
      <div class="draft-facts" id="draft-facts"></div>
      <div class="tone-row" id="tone-row">
        <button class="tone-btn" data-tone="professional" onclick="selectTone('professional')">Professional</button>
        <button class="tone-btn" data-tone="friendly" onclick="selectTone('friendly')">Friendly</button>
        <button class="tone-btn" data-tone="direct" onclick="selectTone('direct')">Direct</button>
        <button class="tone-btn" data-tone="casual" onclick="selectTone('casual')">Casual</button>
      </div>
      <div class="approval-btns"><button class="btn" onclick="approveOutbound()">Approve &amp; Send</button><button class="btn outline" onclick="rejectOutbound()">Revise</button></div>
    </div>

    <!-- Review Card (inbound proposal from peer) -->
    <div class="review-card" id="review-card">
      <h4>Proposal Received</h4>
      <div class="review-text" id="review-text"></div>
      <div class="review-facts" id="review-facts"></div>
      <div class="review-btns"><button class="btn" onclick="approveInbound()">Accept</button><button class="btn outline" onclick="rejectInbound()">Suggest Changes</button></div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <div class="tab active" data-tab="private" onclick="switchTab('private')">🔒 Private</div>
      <div class="tab" data-tab="shared" onclick="switchTab('shared')">🌍 Shared</div>
    </div>

    <div class="thread-wrap" id="thread-wrap">
      <div class="thread" id="thread-private"></div>
      <div class="thread" id="thread-shared" style="display:none"></div>
    </div>

    <div class="input-area" id="input-area">
      <div class="reply-row"><input class="inp" id="reply-input" placeholder="Tell your representative what you want..."><button class="btn sm" onclick="draftReply()">Draft</button></div>
      <div class="representative-mode-row"><span id="representative-mode-toggle" class="representative-mode-btn" onclick="toggleRepresentativeMode()">✨ Representative ON</span></div>
    </div>
  </div>
</div>

<div class="nf" id="nf"></div>
<div class="bot" id="bot">connecting...</div>

<div class="modal-overlay" id="modal-overlay" onclick="if(event.target===this)hideNewConvo()">
  <div class="modal">
    <div class="new-convo-tabs" style="display:flex;gap:0;border-bottom:1px solid #222;margin-bottom:10px">
      <div class="new-convo-tab active" data-nctab="share" onclick="switchNewConvoTab('share')" style="flex:1;text-align:center;padding:8px 0;font-size:12px;color:#555;cursor:pointer;border-bottom:2px solid #00ff88">🔗 Share Link</div>
      <div class="new-convo-tab" data-nctab="contact" onclick="switchNewConvoTab('contact')" style="flex:1;text-align:center;padding:8px 0;font-size:12px;color:#555;cursor:pointer;border-bottom:2px solid transparent">👤 Contact</div>
    </div>
    <div id="new-convo-share">
      <h3>What conversation do you want help with?</h3>
      <textarea id="new-convo-msg" placeholder="I need to ask my friend to repay ₹5000..."></textarea>
      <button class="btn" id="create-goal-btn" onclick="createGoal()">Generate Link</button>
    </div>
    <div id="new-convo-contact" style="display:none">
      <h3>Select a contact</h3>
      <div id="contact-list" style="margin-bottom:10px"></div>
      <div id="contact-convo-area" style="display:none">
        <textarea id="contact-convo-msg" placeholder="What do you want to discuss?" style="width:100%;padding:10px;border:none;border-radius:6px;background:#0a0a0a;color:#fff;font-size:13px;margin-bottom:8px;resize:none;font-family:inherit;min-height:60px"></textarea>
        <button class="btn" onclick="createGoalWithContact()">Send</button>
      </div>
    </div>
    <button class="btn" style="background:#333;color:#888;margin-top:10px" onclick="hideNewConvo()">Cancel</button>
  </div>
</div>

<div class="modal-overlay" id="name-overlay" style="display:none">
  <div class="modal">
    <h3>Welcome! What should we call you?</h3>
    <p style="font-size:12px;color:#888;margin-bottom:10px">Your name will be visible to people you message.</p>
    <input class="inp" id="name-input" placeholder="Enter your name..." style="margin-bottom:8px" autocomplete="off">
    <button class="btn" onclick="saveName()">Join</button>
  </div>
</div>

<script>
var ws,me,currentGoal=null,pollTimer=null,pollInFlight=false,pollCount=0,currentPendingMsg=null,currentPendingReview=null,currentTab='private',currentTone='professional',currentRepresentativeMode=true,createGoalTimer=null;
var goalParam=new URLSearchParams(location.search).get('goal');

function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll('.tab').forEach(function(el){el.classList.toggle('active',el.dataset.tab===tab)});
  document.getElementById('thread-private').style.display=tab==='private'?'block':'none';
  document.getElementById('thread-shared').style.display=tab==='shared'?'block':'none';
  document.getElementById('input-area').style.display=tab==='private'?'block':'none';
}

function clearAll(){
  if(confirm('Delete all conversations?')){
    ws.send(JSON.stringify({type:'clear-goals'}));
  }
}

function showNewConvo(){
  document.getElementById('modal-overlay').style.display='flex';
  document.getElementById('new-convo-msg').focus();
  renderContactList();
}
function hideNewConvo(){
  document.getElementById('modal-overlay').style.display='none';
  document.getElementById('new-convo-msg').value='';
  document.getElementById('contact-convo-msg').value='';
  document.getElementById('contact-convo-area').style.display='none';
  // Reset to share tab
  switchNewConvoTab('share');
}

function switchNewConvoTab(tab){
  document.querySelectorAll('.new-convo-tab').forEach(function(el){
    el.classList.toggle('active',el.dataset.nctab===tab);
    el.style.borderBottomColor=el.dataset.nctab===tab?'#00ff88':'transparent';
  });
  document.getElementById('new-convo-share').style.display=tab==='share'?'block':'none';
  document.getElementById('new-convo-contact').style.display=tab==='contact'?'block':'none';
  if(tab==='contact') renderContactList();
}

function renderContactList(){
  var el=document.getElementById('contact-list');
  try{
    var contacts=JSON.parse(localStorage.getItem('contacts')||'{}');
    var keys=Object.keys(contacts);
    if(!keys.length){
      el.innerHTML='<span style="color:#555;font-size:12px">No contacts yet. Share a link to start a conversation.</span>';
      return;
    }
    el.innerHTML='';
    keys.forEach(function(id){
      var c=contacts[id];
      el.innerHTML+='<div class="contact-item" data-cid="'+id+'" onclick="selectContact(\\''+id+'\\')" style="padding:8px 10px;border-radius:6px;background:#0a0a0a;margin-bottom:4px;cursor:pointer;border:1px solid #222">'+c.name+'<span style="float:right;font-size:10px;color:#555">chat</span></div>';
    });
  } catch(e){
    el.innerHTML='<span style="color:#555;font-size:12px">No contacts yet.</span>';
  }
}

var selectedContact=null;
function selectContact(id){
  selectedContact=id;
  document.getElementById('contact-convo-area').style.display='block';
  document.getElementById('contact-convo-msg').focus();
  // Highlight selected
  document.querySelectorAll('.contact-item').forEach(function(el){
    el.style.borderColor=el.dataset.cid===id?'#00ff88':'#222';
  });
}

function createGoalWithContact(){
  var text=document.getElementById('contact-convo-msg').value.trim();
  if(!text||!selectedContact) return;
  // We need the actual ID from contacts
  var contacts=JSON.parse(localStorage.getItem('contacts')||'{}');
  var contact=contacts[selectedContact];
  if(!contact) return;
  ws.send(JSON.stringify({type:'create-goal',message:text,targetId:selectedContact}));
  hideNewConvo();
}

function go(){
  document.getElementById('bot').textContent='connecting...';
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
  ws.onopen=function(){
    ws.send(JSON.stringify({type:'init',agentId:localStorage.getItem('aid')}));
  };
  ws.onclose=function(){
    document.getElementById('bot').textContent='disconnected';
    // Auto-reconnect after 3 seconds
    setTimeout(function(){go();},3000);
  };
  ws.onerror=function(){document.getElementById('bot').textContent='error';resetCreateGoalButton();};
  ws.onmessage=function(e){
    var m=JSON.parse(e.data);
    if(m.type==='welcome'){
      me=m.id;
      localStorage.setItem('aid',m.id);
      document.getElementById('bot').textContent='live';
      document.getElementById('aid').textContent=m.id;
      if(m.contacts) localStorage.setItem('contacts',JSON.stringify(m.contacts));
      var myName=(localStorage.getItem('name')||'').trim();
      if(!myName){
        document.getElementById('name-overlay').style.display='flex';
        document.getElementById('name-input').focus();
        renderGoals(m.threads||[]);
        return;
      }
      // Sync name to server if we have one
      ws.send(JSON.stringify({type:'set-name',name:myName}));
      if(goalParam){
        ws.send(JSON.stringify({type:'open-goal',goalId:goalParam}));
      } else {
        renderGoals(m.threads||[]);
      }
    }

    if(m.type==='name-set'){
      nf('Welcome, '+m.name+'!');
    }
    if(m.type==='goal-created'){
      resetCreateGoalButton();
      currentGoal=m.goalId;
      currentPendingMsg=m.pendingMessage||null;
      currentTone=m.tone||'professional';
      pollCount=0;
      startPoll(m.goalId);
      addGoalToList(m.goalId, m.message, m.status||'drafting');
      showConvo(m.goalId, 'private');
      hideNewConvo();
      renderThreads([],m.myId,m.from);
      renderAgreement(m.facts);
      renderApprovalCard(m.pendingMessage,me);
      updateConvoHeader(m.message,m.status,m.facts);
      renderToneSelector(currentTone);
    }
    if(m.type==='goal-loaded'){
      currentGoal=m.goalId;
      currentPendingMsg=m.pendingMessage||null;
      currentPendingReview=m.pendingReview||null;
      currentTone=m.tone||'professional';
      currentRepresentativeMode=m.representativeMode!==false;
      showConvo(m.goalId, 'private');
      renderThreads(m.thread,m.myId,m.from);
      renderAgreement(m.facts);
      renderApprovalCard(m.pendingMessage,me);
      renderReviewCard(m.pendingReview,me);
      updateConvoHeader(m.message,m.status,m.facts);
      renderToneSelector(currentTone);
      renderRepresentativeMode(currentRepresentativeMode);
      pollCount=m.thread.length;
      startPoll(m.goalId);
      if(!document.querySelector('[data-gid="'+m.goalId+'"]')){
        addGoalToList(m.goalId, m.message, m.status||'drafting');
      } else {
        updateGoalStatus(m.goalId, m.status);
      }
    }
    if(m.type==='draft-ready'){
      currentPendingMsg=m.pendingMessage||null;
      renderApprovalCard(m.pendingMessage,me);
      var tab=currentTab;
      var el=document.getElementById('thread-'+tab);
      var composing=el.querySelector('.msg.rep:last-child');
      if(composing&&composing.textContent.includes('⏳')){
        composing.remove();
      }
      updateAttentionList();
    }
    if(m.type==='outbound-approved'){
      var tab=currentTab;
      var replying=currentPendingMsg;
      currentPendingMsg=null;
      renderApprovalCard(null,me);
      updateAttentionList();
      if(m.status) updateGoalStatus(currentGoal,m.status);
      if(m.facts){renderAgreement(m.facts);updateConvoHeader(null,m.status,m.facts);}
      if(m.pendingReview){currentPendingReview=m.pendingReview;renderReviewCard(m.pendingReview,me);}

      if(m.thread){
        // Auto-approve path (reply AI) — full thread provided, re-render
        renderThreads(m.thread,m.myId,m.from);
        pollCount=m.thread.length;
      } else if(m.reply){
        // Approve-outbound path (single message)
        var privEl=document.getElementById('thread-private');
        var sharedEl=document.getElementById('thread-shared');
        var myLabel='You';
        var sharedLabel=m.reply.from===m.myId?'You':'Them';
        if(replying){
          privEl.innerHTML+='<div class="msg rep"><div class="msg-label mine">'+myLabel+'</div>'+m.reply.text+'<div class="msg-original">You said: &ldquo;'+replying.original+'&rdquo;</div></div>';
        } else {
          privEl.innerHTML+='<div class="msg rep"><div class="msg-label mine">'+myLabel+'</div>'+m.reply.text+'</div>';
        }
        sharedEl.innerHTML+='<div class="msg them"><div class="msg-label theirs">'+sharedLabel+'</div>'+m.reply.text+'</div>';
        pollCount=privEl.querySelectorAll('.msg').length;
      }

      document.getElementById('thread-wrap').scrollTop=99999;
      // Show share link (only auto-copy on first message)
      if(m.shareUrl){
        var banner=document.getElementById('share-banner');
        document.getElementById('share-url-input').value=m.shareUrl;
        if(banner.style.display!=='block'){
          banner.style.display='block';
          var inp=document.createElement('input');
          inp.value=m.shareUrl;
          document.body.appendChild(inp);
          inp.select();
          document.execCommand('copy');
          inp.remove();
          nf('Link copied!');
        }
      }
      if(m.status==='agreed') nf('All terms agreed!');
    }
    if(m.type==='error'){
      if(m.action==='create-goal') resetCreateGoalButton();
      nf(m.message||'Something went wrong. Please try again.');
    }
    if(m.type==='outbound-rejected'){
      currentPendingMsg=null;
      renderApprovalCard(null,me);
      updateAttentionList();
      nf('Draft discarded');
    }
    if(m.type==='inbound-result'){
      currentPendingReview=null;
      renderReviewCard(null,me);
      updateAttentionList();
      if(m.status) updateGoalStatus(currentGoal,m.status);
      if(m.facts){renderAgreement(m.facts);updateConvoHeader(null,m.status,m.facts);}
      nf(m.approved?'Proposal accepted':'Proposal declined');
    }
    if(m.type==='representative-toggled'){
      currentRepresentativeMode=m.representativeMode;
      renderRepresentativeMode(m.representativeMode);
    }
    if(m.type==='new-data'){
      if(currentGoal===m.goalId && m.thread){
        currentPendingMsg=m.pendingMessage||null;
        currentPendingReview=m.pendingReview||null;
        if(m.status) updateGoalStatus(m.goalId,m.status);
        renderThreads(m.thread,me);
        renderApprovalCard(currentPendingMsg,me);
        renderReviewCard(currentPendingReview,me);
        if(m.facts){renderAgreement(m.facts);updateConvoHeader(null,m.status,m.facts);}
        if(m.tone) currentTone=m.tone;
        if(m.representativeMode!==undefined) renderRepresentativeMode(m.representativeMode);
        pollCount=m.thread.length;
        updateAttentionList();
      } else if(currentGoal===m.goalId && pollTimer){
        pollNow();
      } else {
        reloadThreads();
      }
    }
    if(m.type==='goal-deleted'){
      var el=document.querySelector('[data-gid="'+m.goalId+'"]');
      if(el)el.remove();
      var gl=document.getElementById('goal-list');
      if(!gl.querySelector('.goal-item'))gl.innerHTML='No conversations yet';
      if(currentGoal===m.goalId){currentGoal=null;stopPoll();goHome();}
    }
    if(m.type==='goals-cleared'){
      renderGoals([]);
      currentGoal=null;stopPoll();goHome();
      if(window.history&&window.history.replaceState) window.history.replaceState(null,'',window.location.origin+window.location.pathname);
    }
    if(m.type==='message-deleted'){
      renderThreads(m.thread,me,m.from);
      pollCount=m.thread.length;
    }
  };
}

function showConvo(gid,tab){
  currentGoal=gid;
  switchTab(tab||'private');
  showView('convo');
}

function goHome(){
  stopPoll();
  currentGoal=null;
  currentPendingMsg=null;
  currentPendingReview=null;
  renderApprovalCard(null,me);
  renderReviewCard(null,me);
  document.getElementById('share-banner').style.display='none';
  showView('home');
  if(window.history&&window.history.replaceState) window.history.replaceState(null,'',window.location.origin+window.location.pathname);
  reloadThreads();
}

function reloadThreads(){
  if(!me)return;
  fetch('/api/threads?for='+me).then(function(r){return r.json()}).then(function(d){
    renderGoals(d.threads||[]);
  }).catch(function(){});
}

function saveName(){
  var name=document.getElementById('name-input').value.trim();
  if(!name) return;
  localStorage.setItem('name',name);
  document.getElementById('name-overlay').style.display='none';
  ws.send(JSON.stringify({type:'set-name',name:name}));
  if(goalParam){
    ws.send(JSON.stringify({type:'open-goal',goalId:goalParam}));
  } else {
    // Re-fetch threads via API (skip re-init to avoid welcome loop)
    fetch('/api/threads?for='+me).then(function(r){return r.json()}).then(function(d){
      renderGoals(d.threads||[]);
    }).catch(function(){
      renderGoals([]);
    });
  }
}

function updateConvoHeader(title,status,facts){
  if(title) document.getElementById('convo-title').textContent=title;
  if(status){
    var el=document.getElementById('convo-status');
    var labels={drafting:'Preparing...',sent:'Waiting for a response',agreed:'Agreement reached',completed:'Conversation finished',cancelled:'Cancelled'};
    el.textContent=labels[status]||status;
    el.className='status-badge '+status;
  }
  if(facts){
    var total=0,agreed=0;
    Object.keys(facts).forEach(function(s){if(facts[s].value&&facts[s].status!=='unknown'){total++;if(facts[s].status==='agreed')agreed++;}});
    var pct=total>0?Math.round(agreed/total*100):0;
    document.getElementById('convo-progress').style.width=pct+'%';
    document.getElementById('convo-health').textContent=agreed+'/'+total+' agreed';
  }
}

function renderAgreement(facts){
  var el=document.getElementById('agreement-facts');
  if(!facts||!Object.values(facts).some(function(f){return f.value;})){
    el.innerHTML='<span style="color:#555;font-size:11px">Nothing agreed yet.</span>';
    return;
  }
  var labels={date:'📅 Date',time:'⏰ Time',location:'📍 Location'};
  var h='';
  Object.keys(facts).forEach(function(s){
    var f=facts[s];
    if(f&&f.value) h+='<span class="fact-chip '+f.status+'">'+(labels[s]||s)+': '+f.value+' ('+f.status+')</span>';
    else h+='<span class="fact-chip unknown">'+(labels[s]||s)+': Awaiting</span>';
  });
  el.innerHTML=h;
}

function renderThreads(thread,myId,creatorId){
  renderThreadTo('thread-private',thread,myId,true);
  renderThreadTo('thread-shared',thread,myId,false);
}

function renderThreadTo(id,thread,myId,showPrivate){
  var el=document.getElementById(id);
  var html='';
  for(var i=0;i<thread.length;i++){
    var r=thread[i];
    var isMine=r.from===myId;
    var label=isMine?'You':'Them';
    var cls=isMine?'rep':'them';
    var labelCls=isMine?'mine':'theirs';
    var orig='';
    if(showPrivate&&r.original&&r.original!==r.text&&r.from===myId){
      orig='<div class="msg-original">You said: &ldquo;'+r.original+'&rdquo;</div>';
    }
    html+='<div class="msg '+cls+'" data-idx="'+i+'"><div class="msg-label '+labelCls+'">'+label+'</div>'+r.text+orig+(isMine?'<span class="msg-del" onclick="event.stopPropagation();deleteMessage('+i+')">&times;</span>':'')+'</div>';
  }
  el.innerHTML=html;
  el.parentElement.scrollTop=99999;
}

function renderApprovalCard(pm,uid){
  var card=document.getElementById('approval-card');
  if(!pm||pm.for!==uid){
    card.style.display='none';
    return;
  }
  card.style.display='block';
  document.getElementById('draft-text').textContent=pm.draft;
  var factsEl=document.getElementById('draft-facts');
  if(pm.proposedFacts&&Object.values(pm.proposedFacts).some(function(f){return f.value;})){
    var h='';
    Object.keys(pm.proposedFacts).forEach(function(s){
      var f=pm.proposedFacts[s];
      if(f&&f.value) h+='<span class="fact-chip proposed">'+s+': '+f.value+'</span>';
    });
    factsEl.innerHTML=h;
  } else {
    factsEl.innerHTML='';
  }
}

function renderReviewCard(pr,uid){
  var card=document.getElementById('review-card');
  if(!pr||pr.for!==uid){
    card.style.display='none';
    return;
  }
  card.style.display='block';
  document.getElementById('review-text').textContent=pr.message;
  var factsEl=document.getElementById('review-facts');
  if(pr.facts&&Object.values(pr.facts).some(function(f){return f.value;})){
    var h='';
    Object.keys(pr.facts).forEach(function(s){
      var f=pr.facts[s];
      if(f&&f.value) h+='<span class="fact-chip proposed">'+s+': '+f.value+'</span>';
    });
    factsEl.innerHTML=h;
  } else {
    factsEl.innerHTML='';
  }
}

function approveOutbound(){
  if(currentGoal) ws.send(JSON.stringify({type:'approve-outbound',goalId:currentGoal,tone:currentTone}));
}
function deleteMessage(idx){
  if(currentGoal && confirm('Delete this message?')) ws.send(JSON.stringify({type:'delete-message',goalId:currentGoal,index:idx}));
}
function rejectOutbound(){
  if(currentGoal) ws.send(JSON.stringify({type:'reject-outbound',goalId:currentGoal}));
}
function approveInbound(){
  if(currentGoal) ws.send(JSON.stringify({type:'approve-inbound',goalId:currentGoal}));
}
function rejectInbound(){
  if(currentGoal) ws.send(JSON.stringify({type:'reject-inbound',goalId:currentGoal}));
}

function createGoal(){
  var msg=document.getElementById('new-convo-msg').value.trim();
  if(!msg)return;
  if(!ws||ws.readyState!==WebSocket.OPEN){nf('Still connecting. Please try again.');return;}
  var btn=document.getElementById('create-goal-btn');
  if(btn.disabled)return;
  btn.disabled=true;
  btn.textContent='Generating...';
  clearTimeout(createGoalTimer);
  createGoalTimer=setTimeout(function(){
    resetCreateGoalButton();
    nf('Generation took too long. Please try again.');
  },20000);
  ws.send(JSON.stringify({type:'create-goal',message:msg,tone:currentTone||'professional'}));
}

function resetCreateGoalButton(){
  clearTimeout(createGoalTimer);
  createGoalTimer=null;
  var btn=document.getElementById('create-goal-btn');
  if(!btn)return;
  btn.disabled=false;
  btn.textContent='Generate Link';
}

function draftReply(){
  var i=document.getElementById('reply-input');
  var t=i.value.trim();
  if(t&&currentGoal){
    var el=document.getElementById('thread-private');
    el.innerHTML+='<div class="msg rep"><div class="msg-label mine">You</div>⏳ Drafting...</div>';
    i.value='';
    ws.send(JSON.stringify({type:'draft-reply',goalId:currentGoal,text:t}));
  }
}

function renderGoals(threads){
  var el=document.getElementById('goal-list');
  if(!threads||!threads.length){el.innerHTML='No conversations yet';return;}
  var seen={};var unique=[];
  for(var i=0;i<threads.length;i++){
    if(!seen[threads[i].goalId]){seen[threads[i].goalId]=1;unique.push(threads[i]);}
  }
  var html='';
  for(var i=0;i<unique.length;i++){
    var t=unique[i];
    html+=renderGoalItem(t.goalId, t.message, t.status||'drafting');
  }
  el.innerHTML=html;
  updateAttentionList();
}

function renderGoalItem(gid, msg, status){
  var labels={drafting:'Preparing...',sent:'Waiting for a response',agreed:'Agreement reached',completed:'Conversation finished',cancelled:'Cancelled'};
  return '<div class="goal-item" data-gid="'+gid+'"><div class="gi-head"><span>'+gid+'</span><span class="gi-status '+status+'">'+(labels[status]||status)+'</span><span class="gi-share" data-gid="'+gid+'">&#128279;</span><span class="gi-del" data-gid="'+gid+'">&times;</span></div><div class="gi-msg">'+(msg||'').substring(0,60)+'</div></div>';
}

function addGoalToList(gid, msg, status){
  var gl=document.getElementById('goal-list');
  if(gl.textContent==='No conversations yet')gl.innerHTML='';
  var existing=gl.querySelector('[data-gid="'+gid+'"]');
  if(existing)return;
  gl.innerHTML=renderGoalItem(gid,msg,status)+gl.innerHTML;
  updateAttentionList();
}

function updateGoalStatus(gid, status){
  var si=document.querySelector('[data-gid="'+gid+'"] .gi-status');
  if(si){
    var labels={drafting:'Preparing...',sent:'Waiting for a response',agreed:'Agreement reached',completed:'Conversation finished',cancelled:'Cancelled'};
    si.textContent=labels[status]||status;
    si.className='gi-status '+status;
  }
}

function updateAttentionList(){
  var el=document.getElementById('attention-list');
  var container=document.getElementById('need-attention');
  var needsAttention=false;
  var html='';

  if(currentPendingMsg&&currentPendingMsg.for===me&&currentGoal){
    needsAttention=true;
    html+='<div class="goal-item" style="border-color:#00ff88"><div class="gi-head"><span>'+currentGoal+'</span><span class="gi-status drafting">draft ready</span></div><div style="font-size:12px;margin-bottom:6px">Your representative is awaiting your approval:</div><div style="font-size:13px;color:#ccc;margin-bottom:8px;padding:8px;background:#0a0a0a;border-radius:4px">'+currentPendingMsg.draft.substring(0,80)+'</div><button class="btn sm" onclick="openGoal(currentGoal)">Review &amp; Approve</button></div>';
  }

  if(currentPendingReview&&currentPendingReview.for===me&&currentGoal){
    needsAttention=true;
    html+='<div class="goal-item" style="border-color:#ff4444"><div class="gi-head"><span>'+currentGoal+'</span><span class="gi-status sent">Response needed</span></div><div style="font-size:12px;margin-bottom:6px">New proposal from the other side:</div><div style="font-size:13px;color:#ccc;margin-bottom:8px;padding:8px;background:#0a0a0a;border-radius:4px">'+currentPendingReview.message.substring(0,80)+'</div><button class="btn sm" onclick="openGoal(currentGoal)">Review</button></div>';
  }

  if(needsAttention){
    container.style.display='block';
    el.innerHTML=html;
  } else {
    container.style.display='none';
    el.innerHTML='';
  }
}

function openGoal(gid){
  currentGoal=gid;
  showConvo(gid,'private');
  document.getElementById('thread-private').innerHTML='<div class="msg them"><div class="msg-label">Loading</div>⏳...</div>';
  document.getElementById('thread-shared').innerHTML='';
  ws.send(JSON.stringify({type:'open-goal',goalId:gid}));
}

function startPoll(gid){
  stopPoll();
  pollTimer=setInterval(function(){
    if(pollInFlight||currentGoal!==gid)return;
    pollInFlight=true;
    fetch('/api/poll?goalId='+gid+'&for='+me).then(function(r){return r.json()}).then(function(d){
      if(currentGoal!==gid)return;
      if(d.status) updateGoalStatus(gid, d.status);
      if(d.facts){renderAgreement(d.facts);updateConvoHeader(null,null,d.facts);}
      if(d.tone){currentTone=d.tone;}
      if(d.representativeMode!==undefined&&d.representativeMode!==null){renderRepresentativeMode(d.representativeMode);}

      // Check for pendingMessage changes
      if(d.pendingMessage!==undefined){
        var prev=currentPendingMsg;
        currentPendingMsg=d.pendingMessage||null;
        if(JSON.stringify(prev)!==JSON.stringify(currentPendingMsg)){
          renderApprovalCard(d.pendingMessage,me);
          updateAttentionList();
        }
      }

      // Check for pendingReview changes
      if(d.pendingReview!==undefined){
        var prev=currentPendingReview;
        currentPendingReview=d.pendingReview||null;
        if(JSON.stringify(prev)!==JSON.stringify(currentPendingReview)){
          renderReviewCard(d.pendingReview,me);
          updateAttentionList();
          if(d.status) updateConvoHeader(null,d.status);
        }
      }

      if(!d.thread||d.thread.length<=pollCount)return;
      for(var i=pollCount;i<d.thread.length;i++){
        var r=d.thread[i];
        var isMine=r.from===me;
        var myLabel='You';
        var sharedLabel=isMine?'You':'Them';
        var privEl=document.getElementById('thread-private');
        var sharedEl=document.getElementById('thread-shared');
        if(isMine){
          privEl.innerHTML+='<div class="msg rep"><div class="msg-label mine">'+myLabel+'</div>'+r.text+(r.original?'<div class="msg-original">You said: &ldquo;'+r.original+'&rdquo;</div>':'')+'<span class="msg-del" onclick="event.stopPropagation();deleteMessage('+i+')">&times;</span></div>';
        } else {
          privEl.innerHTML+='<div class="msg them"><div class="msg-label theirs">'+sharedLabel+'</div>'+r.text+'</div>';
        }
        sharedEl.innerHTML+='<div class="msg '+(isMine?'rep':'them')+'"><div class="msg-label">'+sharedLabel+'</div>'+r.text+'</div>';
      }
      pollCount=d.thread.length;
      document.getElementById('thread-wrap').scrollTop=99999;
    }).catch(function(){}).then(function(){pollInFlight=false;});
  },2000);
}

function stopPoll(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}}

function pollNow(){
  if(!currentGoal)return;
  var gid=currentGoal;
  stopPoll();
  if(pollInFlight){startPoll(gid);return;}
  pollInFlight=true;
  fetch('/api/poll?goalId='+gid+'&for='+me).then(function(r){return r.json()}).then(function(d){
    if(currentGoal!==gid)return;
    if(d.status) updateGoalStatus(gid,d.status);
    if(d.thread){
      currentPendingMsg=d.pendingMessage||null;
      currentPendingReview=d.pendingReview||null;
      renderApprovalCard(currentPendingMsg,me);
      renderReviewCard(currentPendingReview,me);
      updateAttentionList();
      renderThreads(d.thread,me);
      renderAgreement(d.facts);
      updateConvoHeader(null,d.status,d.facts);
      pollCount=d.thread.length;
    }
  }).catch(function(){}).then(function(){
    pollInFlight=false;
    if(currentGoal===gid)startPoll(gid);
  });
}
function showView(v){var vs=document.querySelectorAll('.view');for(var i=0;i<vs.length;i++)vs[i].classList.remove('active');document.getElementById('v-'+v).classList.add('active');}
function nf(t){var e=document.getElementById('nf');e.textContent=t;e.style.display='block';setTimeout(function(){e.style.display='none';},3000);}

function renderToneSelector(tone){
  currentTone=tone||'professional';
  var btns=document.querySelectorAll('.tone-btn');
  for(var i=0;i<btns.length;i++){
    btns[i].classList.toggle('active',btns[i].dataset.tone===currentTone);
  }
}
function renderRepresentativeMode(enabled){
  currentRepresentativeMode=enabled;
  var el=document.getElementById('representative-mode-toggle');
  el.textContent=enabled?'✨ Representative ON':'✨ Representative OFF';
  el.classList.toggle('active',enabled);
}
function selectTone(tone){
  currentTone=tone;
  renderToneSelector(tone);
  if(currentGoal){
    document.getElementById('draft-text').textContent='✍️ Adjusting tone...';
    ws.send(JSON.stringify({type:'re-draft',goalId:currentGoal,tone:tone}));
  }
}
function toggleRepresentativeMode(){
  if(currentGoal) ws.send(JSON.stringify({type:'toggle-representative',goalId:currentGoal}));
}
document.getElementById('reply-input').onkeypress=function(e){if(e.key==='Enter')draftReply();};
document.getElementById('new-convo-msg').onkeypress=function(e){if(e.key==='Enter')createGoal();};
document.getElementById('goal-list').onclick=function(e){
  if(e.target.classList.contains('gi-del')){
    e.stopPropagation();
    var gid=e.target.dataset.gid;
    ws.send(JSON.stringify({type:'delete-goal',goalId:gid}));
    return;
  }
  if(e.target.classList.contains('gi-share')){
    e.stopPropagation();
    var url=location.origin+'?goal='+e.target.dataset.gid;
    var inp=document.createElement('input');
    inp.value=url;document.body.appendChild(inp);inp.select();document.execCommand('copy');inp.remove();
    nf('Link copied!');
    return;
  }
  var el=e.target.closest('.goal-item');
  if(el)openGoal(el.dataset.gid);
};
go();
</script>
</body>
</html>`;
