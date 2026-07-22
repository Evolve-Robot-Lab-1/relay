import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../ui.ts', import.meta.url), 'utf8');
const templateStart = source.indexOf('`') + 1;
const templateEnd = source.lastIndexOf('`');
assert.ok(templateStart > 0 && templateEnd > templateStart, 'HTML template not found');
const html = Function(`return \`${source.slice(templateStart, templateEnd)}\`;`)();

function extractFunction(name) {
  const marker = `    function ${name}(`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `${name} was not found in the generated client`);
  const next = html.indexOf('\n    function ', start + marker.length);
  assert.ok(next > start, `Could not find the end of ${name}`);
  return html.slice(start, next);
}

const functionNames = [
  'extractAmount',
  'extractDay',
  'extractClock',
  'extractWhere',
  'intentSource',
  'isMeetingIntent',
  'latestMessageValue',
  'scheduleState',
  'detailStatus',
  'formatKeyDetails',
  'formatGoalMeta',
  'extractUnderstandingRows'
];
const rules = Function(
  `${functionNames.map(extractFunction).join('\n')}\nreturn { ${functionNames.join(', ')} };`
)();

const message = (from, text, extra = {}) => ({ from, text, ...extra });
const goal = (...thread) => ({ status: 'open', result: {}, thread });
const status = value => rules.detailStatus('', '', '', value);

assert.equal(status(goal(message('owner', 'Tomorrow at 10:00 AM works for me.'))), 'Proposed', 'One person cannot both propose and confirm a meeting.');
assert.equal(status(goal(
  message('owner', 'Tomorrow at 10:00 AM works for me.'),
  message('owner', 'Confirmed.')
)), 'Proposed', 'A proposer cannot confirm their own proposal in a later message.');
assert.equal(status(goal(
  message('owner', 'Could we meet tomorrow at 10:00 AM?'),
  message('peer', 'Yes, that works for me.')
)), 'Agreed', 'The other participant can confirm an existing proposal.');
assert.equal(status(goal(
  message('owner', 'Could we meet tomorrow at 10:00 AM?'),
  message('peer', 'Yes, tomorrow at 10:00 AM works for me.')
)), 'Agreed', 'Repeating the same date and time should still count as confirmation.');

const counterproposal = goal(
  message('owner', 'Could we meet tomorrow at 10:00 AM?'),
  message('peer', '11:00 AM works for me instead.')
);
assert.equal(status(counterproposal), 'Proposed', 'A conflicting time is a counterproposal, not agreement.');
assert.match(rules.formatGoalMeta('', '', '', counterproposal), /Time: 11:00 AM/, 'The UI must show the latest proposed time.');
assert.doesNotMatch(rules.formatGoalMeta('', '', '', counterproposal), /Time: 10:00 AM/, 'The UI must not keep showing a superseded time.');

counterproposal.thread.push(message('owner', 'Yes, that works.'));
assert.equal(status(counterproposal), 'Agreed', 'The other participant can confirm a counterproposal.');

assert.equal(status(goal(
  message('owner', 'Could we meet tomorrow?'),
  message('peer', '10:00 AM works for me.')
)), 'Proposed', 'Adding a previously unspecified time creates a counterproposal.');
assert.equal(status(goal(
  message('owner', 'Could we meet tomorrow at 10:00 AM?'),
  message('peer', 'I am not available then.')
)), 'Declined', 'An explicit availability rejection must not become agreement.');
assert.equal(status(goal(
  message('owner', 'Could we meet tomorrow at 10:00 AM?'),
  message('peer', 'Yes, that works.', { deletedAt: Date.now() })
)), 'Proposed', 'Deleted confirmations must not affect goal state.');

const dotted = goal(
  message('owner', 'Could we meet Friday at 9:30 AM?'),
  message('peer', 'Friday at 10.30 am works for me instead.')
);
assert.equal(status(dotted), 'Proposed');
assert.match(rules.formatKeyDetails('', '', '', dotted), /Date: Friday · Time: 10:30 AM · Status: Proposed/);

const proposedRows = rules.extractUnderstandingRows(dotted);
assert.equal(proposedRows.find(row => row.label === 'Date')?.mark, 'proposed');
assert.equal(proposedRows.find(row => row.label === 'Time')?.mark, 'proposed');
dotted.thread.push(message('owner', 'Confirmed.'));
const agreedRows = rules.extractUnderstandingRows(dotted);
assert.equal(agreedRows.find(row => row.label === 'Date')?.mark, 'confirmed');
assert.equal(agreedRows.find(row => row.label === 'Time')?.mark, 'confirmed');

console.log('Goal validation passed: proposals, counterproposals, peer confirmation, declines, deletions, and latest date/time rendering.');
