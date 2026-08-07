# Onboarding — DISCO synthetic persona

Read this once, then keep `docs/PROTOTYPE.md` open as the reference.

## What you're working on

This repo holds **two separate things**:

1. **The Board Education deck** — `index.html`, `styles.css`, `deck-stage.js`. Already delivered
   to DISCO. **Leave it alone** unless you're asked. It has brittle renumbering rules (see
   `CLAUDE.md`): inserting or reordering a slide means renumbering everything after it by hand.
2. **The synthetic persona prototype** — `persona/` and `api/`. **This is the work.** A chat
   interface to a cited evidence base, wearing the voice of the deck's Steven persona (junior
   partner at an AmLaw firm), for DISCO's product, marketing and sales teams.

Read `docs/SYNTHETIC-PERSONA-PLAN.md` for why it exists commercially. The short version: it's a
demo Seesaw is building on spec to win the funded build. That framing matters technically — the
gaps in the evidence base are deliberate and visible, not bugs to paper over.

### Where the work lives

**Everything is on the branch `claude/synthetic-jose-chatbot-86ebs4`. `main` is still just the
deck.** Nothing here has been merged. Branch off that branch, not off `main`, or you'll lose the
whole prototype.

```bash
git fetch origin
git checkout claude/synthetic-jose-chatbot-86ebs4
git checkout -b your-name/what-youre-doing
```

**We ship to preview only.** Pushing any branch gives a Vercel preview. Nobody is deploying this
to production — `main` is production and the deck lives there. Don't push to `main`.

## Get it running

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...      # ask Calvin
npx vercel dev
```

Open **http://localhost:3000/persona/**.

Node 22. `npm test` needs no API key and no network.

> A plain static server (`python3 -m http.server`) serves the UI but **not** `/api`, so every
> question fails. You need `vercel dev` or a deployed preview.

## The loop you'll repeat most: adding evidence

Evidence lives in **`data/corpus.yaml`** — that file is the source of truth and the only one you
edit to add knowledge. Its header comment carries the field reference and a copy-paste template.

```bash
git checkout -b evidence/whatever
# edit data/corpus.yaml
npm run corpus:build      # validates, regenerates api/_corpus.generated.js
npm test                  # corpus + validator + endpoint contract
git add data/corpus.yaml api/_corpus.generated.js
git commit && git push    # open a PR; CI runs the same checks
```

One entry:

```yaml
- id: W1                              # E# public · D# our deck · W# win/loss · C# calls · P# panel
  tier: 2                             # 1 panel · 2 DISCO internal · 3 public · 4 our deck
  source: DISCO win/loss interview — AmLaw 100 firm
  date: 2026-05
  url: null
  kind: paraphrase                    # verbatim | paraphrase | synthesis
  verified: true                      # false ⇒ shows "unverified figure", persona hedges it
  topics: [procurement, security]
  personas: [steven, bill]            # WHO CAN SEE IT — this is the retrieval filter
  text: |
    One tight paragraph of the finding. Block scalar, so apostrophes and
    quotes need no escaping.
```

Three things to get right:

- **`personas` is the retrieval filter.** An entry not tagged for a persona is invisible to them.
  Any of the eight cast members in `ROSTER` (`api/_codices.js`) is valid; the five without
  dossiers are inert for now, and the build says so as a note.
- **`verified: true` means someone read the primary source.** Don't guess. 18 of the current 26
  entries are `false` and must be checked before this goes in front of DISCO.
- **Paraphrase, don't dump.** These are read by a model inside a prompt. One paragraph beats a
  transcript. Reserve `kind: verbatim` for when the exact words matter.

Never hand-edit `api/_corpus.generated.js`. Always commit it alongside the YAML — CI fails if
they disagree, which is what stops a half-applied change reaching the demo.

## How it works, in 60 seconds

```
question ──► POST /api/persona
               ├─ system prompt = dossier + evidence slice + contract   [prompt-cached]
               ├─ user turn     = image? + review rubric? + question
               └─ Claude Opus 5 with structured output
                        ↓
    answer in voice · outcome tier · what would raise it · resolved sources
```

- **`api/_codices.js`** — persona dossiers (Steven full, Jose and Bill lighter) and `ROSTER`.
- **`api/_corpus.js`** — retrieval only. `selectCorpus()` filters by persona tag and the whole
  slice goes into the prompt. No embeddings, no vector store: at 26 entries the model sees all its
  evidence, which is why it can decline with confidence.
- **`api/persona.js`** — the endpoint. Schema, contract text, review rubric, panel fan-out.
- **`persona/app.js`** — client. One transcript per persona, image intake, answer rendering.

**The answer contract is enforced by the API** (`output_config.format`), not by asking nicely.
Outcome tiers: **A** attested (zero in this build — nobody's been interviewed yet), **B** grounded,
**C** inferred, **D** evidence gap, **W** misaddressed (wrong person to ask). `right_person` is set
on every answer. Declines are correct behaviour — "Competitor" and "Pricing" in the Try list
*should* come back as declines. If they start answering confidently, that's a regression.

**Panel mode** ("All three") fans out to three independent calls and preserves the disagreement.
Don't reconcile it — the conflict is the product.

**Attaching an image** switches to review mode: effort rises to `high` and a rubric derived from
`docs/CODEX-STEVEN.md` is injected. The rubric leads with "is this persona even the user?" because
for most wireframes the honest answer is no.

## Rules that will bite you

Every one of these cost real debugging time.

1. **No backticks inside the prompt strings.** `CONTRACT` and `REVIEW_RUBRIC` in `api/persona.js`
   are template literals. Writing `` `sources` `` in that prose terminates the string and breaks
   the module. This has happened twice. Say `the sources field` instead.
2. **Asset paths must be root-absolute.** `/persona/persona.css`, not `persona.css`. Vercel serves
   `/persona` without a trailing slash, which makes relative paths resolve against the root and
   404 — you get raw unstyled HTML with no JS.
3. **`usage.input_tokens` is only the *uncached remainder*.** Displaying it alone showed "14 in"
   on a request carrying a 5k-token dossier. Use `total_in` from the endpoint.
4. **Don't break prompt caching.** The system prompt must stay byte-identical per persona.
   Anything volatile (mode guidance, images, timestamps) goes in the *user* turn. Watch the meter:
   first question is a cache write, second should read ~5k from cache. If it never reads from
   cache, every turn is paying full price.
5. **Keep the image downscaling.** `MAX_EDGE = 1568` in `persona/app.js` exists because a retina
   screenshot base64s past Vercel's ~4.5 MB request limit and would 413 before reaching Claude.
6. **Vercel preview URLs are immutable.** `…-7prirqb79-….vercel.app` is pinned to one build
   forever. Use the branch alias, or grab the newest URL from the dashboard. Env vars bind at
   **build** time, so adding a key needs a redeploy.
7. **`vercel.json` sets `maxDuration: 120`.** Opus 5 thinks by default and panel mode is three
   concurrent calls. Don't lower it.
8. **`effort` is the latency lever**, not `max_tokens`. `EFFORT` in `api/persona.js` — `medium`
   for chat, `high` for review. On Opus 5, `low`/`medium` are unusually strong.
9. **In tests, patch `Messages.prototype.create`,** not the client. The SDK assigns `messages` as
   an own property in its constructor, so patching the prototype after construction misses.
10. **Nothing appended after `process.exit`** in the test files will ever run. Add new cases above
    the summary block.
11. **`[hidden]` loses to a class `display`.** `persona.css` states `[hidden] { display: none
    !important }` for that reason — don't remove it.

## Verifying your work

```bash
npm test        # 3 suites, 63 assertions, no API key and no network needed
                #   corpus:check          data/corpus.yaml valid + generated file in sync
                #   _validator.test.mjs   15 cases proving bad entries are rejected
                #   _smoke.test.mjs       48 checks on the endpoint contract
```

Then look at it in a browser. `npm test` stubs the network, so **the live model call is the one
thing not covered** — if you change prompts, the schema, or the contract, you have to ask real
questions through the UI and read the answers.

When you change UI or the answer contract, check all of: a normal answer, a decline (ask about
pricing), panel mode, and an image upload.

## Shipping

Branch → PR into `claude/synthetic-jose-chatbot-86ebs4` → CI green → merge → preview redeploys.
`.github/workflows/ci.yml` runs the same three suites on every PR.

Commit messages: say what changed and *why it was wrong before*. The history is the main record
of the reasoning here — read `git log` for how decisions were reached.

## Open items

- **18 of 26 corpus entries are `verified: false`** — figures came from search summaries, not
  primary reports. Each needs checking against the source before DISCO sees this. Highest-priority
  chore: one wrong number in a credibility demo is fatal.
- **Sycophancy is untested.** Try to get Steven to endorse something a real junior partner would
  reject on sight. He must be capable of "I wouldn't use this."
- **Nothing persists.** Conversations and the research backlog live in browser memory and vanish on
  reload. The plan treats the query log as a compounding asset; right now it evaporates.
- **`topic` filtering is wired but dormant** — the client never sends a `topic`, so every request
  gets the persona's full slice. It's the escape hatch for when the corpus outgrows the prompt
  (~25–30k tokens per persona, a few hundred entries).
- **Five of the eight personas have no dossier** (Bo, Tanner, Amanda, Erin, Vishal). Evidence is
  already tagged for them.

## Reference

| Doc | What's in it |
|---|---|
| `docs/PROTOTYPE.md` | Architecture, data model, adding evidence, known limits |
| `docs/CODEX-STEVEN.md` | The Steven dossier and where external evidence complicates our deck |
| `docs/SYNTHETIC-PERSONA-PLAN.md` | Why this exists; what the funded build would add |
| `docs/PERSONA-SLIDES.md` | Deck persona slides — only if you touch the deck |
| `CLAUDE.md` | Deck editing rules, including the renumbering trap |
