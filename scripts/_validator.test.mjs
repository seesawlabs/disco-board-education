/* Tests for the corpus validator.
 *
 * A guardrail nobody has tried to break is not a guardrail. Each case below is
 * a mistake a teammate could plausibly make; the assertion is that it fails
 * loudly and that the message names the problem.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
let failures = 0;

const VALID = `
- id: E1
  tier: 3
  source: Some Publication — an article
  date: "2026"
  url: https://example.com/a
  kind: paraphrase
  verified: true
  topics: [workflow]
  personas: [steven]
  text: |
    A finding long enough to clear the minimum length check comfortably.
`;

/** Run the validator against `yaml`; return { ok, out }. */
function run(yaml, cmd = 'build', outName = 'out.js') {
  const file = join(dir, `c-${Math.abs(hash(yaml))}.yaml`);
  writeFileSync(file, yaml);
  try {
    const out = execFileSync('node', ['scripts/corpus.mjs', cmd], {
      env: { ...process.env, CORPUS_FILE: file, CORPUS_OUT: join(dir, outName) },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function rejects(label, yaml, expect) {
  const { ok, out } = run(yaml);
  const matched = !ok && out.includes(expect);
  console.log(`${matched ? '  PASS' : '  FAIL'}  ${label}`);
  if (!matched) {
    failures++;
    console.log(`        expected failure containing "${expect}"`);
    console.log(`        got ok=${ok}: ${out.trim().split('\n').slice(0, 3).join(' | ')}`);
  }
}

function accepts(label, yaml) {
  const { ok, out } = run(yaml);
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`);
  if (!ok) { failures++; console.log(`        ${out.trim().split('\n').slice(0, 3).join(' | ')}`); }
}

console.log('\ncorpus validator');

accepts('a well-formed entry builds', VALID);

rejects('malformed YAML', '- id: E1\n   tier: 3\n  bad indent: x\n', 'not valid YAML');

rejects('missing required field',
  VALID.replace('  kind: paraphrase\n', ''), 'missing required field "kind"');

rejects('duplicate id', VALID + VALID.replace('- id: E1', '- id: E1'), 'duplicate id');

rejects('bad tier', VALID.replace('tier: 3', 'tier: 9'), 'tier must be one of');

rejects('bad kind', VALID.replace('kind: paraphrase', 'kind: hearsay'), 'kind must be one of');

rejects('misspelled persona', VALID.replace('personas: [steven]', 'personas: [stephen]'),
  'are not in the cast');

rejects('empty personas', VALID.replace('personas: [steven]', 'personas: []'),
  'must be a non-empty list');

rejects('typo\'d field name silently ignored otherwise',
  VALID.replace('  verified: true', '  verifed: true\n  verified: true'), 'unknown field');

rejects('verified as a string not a boolean',
  VALID.replace('verified: true', 'verified: "true"'), 'must be true or false');

rejects('http url', VALID.replace('https://example.com/a', 'http://example.com/a'),
  'must start with https://');

rejects('id that will not sort or cite cleanly',
  VALID.replace('- id: E1', '- id: entry one'), 'should be letters then digits');

rejects('text too short to be evidence',
  VALID.replace(/  text: \|\n.*\n/s, '  text: too short\n'), 'too short');

// The staleness gate is what stops a PR that edits the YAML without rebuilding.
// Build one corpus, then `check` a *different* one against that output.
run(VALID, 'build', 'stale.js');
const stale = run(VALID.replace('topics: [workflow]', 'topics: [privilege]'), 'check', 'stale.js');
const caught = !stale.ok && /out of date/.test(stale.out);
console.log(`${caught ? '  PASS' : '  FAIL'}  check catches a stale generated file`);
if (!caught) { failures++; console.log(`        ${stale.out.trim().split('\n')[0]}`); }

// And a missing generated file is caught too, with a fix-it instruction.
const absent = run(VALID, 'check', 'never-built.js');
const told = !absent.ok && /missing.*corpus:build/s.test(absent.out);
console.log(`${told ? '  PASS' : '  FAIL'}  check names the fix when the file is absent`);
if (!told) { failures++; console.log(`        ${absent.out.trim().split('\n')[0]}`); }

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nValidator behaves.\n');
process.exit(failures ? 1 : 0);
