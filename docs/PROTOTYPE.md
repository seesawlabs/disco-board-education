# Synthetic user — prototype

Working chat prototype for the demo described in `SYNTHETIC-PERSONA-PLAN.md`, built on the
dossier in `CODEX-STEVEN.md`. Lead persona is **Steven** (junior partner); **Jose** and **Bill**
exist so panel mode works.

Live at `/persona/` alongside the deck.

## Files

| Path | What it is |
|---|---|
| `persona/index.html` | The UI |
| `persona/persona.css` | Styling — deck tokens copied from `styles.css` (standalone on purpose; `styles.css` is sized for a 1920×1080 projected slide) |
| `persona/app.js` | Client: transcript per persona, image attach, answer-card rendering, research backlog |
| `api/persona.js` | Serverless endpoint. Builds the system prompt, calls Claude, enforces the answer contract |
| `api/_codices.js` | Persona dossiers + the cast roster. Adding a persona is a data change only |
| **`data/corpus.yaml`** | **The evidence base — the file you edit.** Source of truth |
| `scripts/corpus.mjs` | Validates the YAML and generates the module the endpoint imports |
| `api/_corpus.generated.js` | Generated. Never edit by hand |
| `api/_corpus.js` | Retrieval only (`selectCorpus`, `renderCorpus`, topic aliases) |
| `scripts/_validator.test.mjs` | Tests that the validator actually rejects bad entries |
| `api/_smoke.test.mjs` | Endpoint contract checks with the network stubbed |
| `.github/workflows/ci.yml` | Runs all three suites on every pull request |

## Running it

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npx vercel dev          # or: npm run dev
```

Then open `http://localhost:3000/persona/`.

A plain static server (`python3 -m http.server`) serves the UI but **not** `/api` — every
question will fail. You need `vercel dev` or a deployment.

On Vercel, set `ANTHROPIC_API_KEY` as a project environment variable. `vercel.json` raises
`maxDuration` to 120s for the function: Opus 5 thinks by default, and panel mode fans out to
three calls, so the platform default is not enough.

Run the regression checks (no API key needed — the SDK is stubbed):

```bash
npm run test:persona
```

## How it works

```
question ──► /api/persona ──► system prompt = dossier + evidence slice + contract  [cached]
                          ├─► user turn = image? + rubric (review mode) + question
                          └─► Claude Opus 5, structured output enforcing the answer contract
                                        │
     answer + confidence tier + "what would raise it" + resolved sources ◄──┘
```

**The answer contract** is enforced by the API via `output_config.format`, not by hoping the model
complies. Every answer returns: the reply in voice, an outcome tier, why that tier, what would
raise it, the load-bearing corpus IDs, whether this persona is the right person to ask at all and
who owns it if not, plus — for product questions — the objection they'd raise, what would change
their mind, and an adoption verdict.

**Outcome tiers** are the commercial argument, not just an epistemic safeguard:

| | |
|---|---|
| **A — Attested** | Real practitioners addressed this exact question. **Zero in this build.** |
| **B — Grounded** | Documented behaviour of this population, extrapolated. |
| **C — Inferred** | Consistent with the dossier, no direct evidence. Flagged. |
| **D — Evidence gap** | The persona would know; it hasn't been collected. |
| **W — Misaddressed** | Wrong person to ask, whatever the evidence says. Names who owns it. |

D and W are deliberately separate. D is a hole in the corpus and belongs in the research backlog.
W is a fact about the org chart — nobody asks a junior partner which system finance runs — and no
amount of evidence collection would change it. Collapsing them into one "declined" state hides
which of the two you're looking at, and they imply completely different follow-ups.

`right_person` is set on **every** answer, not just declines. A persona can answer substantively at
tier B while still not being the right person to ask — Jose on a product feature, for instance —
and that combination is often the most useful thing in the response.

**Citations must be load-bearing.** An entry belongs in `sources` only if removing it would change
the answer. Early testing showed the model padding citations with topically adjacent entries to
support a *decline*, which is worse than citing nothing: a reader clicks through, finds the source
doesn't say what was implied, and discounts the rest. Declines usually cite nothing.

Because there is no tier A, "what would raise it" names the missing source — DISCO's win/loss
interviews, partner-attended call transcripts, a recruited panel. DISCO's team hits that line
repeatedly in a session, which makes the case for phase 2 without anyone pitching.

**Anti-circularity.** Deck-sourced evidence renders as `our deck`, external as `public`, so the
split is visible rather than buried. The system prompt tells the persona to lean on external
evidence where the two overlap and to say when external evidence complicates the deck.

**Panel mode** runs each persona as an independent call with its own dossier and evidence slice.
The disagreement is the output — it is never reconciled.

**Design review** triggers automatically on image attach: `effort` rises to `high` and the
Codex-derived rubric is injected. The rubric leads with "is this persona even the user?", because
for many wireframes the honest answer is that Bo or Tanner is, and saying so is worth more than
enthusiasm.

**Research backlog** collects every question answered at tier C, D or W. That list is the interview
guide for phase 2 — DISCO's own curiosity, turned into a scope document.

**The token meter reports the real prompt size.** `usage.input_tokens` from the API is only the
*uncached remainder*, so displaying it alone showed "14 in" on a request carrying a 5k-token
dossier — which reads as though the evidence was never sent. The endpoint returns `total_in`
(uncached + cache read + cache write) and the UI shows the split. Watch it across turns: the first
question is a cache write, the second should show ~5k **from cache**. If it never reads from cache,
prompt caching has broken and every turn is paying full price.

## The data model

**There is no database.** Version-controlled files are the whole store:

- `data/corpus.yaml` — the evidence base, and the only file you edit to add knowledge.
- `api/_codices.js` — the persona dossiers, plus `ROSTER`, the deck's full cast.

That is deliberate. Evidence changes arrive as a reviewable diff in a pull request, every claim
has an author and a date in git history, and there is no schema migration, no admin UI, and no
second source of truth to drift. At this size a database would add operational surface and buy
nothing.

**Why YAML, and why generated.** Evidence used to live in an executable JS array, which meant a
stray apostrophe in a quotation was a syntax error that took the whole endpoint down. YAML block
scalars need no escaping at all, and allow comments. `npm run corpus:build` validates the YAML and
writes `api/_corpus.generated.js`, which is what the endpoint imports — so there is no YAML parser
at request time, no file-tracing surprises on Vercel, and a malformed corpus fails on your machine
or in CI rather than in front of DISCO. The generated file is committed; CI fails if it is stale.

**Nothing is persisted at runtime.** Conversations live in browser memory (`histories` in
`app.js`) and are gone on reload; so is the research backlog. No transcripts, no user data, no
uploaded images are stored server-side — an uploaded screenshot exists only for the duration of
the request. Good for a privacy conversation with DISCO, and a real gap for Part B: the plan
treats the query log as a compounding asset, and right now it evaporates.

### One evidence entry

```yaml
- id: E3                       # unique. E# public, D# deck, W# win/loss, P# panel…
  tier: 3                      # 1 panel · 2 DISCO internal · 3 public · 4 our deck
  source: Norton Rose Fulbright — "AI in litigation: Gen AI sanctions in 2026"
  date: "2026"                 # shown in the UI; undated if genuinely unknown
  url: https://…               # or null — renders as a clickable citation
  kind: paraphrase             # verbatim | paraphrase | synthesis
  verified: false              # false ⇒ shows "unverified figure", persona hedges it
  topics: [verification, ai-risk, delegation]
  personas: [steven, jose, bo, tanner]    # who can see it
  text: |
    Courts have held that an attorney's duty to verify all citations is
    non-delegable, regardless of the source of the citation.
```

The `text` block scalar means apostrophes, quotes and line breaks need no escaping.

Three fields do the load-bearing work:

- **`personas`** controls visibility. An entry not tagged for a persona is invisible to them —
  this is the retrieval filter, so a mis-tag is why an answer "forgot" something.
- **`tier`** and **`kind`** drive the citation pills and the anti-circularity handling. Tier 4
  renders as `our deck` and the persona is told that agreeing with it proves nothing.
- **`verified: false`** makes the persona hedge the number and shows a red pill. All 18 tier-3
  entries are currently `false`.

### How it reaches the model

```
selectCorpus(persona, topic)      filter CORPUS by personas[] (and topics[] if given)
        ↓
renderCorpus(entries)             sorted by id → "[E3] (tier 3, paraphrase) source…"
        ↓
buildSystem()                     dossier + evidence + contract, one cached system block
        ↓
Claude Opus 5                     the whole slice, every request
```

**It is filter-then-inline, not embeddings.** No vector store, no chunking, no top-k similarity
search. The persona's entire evidence slice goes into the system prompt on every request, so the
model sees all of it rather than whatever retrieval guessed was relevant — which is why it can say
"nothing here covers that" with confidence. Current sizes:

| Persona | Entries | System prompt |
|---|---|---|
| Steven | 24 | ≈3,450 tokens (+ ~700 contract) |
| Jose | 16 | ≈2,000 tokens |
| Bill | 12 | ≈1,650 tokens |

Prompt caching is what makes that cheap: the block is byte-stable per persona, so after the first
request it is a cache read at roughly a tenth of the input price.

**`topic` is wired but dormant.** `selectCorpus` and `TOPIC_ALIASES` support narrowing by topic
end to end, but the client never sends a `topic`, so every request currently gets the persona's
full slice. It is the escape hatch, not an active feature.

**When this approach stops working:** roughly when a single persona's slice passes ~25–30k tokens,
which is a few hundred entries. Before that, nothing is gained by adding infrastructure. At that
point the cheap move is to start sending `topic` (already built); the real move is proper retrieval
over a store, which is Part B work.

## Adding new evidence

The whole loop, for someone who has never touched this repo:

```bash
git checkout -b evidence/win-loss-batch
# edit data/corpus.yaml — copy the template in its header comment
npm run corpus:build      # validates, then regenerates the module
npm test                  # corpus + validator + endpoint contract
git add data/corpus.yaml api/_corpus.generated.js
git commit && git push    # open a PR; CI runs the same checks
```

Merging deploys. Nothing else to update — the sidebar counts read from the endpoint.

1. Append an entry to `data/corpus.yaml` using the template in its header comment.
2. Give it an unused `id`. Prefix by provenance so it is legible at a glance: `E#` public,
   `D#` our deck, `W#` win/loss, `C#` partner-attended calls, `S#` support/CS, `P#` panel.
3. Tag `personas` deliberately — this is the only thing controlling who sees it. Any of the
   eight cast members in `ROSTER` is valid; the five without dossiers are inert for now, which
   the build reports as a note.
4. Set `verified` honestly. `true` means someone read the primary source.
5. `npm run corpus:build`, then `npm test`. **Commit the generated file alongside the YAML** —
   CI fails if they disagree, which is what stops a half-applied change reaching the demo.

### What the validator catches

It errors — not warns — on the mistakes that would otherwise fail *silently*: a misspelled
persona slug (the entry would become invisible to everyone), a typo'd field name (the value
would be ignored), a duplicate id (citations are looked up by id), a missing required field, an
out-of-range `tier` or `kind`, `verified` quoted as a string, a non-HTTPS url, and text too short
to be evidence. It warns on judgement calls: an oversized `text`, a missing date, tier 3 with no
url to cite, and `kind: verbatim` on something unverified — a quotation nobody has checked being
the riskiest thing in the corpus.

Messages name the entry and say what to do, so a failure is fixable without reading the script.
`scripts/_validator.test.mjs` proves each of those rejections actually fires.

**Paraphrase, don't dump.** Entries are read by a model inside a prompt, so one tight paragraph
of the finding beats a page of raw transcript. Set `kind: 'verbatim'` and quote exactly only when
the exact words matter — those are the entries that can be quoted back.

**Adding a whole tier** (say DISCO's win/loss library) needs nothing structural: same file,
`tier: 2`, a `W#` prefix, and the tier already renders. Two copy changes make it land properly —
the tier list in `persona/index.html` still says "not in this build", and the contract in
`api/persona.js` asserts "There is no tier A evidence in this build."

**Adding a persona** is a data change in three places: a `CODICES` entry in `api/_codices.js`
(plus `PANEL` if they should join panel mode), a `PERSONAS` entry in `persona/app.js`, and a
button in `persona/index.html`. If they are not one of the eight already in `ROSTER`, add them
there too or the validator will reject evidence tagged for them. Then tag existing evidence with
the new slug, and drop a portrait at `assets/persona-<slug>-portrait.png`. No endpoint changes.

### Running the checks

| Command | What it does |
|---|---|
| `npm run corpus:build` | Validate the YAML and regenerate the module. Run after every edit |
| `npm run corpus:check` | Validate, and fail if the generated file is stale. What CI runs |
| `npm test` | All three suites: corpus, validator behaviour, endpoint contract |

None of them need an API key or a network connection.

## Deliberately not built

Ingest automation, the other five personas, auth, multi-tenancy, Slack, streaming responses,
automated eval beyond the smoke checks, anything needing DISCO data access.

## Known limits

- **Latency.** Opus 5 thinks by default. A chat answer runs at `effort: "medium"`, design review at
  `"high"`, and panel mode is three concurrent calls. Expect tens of seconds. If the room needs it
  snappier, drop chat to `"low"` in `EFFORT` — `low`/`medium` are unusually strong on this model.
- **Unverified figures.** Statistics in the corpus came from search summaries, not the primary
  reports. They are flagged `verified: false`, render as `unverified figure`, and the persona is
  told to hedge them. **Check each one against the source PDF before showing this to DISCO** — one
  wrong number in a credibility demo is fatal.
- **No tier 1 or tier 2 evidence.** By construction. That is the ask, not an oversight.
- **Corpus is hand-curated (26 entries).** Curation beats a messy ingest at this scale, but coverage
  is thin outside the topics in `CODEX-STEVEN.md` §11.
- **Weakest on** named-vendor opinion and pricing. Both should decline; if either starts answering
  confidently, treat it as a regression.
- **Conversation history is per-persona and in-memory.** Reloading the page clears it. Panel turns
  are folded into history as `Name: answer` for context on follow-ups.
- **Sycophancy needs testing before the demo.** Try to get Steven to endorse something a real
  junior partner would reject on sight. He must be capable of "I wouldn't use this."
