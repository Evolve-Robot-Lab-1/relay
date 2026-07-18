import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../ui.ts', import.meta.url), 'utf8');
const templateStart = source.indexOf('`') + 1;
const templateEnd = source.lastIndexOf('`');
assert.ok(templateStart > 0 && templateEnd > templateStart, 'HTML template not found');

// The UI template has no JavaScript template substitutions, so evaluating the
// string reproduces the exact HTML and escaping sent to a browser.
const html = Function(`return \`${source.slice(templateStart, templateEnd)}\`;`)();
const scriptStart = html.indexOf('  (() => {');
const scriptEnd = html.lastIndexOf('  </script>');
assert.ok(scriptStart > 0 && scriptEnd > scriptStart, 'Client script not found');
Function(html.slice(scriptStart, scriptEnd));

console.log('Generated client syntax passed.');
