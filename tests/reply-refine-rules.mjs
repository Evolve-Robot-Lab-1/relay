import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const backend = await readFile(new URL('../backend.ts', import.meta.url), 'utf8');
const extension = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const { RelayStore } = await import('../backend.ts');

function extractFunction(name) {
  const start = backend.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is missing`);
  const end = backend.indexOf('\nfunction ', start + 10);
  assert.ok(end > start, `Could not isolate ${name}`);
  const source = backend.slice(start, end).replace(/([,(]\s*[A-Za-z_$][\w$]*)\s*:\s*string\b/g, '$1');
  return Function(`const cleanText=(value,max=4000)=>typeof value==='string'?value.trim().slice(0,max):''; ${source}; return ${name};`)();
}

const labeledConversationTurns = extractFunction('labeledConversationTurns');
const explicitDraftReplacement = extractFunction('explicitDraftReplacement');

assert.deepEqual(
  labeledConversationTurns('Other person: Can I speak with HR? You: Yes, HR will contact you shortly.'),
  [
    { speaker: 'other', text: 'Can I speak with HR?' },
    { speaker: 'you', text: 'Yes, HR will contact you shortly.' }
  ],
  'WhatsApp turns must retain speaker ownership and chronological order'
);
assert.equal(
  labeledConversationTurns('You: First message Other person: Thanks').at(-1)?.speaker,
  'other',
  'The latest Other person turn must be detectable'
);

assert.equal(
  explicitDraftReplacement('Replace the draft with: Our HR team will contact you shortly.'),
  'Our HR team will contact you shortly.',
  'Refine must accept explicit replacement wording'
);
assert.equal(
  explicitDraftReplacement('Use exactly this: "Please share a convenient time for the call."'),
  'Please share a convenient time for the call.',
  'Refine must unwrap an explicitly supplied replacement'
);
assert.equal(
  explicitDraftReplacement('Replace the first sentence with: Hello.'),
  '',
  'A targeted edit must go through iterative refinement instead of replacing the entire draft'
);

const store = Object.create(RelayStore.prototype);
store.env = { AI: {} };
store.groqApiKeys = () => [];
store.allow = () => true;
const messagingContext = {
  pageType: 'messaging',
  nearbyText: 'Other person: Can I speak with HR? You: Yes, HR will contact you shortly.',
  selectedText: '',
  fieldLabel: '',
  fieldPlaceholder: '',
  composerKind: ''
};
const noReply = await store.makeComposeDraft('test', {
  text: '', direction: '', goal: 'suggest', tone: 'natural', context: messagingContext, clarification: '', refinementPass: 0
});
assert.equal(noReply.noReplyNeeded, true, 'Suggest must execute the no-reply guard before calling a model');
assert.equal(noReply.draft, '', 'The no-reply guard must not fabricate text');

const replaced = await store.makeComposeDraft('test', {
  text: 'Our HR person will contact you shortly.',
  direction: 'Replace the draft with: Our HR team will contact you shortly.',
  goal: 'refine_draft',
  tone: 'natural',
  context: messagingContext,
  clarification: '',
  refinementPass: 1
});
assert.equal(replaced.draft, 'Our HR team will contact you shortly.', 'Explicit replacement must execute exactly');

const editStore = Object.create(RelayStore.prototype);
editStore.env = { AI: {} };
editStore.groqApiKeys = () => [];
editStore.allow = () => true;
editStore.rewriteModelCount = () => 2;
const editCalls = [];
editStore.runRewriteModel = async (messages, modelIndex) => {
  editCalls.push({ messages, modelIndex });
  return modelIndex === 0
    ? JSON.stringify({ draft: 'I appreciate your interest and look forward to meeting you.', needsClarification: false, clarification: '' })
    : JSON.stringify({ draft: 'Our HR team will contact you shortly. Please share a convenient time for the call.', needsClarification: false, clarification: '' });
};
const edited = await editStore.makeComposeDraft('test-edit', {
  text: 'Our HR team will contact you shortly.',
  direction: 'Add a request for a convenient call time.',
  goal: 'refine_draft',
  tone: 'natural',
  context: { ...messagingContext, nearbyText: 'Other person: PRIVATE CONTEXT MUST NOT RESTART THE DRAFT' },
  clarification: '',
  refinementPass: 2
});
assert.equal(
  edited.draft,
  'Our HR team will contact you shortly. Please share a convenient time for the call.',
  'Refine must preserve the existing preview and apply only the requested addition'
);
assert.deepEqual(editCalls.map(call => call.modelIndex), [0, 1], 'An unrelated rewrite must be rejected before a local edit is accepted');
assert.match(editCalls[0].messages[0].content, /edit the CURRENT PREVIEW in place/i, 'Refine needs a dedicated editing prompt');
assert.match(editCalls[0].messages[0].content, /make the smallest change/i, 'Refine must request a minimal patch');
assert.doesNotMatch(editCalls[0].messages[1].content, /PRIVATE CONTEXT/, 'Refine must not restart from nearby conversation context');
assert.match(editCalls[0].messages[1].content, /CURRENT PREVIEW:[\s\S]*LATEST EDIT INSTRUCTION:/, 'Refine must separate the current preview from the edit instruction');

assert.match(backend, /latestTurn\?\.speaker === 'you'/, 'Suggest must stop when the User sent the latest labeled message');
assert.match(backend, /noReplyNeeded: true/, 'Suggest must return an explicit no-reply state');
assert.match(backend, /Always write as "You"—never answer in the Other person's voice/, 'Suggest prompt must lock speaker ownership');
assert.match(backend, /Do not reply to a later "You:" turn, repeat a request already answered/, 'Suggest must not re-answer completed turns');
assert.match(backend, /refine_draft/, 'Backend must expose a dedicated refinement contract');
assert.match(backend, /edit the CURRENT PREVIEW in place/i, 'Refine must treat the preview as editable text');
assert.match(backend, /latest instruction is authoritative/i, 'Refine must prioritize the latest User correction');
assert.match(backend, /replaced unrelated parts of the current preview instead of editing it/i, 'Backend must reject unrelated Refine rewrites');
assert.match(extension, /currentGoal = 'refine_draft'/, 'Extension Refine must use the dedicated backend goal');
assert.match(extension, /question\.textContent = 'No reply needed yet'/, 'Extension must render the no-reply state');
assert.match(extension, /draftButton\.textContent = 'Create follow-up'/, 'No-reply state must allow an explicit follow-up goal');

console.log('Reply ownership and iterative refinement rules passed.');
