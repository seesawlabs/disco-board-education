// Retrieval over the evidence corpus.
//
// The evidence itself lives in data/corpus.yaml — that file is the source of
// truth and the one a teammate edits. `npm run corpus:build` validates it and
// regenerates _corpus.generated.js, which is what gets imported here.
//
//   tier 1 — primary research (practitioner interviews). EMPTY in this build.
//   tier 2 — DISCO's internal evidence (calls, win/loss, CS, telemetry).
//            EMPTY in this build — not available pre-contract. This is the ask.
//   tier 3 — public record.
//   tier 4 — the Board Education deck (our own prior synthesis).
//
// `kind` matters as much as `tier`:
//   verbatim   — exact words from the source
//   paraphrase — our restatement of a documented finding
//   synthesis  — our own analysis (deck material is all synthesis)
//
// `verified` is false where a figure came from a search summary rather than the
// primary report. Every false must be checked against the source PDF before
// this is shown to DISCO. The system prompt is told to hedge on these.

export { CORPUS } from './_corpus.generated.js';
import { CORPUS } from './_corpus.generated.js';

// Topic index so the router can pull a focused slice instead of the whole corpus.
export const TOPIC_ALIASES = {
  'ai-impact': ['ai-adoption', 'ai-risk', 'trust', 'verification', 'shadow-it', 'training'],
  competitor: ['procurement', 'build-vs-buy', 'security', 'market'],
  product: ['workflow', 'coordination', 'privilege', 'time-sink', 'ediscovery', 'trust', 'verification'],
  economics: ['economics', 'billing', 'pricing', 'leverage', 'compensation', 'incentives'],
  procurement: ['procurement', 'buying', 'budget-authority', 'build-vs-buy', 'security'],
};

/** Select corpus entries relevant to a persona, optionally narrowed by topic. */
export function selectCorpus(persona, topic) {
  const wanted = TOPIC_ALIASES[topic] || null;
  return CORPUS.filter((e) => {
    if (!e.personas.includes(persona)) return false;
    if (!wanted) return true;
    return e.topics.some((t) => wanted.includes(t));
  });
}

/** Render entries for the system prompt. Stable ordering keeps the cache warm. */
export function renderCorpus(entries) {
  return entries
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const flags = [`tier ${e.tier}`, e.kind];
      if (!e.verified) flags.push('UNVERIFIED FIGURE');
      return `[${e.id}] (${flags.join(', ')}) ${e.source}${e.date ? `, ${e.date}` : ''}\n${e.text}`;
    })
    .join('\n\n');
}
