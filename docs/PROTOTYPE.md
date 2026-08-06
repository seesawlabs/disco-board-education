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
| `api/_codices.js` | Persona dossiers. Adding a persona is a data change only |
| `api/_corpus.js` | The tagged evidence base + retrieval |
| `api/_smoke.test.mjs` | Regression checks with the network stubbed |

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
