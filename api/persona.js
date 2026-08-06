import Anthropic from '@anthropic-ai/sdk';
import { CODICES, PANEL } from './_codices.js';
import { CORPUS, selectCorpus, renderCorpus } from './_corpus.js';

const MODEL = 'claude-opus-5';

// Effort is the main latency lever. Chat stays at medium; design review gets
// high because the rubric is doing real work there.
const EFFORT = { chat: 'medium', review: 'high' };

// Lazy so a missing key surfaces as a clean 500 from the handler rather than
// a cold-start crash with no useful message.
let _client;
const client = () => (_client ||= new Anthropic());

// The answer contract, enforced by the API rather than by hoping the model
// complies. Optional fields are required-but-empty rather than nullable —
// structured outputs want every property listed in `required`.
const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      description:
        "The reply, in the persona's own voice. Two to four sentences. End on a pointed question where that is in character.",
    },
    confidence: {
      type: 'string',
      enum: ['A', 'B', 'C', 'D'],
      description:
        'A = real practitioners addressed this exact question (verbatims exist). B = documented behaviour of this population, extrapolated. C = consistent with the dossier, no direct evidence. D = out of scope, declined.',
    },
    confidence_reason: {
      type: 'string',
      description: 'One sentence on why that tier, naming what the evidence does and does not cover.',
    },
    what_would_raise_it: {
      type: 'string',
      description:
        'The specific evidence that would move this up a tier. Name the DISCO data source or the panel question. Empty string only for tier A.',
    },
    sources: {
      type: 'array',
      items: { type: 'string' },
      description: 'Corpus IDs actually relied on, e.g. ["E3","D2"]. Empty if none.',
    },
    am_i_the_user: {
      type: 'string',
      enum: ['yes', 'partly', 'no', 'n/a'],
      description:
        "For product and design questions: is this persona the intended user? 'no' is a common and useful answer. 'n/a' for non-product questions.",
    },
    objection: {
      type: 'string',
      description:
        'The single objection this persona would actually raise. Empty string if there is none.',
    },
    what_would_change_it: {
      type: 'string',
      description:
        'For product and design questions: what would have to change for this persona to back it. Empty otherwise.',
    },
    would_let_team_adopt: {
      type: 'string',
      enum: ['yes', 'no', 'not-my-call', 'n/a'],
      description: 'Adoption verdict for product questions. n/a otherwise.',
    },
  },
  required: [
    'answer',
    'confidence',
    'confidence_reason',
    'what_would_raise_it',
    'sources',
    'am_i_the_user',
    'objection',
    'what_would_change_it',
    'would_let_team_adopt',
  ],
  additionalProperties: false,
};

const CONTRACT = `
HOW YOU MUST ANSWER

You are a synthetic user built for DISCO's product, marketing and sales teams. You are a
composite of many practitioners, not a real individual, and you never claim otherwise.

Ground every answer in the EVIDENCE section. It is the only evidence you have.
- If the evidence covers the question, use it and cite the IDs.
- If it does not, say so plainly in voice and set confidence to C or D. Declining is a correct
  and useful answer. Never fill a gap with something that merely sounds plausible.
- Entries marked "tier 4, synthesis" come from a deck the people asking you this question wrote
  themselves. Agreeing with them proves nothing, so lean on external evidence (tier 3) where the
  two overlap, and say when external evidence complicates the deck's version.
- Entries flagged UNVERIFIED FIGURE have not been checked against the primary source. You may use
  them, but hedge the number ("reportedly", "on the published figures") rather than asserting it.
- Never present a paraphrase as a direct quotation. None of your evidence is verbatim testimony.

There is no tier A evidence in this build. Nobody has interviewed real practitioners for it yet.
Say so when it matters, and name what would fix it: DISCO's own win/loss interviews, partner-
attended sales-call transcripts, support and CS notes, and a recruited practitioner panel.

Never invent pricing, willingness to pay, or a specific vendor's reputation. Those are tier D.

Do not flatter the idea in front of you. A synthetic user who likes everything is worthless to
the people using this. If your honest answer is that you would not use it, or that a different
role is the real user, lead with that.

Stay in voice. Do not narrate your reasoning, do not describe the evidence base as "the corpus",
and do not use vendor vocabulary the dossier says you avoid.
`.trim();

const REVIEW_RUBRIC = `
This is a product or design question. Work through the rubric in order, then answer in voice.

1. Is this persona even the user? Often the honest answer is that a different role is, and this
   persona's only question is whether the output can be trusted. Say that if it is true.
2. Is the output verifiable — traceable to source documents, spot-checkable without redoing the
   work? This is the decisive test.
3. Does it help or hurt verification? Saving verification effort is selling foreclosed leverage.
   Making verification faster is the win. Name which one this is.
4. Who owns the error if it is wrong?
5. Does it remove a handoff, or add another system to reconcile?
6. Privilege and data: where does the data go, does it survive privilege review?
7. Fee-arrangement sensitivity: hourly or fixed fee — margin or lost billables?
8. Can associates run it with no firm training?
9. What does it change about what gets told to the client?

Set am_i_the_user, objection, what_would_change_it and would_let_team_adopt. Keep the answer field
to the reaction itself — the structured fields carry the rest.
`.trim();

function buildSystem(personaSlug, topic) {
  const codex = CODICES[personaSlug];
  const entries = selectCorpus(personaSlug, topic);
  // Fall back to the persona's whole slice rather than answering blind.
  const evidence = entries.length ? entries : CORPUS.filter((e) => e.personas.includes(personaSlug));

  return [
    {
      type: 'text',
      text: [
        `You are ${codex.name}, ${codex.role} at a ${codex.firm}.`,
        '',
        '=== DOSSIER ===',
        codex.dossier,
        '',
        '=== EVIDENCE ===',
        renderCorpus(evidence),
        '',
        '=== CONTRACT ===',
        CONTRACT,
      ].join('\n'),
      // Stable per (persona, topic) — cache it so repeat turns are cheap and fast.
      cache_control: { type: 'ephemeral' },
    },
  ];
}

function buildMessages(history, mode, image) {
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') {
    throw Object.assign(new Error('Last message must be from the user.'), { status: 400 });
  }

  // Mode guidance and any image ride in the user turn, not the system prompt,
  // so the cached prefix stays byte-identical across modes.
  const blocks = [];
  if (image) {
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: image.media_type, data: image.data },
    });
  }
  if (mode === 'review') blocks.push({ type: 'text', text: REVIEW_RUBRIC });
  blocks.push({ type: 'text', text: last.content });
  last.content = blocks;

  return messages;
}

async function ask({ persona, history, mode, image, topic }) {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: buildSystem(persona, topic),
    messages: buildMessages(history, mode, image),
    output_config: {
      effort: EFFORT[mode] || EFFORT.chat,
      format: { type: 'json_schema', schema: ANSWER_SCHEMA },
    },
  });

  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('The model declined this request.'), { status: 422 });
  }
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) {
    throw Object.assign(new Error('Empty response from the model.'), { status: 502 });
  }

  const parsed = JSON.parse(text);
  const byId = new Map(CORPUS.map((e) => [e.id, e]));
  return {
    persona,
    name: CODICES[persona].name,
    role: CODICES[persona].role,
    ...parsed,
    // Resolve cited IDs to real provenance so the UI can show it, and silently
    // drop any ID the model invented.
    sources: (parsed.sources || [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((e) => ({
        id: e.id,
        tier: e.tier,
        kind: e.kind,
        verified: e.verified,
        source: e.source,
        date: e.date,
        url: e.url,
      })),
    usage: {
      input: response.usage.input_tokens,
      cache_read: response.usage.cache_read_input_tokens ?? 0,
      cache_write: response.usage.cache_creation_input_tokens ?? 0,
      output: response.usage.output_tokens,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only.' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in this environment.' });
    return;
  }

  try {
    const { persona = 'steven', messages = [], mode = 'chat', image = null, topic = null } =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    if (persona !== 'panel' && !CODICES[persona]) {
      res.status(400).json({ error: `Unknown persona: ${persona}` });
      return;
    }

    // Panel mode runs each persona independently, on its own dossier and its own
    // evidence slice. The disagreement is the output — do not reconcile it.
    const slugs = persona === 'panel' ? PANEL : [persona];
    const answers = await Promise.all(
      slugs.map((slug) => ask({ persona: slug, history: messages, mode, image, topic })),
    );

    res.status(200).json({ answers });
  } catch (err) {
    const status = err.status || err.status_code || 500;
    console.error('persona endpoint failed:', err);
    res.status(status).json({ error: err.message || 'Request failed.' });
  }
}
