#!/usr/bin/env node
/* Corpus toolchain.
 *
 *   node scripts/corpus.mjs build   validate data/corpus.yaml → api/_corpus.generated.js
 *   node scripts/corpus.mjs check   validate + fail if the generated file is stale
 *
 * Why generate instead of parsing YAML at request time: the endpoint imports a
 * plain JS module, so there is no runtime dependency, no file-tracing surprises
 * on Vercel, and a malformed corpus can never take the demo down mid-meeting —
 * it fails here, or in CI, before it ever deploys.
 *
 * Error messages name the entry and say what to do. A teammate should be able
 * to fix any failure without reading this file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import YAML from 'yaml';
import { CODICES, ROSTER } from '../api/_codices.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Overridable so the validator's own tests can feed it deliberately broken files.
const SOURCE = process.env.CORPUS_FILE ? resolve(process.env.CORPUS_FILE) : join(ROOT, 'data/corpus.yaml');
const TARGET = process.env.CORPUS_OUT ? resolve(process.env.CORPUS_OUT) : join(ROOT, 'api/_corpus.generated.js');

const TIERS = [1, 2, 3, 4];
const KINDS = ['verbatim', 'paraphrase', 'synthesis'];
const REQUIRED = ['id', 'tier', 'source', 'kind', 'verified', 'topics', 'personas', 'text'];
const IMPLEMENTED = Object.keys(CODICES);
const TEXT_LIMIT = 1200;

const errors = [];
const warnings = [];
// Tags for cast members who have no dossier yet are legitimate and common —
// collect them for one summary line rather than warning per entry.
const dormant = new Set();

function validate(entries) {
  if (!Array.isArray(entries)) {
    errors.push('data/corpus.yaml must be a list of entries, each starting with "- id:".');
    return;
  }

  const seen = new Map();

  entries.forEach((e, i) => {
    // Without an id there's nothing to name the entry by, so report position.
    const where = e && e.id ? `entry ${e.id}` : `entry #${i + 1} (no id)`;
    const fail = (msg) => errors.push(`${where}: ${msg}`);
    const warn = (msg) => warnings.push(`${where}: ${msg}`);

    if (!e || typeof e !== 'object') {
      fail('is not a mapping. Each entry needs "- id: X" then indented fields.');
      return;
    }

    for (const f of REQUIRED) {
      const missing = e[f] === undefined || e[f] === null || e[f] === '';
      // `verified: false` is legitimate, so exclude booleans from the check.
      if (missing && typeof e[f] !== 'boolean') fail(`missing required field "${f}".`);
    }

    const unknown = Object.keys(e).filter(
      (k) => ![...REQUIRED, 'date', 'url'].includes(k),
    );
    if (unknown.length) {
      fail(`unknown field(s) ${unknown.map((u) => `"${u}"`).join(', ')} — a typo here means the ` +
        'value is silently ignored. Allowed: ' + [...REQUIRED, 'date', 'url'].join(', ') + '.');
    }

    if (e.id !== undefined) {
      if (!/^[A-Z]{1,3}\d+$/.test(String(e.id))) {
        fail(`id "${e.id}" should be letters then digits, e.g. E19, W1, P3.`);
      }
      if (seen.has(e.id)) {
        fail(`duplicate id — already used by the entry at position ${seen.get(e.id) + 1}. ` +
          'Citations are looked up by id, so duplicates make sourcing ambiguous.');
      } else {
        seen.set(e.id, i);
      }
    }

    if (e.tier !== undefined && !TIERS.includes(e.tier)) {
      fail(`tier must be one of ${TIERS.join(', ')} (got ${JSON.stringify(e.tier)}). ` +
        '1 panel, 2 DISCO internal, 3 public, 4 our deck.');
    }
    if (e.kind !== undefined && !KINDS.includes(e.kind)) {
      fail(`kind must be one of ${KINDS.join(', ')} (got ${JSON.stringify(e.kind)}).`);
    }
    if (e.verified !== undefined && typeof e.verified !== 'boolean') {
      fail('verified must be true or false, unquoted.');
    }

    if (e.personas !== undefined) {
      if (!Array.isArray(e.personas) || !e.personas.length) {
        fail('personas must be a non-empty list. Nobody can see an entry with no personas.');
      } else {
        const bad = e.personas.filter((p) => !ROSTER.includes(p));
        if (bad.length) {
          fail(`persona(s) ${bad.map((b) => `"${b}"`).join(', ')} are not in the cast. ` +
            `Valid: ${ROSTER.join(', ')}. A misspelled slug hides the entry from everyone, ` +
            'so this is an error rather than a warning.');
        }
        for (const p of e.personas) {
          if (ROSTER.includes(p) && !IMPLEMENTED.includes(p)) dormant.add(p);
        }
      }
    }

    if (e.topics !== undefined && (!Array.isArray(e.topics) || !e.topics.length)) {
      fail('topics must be a non-empty list.');
    }

    if (typeof e.text === 'string') {
      if (e.text.trim().length < 40) {
        fail('text is too short to be useful evidence — write the finding in a sentence or two.');
      }
      if (e.text.length > TEXT_LIMIT) {
        warn(`text is ${e.text.length} characters. These are read by a model inside a prompt, so ` +
          `one tight paragraph beats a transcript. Consider splitting or trimming (soft limit ${TEXT_LIMIT}).`);
      }
    }

    if (e.url !== undefined && e.url !== null && !/^https:\/\//.test(String(e.url))) {
      fail(`url must start with https:// or be null (got ${JSON.stringify(e.url)}).`);
    }
    if (e.date === undefined) warn('no date. Add one, or "undated" if genuinely unknown.');

    // Consistency nudges — these catch mislabelled provenance, which is the
    // failure mode the tier system exists to prevent.
    if (e.tier === 4 && e.kind !== 'synthesis') {
      warn('tier 4 is our own deck, so kind is normally "synthesis".');
    }
    if (e.tier === 3 && !e.url) warn('tier 3 is public record but has no url to cite.');
    if (e.kind === 'verbatim' && e.verified === false) {
      warn('marked verbatim but not verified — a quotation nobody has checked is the riskiest ' +
        'thing in the corpus. Verify it or set kind to paraphrase.');
    }
  });
}

function render(entries) {
  return `// GENERATED FILE — DO NOT EDIT.
// Source: data/corpus.yaml · regenerate with: npm run corpus:build
// ${entries.length} entries.

export const CORPUS = ${JSON.stringify(entries, null, 2)};
`;
}

function report() {
  if (dormant.size) {
    console.log(
      `  note     evidence is tagged for ${[...dormant].sort().join(', ')} — cast members with no ` +
      'dossier yet, so those tags are inert until one is written in api/_codices.js.',
    );
  }
  for (const w of warnings) console.warn(`  warning  ${w}`);
  for (const e of errors) console.error(`  ERROR    ${e}`);
  if (errors.length) {
    console.error(`\n${errors.length} error(s) in data/corpus.yaml. Nothing was written.`);
    process.exit(1);
  }
  if (warnings.length) console.warn(`\n${warnings.length} warning(s) — not fatal.`);
}

const cmd = process.argv[2] || 'build';
let parsed;
try {
  parsed = YAML.parse(readFileSync(SOURCE, 'utf8'));
} catch (err) {
  console.error(`data/corpus.yaml is not valid YAML:\n  ${err.message}`);
  process.exit(1);
}

// Normalise so the generated shape matches what the endpoint expects.
const entries = (Array.isArray(parsed) ? parsed : []).map((e) => ({
  ...e,
  date: e && e.date !== undefined ? String(e.date) : 'undated',
  url: e && e.url !== undefined ? e.url : null,
}));

validate(parsed);
report();

const output = render(entries);

if (cmd === 'check') {
  let current = '';
  try {
    current = readFileSync(TARGET, 'utf8');
  } catch {
    console.error('api/_corpus.generated.js is missing. Run: npm run corpus:build');
    process.exit(1);
  }
  if (current !== output) {
    console.error(
      'api/_corpus.generated.js is out of date with data/corpus.yaml.\n' +
      'Run "npm run corpus:build" and commit the result.',
    );
    process.exit(1);
  }
  console.log(`corpus ok — ${entries.length} entries, generated file in sync.`);
} else {
  writeFileSync(TARGET, output);
  console.log(`corpus built — ${entries.length} entries → api/_corpus.generated.js`);
}
