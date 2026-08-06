# Synthetic Jose — build plan

A conversational synthetic user that DISCO's product, marketing, and sales teams can
interrogate in place of hunting down a real senior litigation partner for every question.

Status: proposal / not yet built. Owner: TBD. Companion to the Board Education deck
(`index.html`, Class 2 personas — Jose is slide 13, section 2.5).

---

## 1. What this is, and what it is not

**It is** a chat interface to an *evidence base* about senior litigation partners at large
firms, wearing the voice and priorities of the deck's Jose persona. Every answer is
traceable to something a real partner actually said, did, or bought.

**It is not** a language model doing an impression of a lawyer. That version is easy to
build in an afternoon and is worse than useless, because it produces fluent, confident,
unfalsifiable answers that feel like customer research. Product decisions get made on
them, and nobody can tell afterward which parts were real.

That distinction drives the whole plan. The work here is roughly **70% evidence
collection and calibration, 30% software.** If we invert that ratio we've built a
plausible-sounding liar.

**A necessary caveat on the goal.** "So they don't have to go find a Jose every time"
is achievable in the sense that matters — the *marginal* question becomes free. But
synthetic Jose can only be as good as the real-partner input behind it, and that input
decays as the market moves (it is moving fast right now). We are not eliminating primary
research; we are **amortizing** it. Budget for a standing panel refreshed on a cadence,
not a one-time data collection. Framed that way the value is real and compounding:
DISCO gets aggregate Jose instead of whichever single Jose happened to pick up the phone,
plus an answer in thirty seconds instead of three weeks.

---

## 2. Design principles

1. **Grounded, not generated.** Retrieval over a curated corpus, not recall from
   pretraining. If the corpus is silent, the answer says so.
2. **Every answer carries a confidence tier and its sources.** Non-negotiable, and
   visible in the UI — not buried in a system prompt.
3. **Composite, never a real individual.** Jose stays a synthesized archetype drawn from
   many partners. Modeling him on one identifiable customer creates confidentiality,
   likeness, and relationship risk for no analytical gain.
4. **Calibrated against reality, with a published score.** We measure how close synthetic
   Jose is to real Joses, per topic, and we ship that number alongside the tool.
5. **Persona-generic from day one.** Jose is the first instance, not a special case. The
   deck already defines eight personas; the architecture should let Bill, Steven, Amanda,
   Bo, Tanner, Erin, and Vishal drop in with a new dossier and corpus slice, no code
   changes. A multi-persona *panel* answering one question is the highest-value endgame
   feature, since DISCO's actual problem is that buyers and users are different people
   (deck slide 19).
6. **The questions asked are themselves the product.** Every query logged is a signal
   about what DISCO doesn't know. That log becomes the interview guide for the next
   real-partner panel — which is what turns this from a static artifact into a
   compounding data asset.

---

## 3. The evidence layer (the actual work)

Four tiers, in descending order of authority. Tier 1 is what makes this credible; tiers
3–4 are cheap and should not be mistaken for the real thing.

### Tier 1 — Primary research: the standing partner panel
Recruit **8–12 senior litigation partners** at AmLaw 100/200 firms, ideally a mix of
DISCO customers and non-customers (non-customers matter — a panel of only happy
customers produces a synthetic Jose who likes DISCO).

- Baseline: 60–75 minute semi-structured interviews, recorded and transcribed.
- Refresh: shorter quarterly check-ins (20–30 min) plus an async written prompt.
- Compensation: honoraria at something approaching their opportunity cost. This is the
  single largest line item and the one most likely to get cut. Cutting it is the failure
  mode.
- Interview guide must cover: how they actually prepare for a client meeting; where their
  team's time disappears; what they've been shown by their firm's innovation group and
  what they rejected; what they'd have to see to sign their name to AI-assisted work;
  what they think of the AI vendors by name; who they trust for technology opinions.

### Tier 2 — DISCO's own institutional memory
This exists already and is almost certainly underexploited. Inventory and ingest:

- Sales call recordings and transcripts (Gong/Chorus/equivalent) filtered to
  partner-level attendees.
- Win/loss interview write-ups. Churn reasons and save-attempt notes.
- CS/QBR notes; escalation and complaint threads.
- RFP and security questionnaire responses (these encode what firms actually
  interrogate).
- NPS and survey verbatims; conference and roadshow field notes.
- Solutions-consulting notes from demos where a partner was in the room.

Two caveats. First, **Jose is a low-telemetry persona** — the deck is explicit that he
reviews rather than uses the platform, so product analytics will barely see him. Evidence
about Jose has to come from human channels. Second, this corpus is full of customer
confidential material and needs a consent and scrubbing review before it goes near a
retrieval index (see §7).

### Tier 3 — Public record
Cheap, dateable, citable, and useful for the competitor and AI-impact questions:

- Legal trade press: Law.com, Legaltech News, ABA Journal, Above the Law, Artificial
  Lawyer.
- Firm AI announcements and policies — e.g. Kirkland & Ellis's ~$500M platform
  commitment, already cited in the deck (slides 22–23).
- Court opinions and sanctions orders involving unverified AI-generated citations; bar
  association ethics opinions. These define the actual boundary of partner risk
  tolerance far better than any survey.
- Legalweek/ILTACON panel transcripts and recordings; legal-tech podcasts.
- LinkedIn and bar-publication writing by litigation partners.
- Vendor materials from Harvey, Relativity, Everlaw, Thomson Reuters, LSPs — for what
  Jose is being pitched.

### Tier 4 — This deck
`index.html` plus the speaker notes are a compact, already-synthesized starting point:
Jose's rate, tools, buying role, quote, fears, and the Class 3 material on AI adoption
and the trust threshold. Useful as the seed dossier and as a consistency check. It is
roughly 700 words about Jose — a scaffold, not a knowledge base.

### Corpus mechanics
Every chunk stored with: source type, tier, date, persona relevance tags, topic tags,
consent/confidentiality status, and whether it's verbatim or paraphrase. Retrieval must
be able to filter on all of these — "answer this using only Tier 1 and Tier 3" is a
question we will want to ask.

---

## 4. The Jose Codex

A structured, versioned, **fully cited** dossier that is the persona's stable core —
distinct from the retrieval corpus, which supplies situational detail. Written as data
(YAML/JSON + prose), reviewed by DISCO, and diffable so we can see how Jose changes over
time.

Contents:

- **Identity and context** — role, seniority, firm profile, practice mix, rate,
  geography, client base.
- **Economic model** — how he's compensated, what his book of business depends on, what
  a lost client costs him personally. Most persona work skips this; it explains most of
  his behavior.
- **A day / a week** — where the hours actually go.
- **Decision criteria and veto rules** — what makes him say yes, and the specific things
  that make him say no permanently.
- **Risk posture** — his name is on the filing. Quantify what he'll accept.
- **Trust network** — whose opinion moves him (Steven's, per the deck; peers at other
  firms; the judge's reaction; *not* a vendor's deck).
- **Vocabulary** — the words he uses and, importantly, the vendor words he doesn't.
- **Known positions** — with citations, on: AI in review vs. drafting, insourcing,
  named competitors, pricing and pass-through, security.
- **Explicit unknowns** — the list of things we have no evidence on. This is the
  research backlog, and keeping it visible is what stops the model from filling gaps
  silently.

---

## 5. System architecture

Deliberately boring. The hard part isn't the stack.

```
    user question / wireframe upload
                │
                ▼
    ┌───────────────────────────┐
    │ Query router              │  classify: product feedback / competitor /
    │                           │  AI-impact / behavioral / out-of-scope
    └───────────┬───────────────┘
                ▼
    ┌───────────────────────────┐
    │ Retrieval over corpus     │  hybrid semantic + keyword, filtered by
    │ (tiers 1–4, tagged)       │  persona + topic + tier + recency
    └───────────┬───────────────┘
                ▼
    ┌───────────────────────────┐
    │ Persona layer             │  Jose Codex (stable) + retrieved evidence
    │                           │  + answer contract
    └───────────┬───────────────┘
                ▼
    ┌───────────────────────────┐
    │ Answer contract enforcer  │  voice + citations + confidence tier +
    │                           │  "what would raise confidence"
    └───────────┬───────────────┘
                ▼
        response  ──────────►  session log ──► research backlog
                                              (feeds next panel round)
```

**The answer contract.** Every response returns four parts:

1. **In voice** — Jose's answer, in Jose's register. Short. Partners don't monologue.
2. **Evidence** — footnoted sources, with dates.
3. **Confidence tier:**
   - **A — Attested.** Real partners addressed this specific question; verbatims exist.
   - **B — Grounded.** Documented behavior of this population, extrapolated to the question.
   - **C — Inferred.** Consistent with the Codex, no direct evidence. Flagged loudly.
   - **D — Out of scope.** Declines, and says who would actually need to be asked
     (often another persona: procurement questions belong to Bill, not Jose).
4. **What would raise confidence** — the specific question to put to the real panel.
   Turns every weak answer into a research task instead of a dead end.

**Interface.** Start with a hosted chat (Claude Projects or equivalent) to prove demand
inside DISCO with near-zero build. Move to a small web app once the corpus and eval
harness exist and multimodal upload is needed. A Slack bot is likely the highest-adoption
end state — it puts Jose where product debates already happen.

**Model.** Claude (Opus for answer generation and wireframe critique, a cheaper tier for
routing/classification). Vision is required for the wireframe use case.

---

## 6. The three named use cases, designed

### 6a. Running product ideas and wireframes past Jose
The hardest and most valuable one, and it needs more than "look at this image."

- Accept image, PDF, Figma export, or a written concept description.
- Ask for context first — what stage of the litigation lifecycle, which persona is the
  intended user, what it replaces. Feedback without that context is noise.
- Critique against a **fixed rubric derived from the Codex**, not free-form reaction:
  does this help him walk into a client meeting knowing every fact cold; is the output
  verifiable and source-traceable (the deck's trust threshold is the decisive test);
  does it create new risk on a process that already works; does it cost his team time or
  save it; would he let it touch something with his name on it; what does it change about
  what he tells the client.
- **Critical honesty feature:** for most wireframes the truthful answer is that Jose
  wouldn't be the user — Steven or Bo would — and Jose's only question is whether he can
  trust the output. Synthetic Jose must say that rather than generating enthusiasm.
  A synthetic user that likes everything is a liability.
- Output a structured verdict: reaction, the objection he'd raise, what would have to
  change, whether he'd let his team adopt it, and confidence.

### 6b. Competitor questions
Corpus-heavy and the easiest to make genuinely useful, because Tier 3 is rich. Must
distinguish sharply between what Jose *knows* (he's usually one layer removed from vendor
selection — Bill buys, per deck slide 19) and what the *market* knows. A partner's
half-informed impression of Harvey is exactly the useful signal; presenting it as market
analysis is the trap. Answers should separate "what Jose has heard" from "what's
documented" and cite dates, since positions from twelve months ago may be stale.

### 6c. How AI is affecting his business
Well-seeded by the deck's Class 3 material — the opportunity/fear framing, the trust
threshold, the insourcing shift. Should be able to handle both the personal question
("what does this do to your leverage model?") and the market one. Highest decay rate of
any topic, so it needs the freshest corpus and the most frequent panel refresh.

### 6d. Where to expect it to be weak (say this up front)
Pricing elasticity and willingness-to-pay. Anything requiring a genuinely novel reaction
to something no partner has seen. Firm-specific politics. Predictions. Be explicit about
these in the UI rather than letting users discover them by acting on bad answers.

---

## 7. Guardrails, confidentiality, and usage policy

- **Disclosure.** Always labeled synthetic. Never quoted in board or customer-facing
  material as customer validation without the fidelity score attached and the method
  stated.
- **Green-light uses:** exploring and pressure-testing ideas, surfacing objections
  before a real customer call, generating better interview questions, onboarding new
  PMs and AEs into the persona, prepping demos, red-teaming positioning.
- **Red-light uses:** go/no-go decisions, roadmap prioritization, pricing decisions,
  quantitative claims ("70% of partners would…"), or any assertion of customer demand.
  Write this policy down and put it in the interface, or it will be violated within a
  month of shipping — not maliciously, just because the answers are convincing.
- **Confidentiality.** Tier 2 sources contain customer confidential information. Before
  ingestion: legal review of the terms under which the recordings and notes were
  collected, PII and client-matter scrubbing, and a decision on whether anything
  identifiable may be retrieved verbatim. Panel participants need explicit consent that
  their input trains a synthetic persona.
- **No real likeness.** Composite only. Consider whether the persona keeps the deck's
  name at all, or gets a clearly-synthetic one for the tool.
- **Retention and access.** Decide who inside DISCO can query it, whether transcripts
  are retained, and whether it ever faces outward. Recommendation: internal only for at
  least the first two phases.

---

## 8. Calibration — the part that will get cut, and shouldn't

Without this, we have a chatbot with opinions. With it, we have an instrument.

- **Blind paired comparison.** 12–15 questions to the real panel and to synthetic Jose.
  Partners are shown pairs and asked to identify the synthetic one, and to grade
  substance agreement, priority ordering, and register plausibility.
- **Per-topic fidelity scores, not one global number.** Synthetic Jose may be strong on
  AI anxiety and useless on procurement. A single score hides exactly what users need to
  know, and topic-level scores tell us where to spend the next research dollar.
- **Regression suite.** A fixed question set re-run on every corpus or prompt change, so
  we notice when a change makes fidelity worse. Prompt tuning without this is drift.
- **Adversarial pass.** Deliberately try to get synthetic Jose to endorse something a
  real partner would reject on sight — an unverifiable AI drafting tool, say. Sycophancy
  is the dominant failure mode of every persona bot; test for it explicitly.
- **Publish the scorecard** in the interface. Users calibrate their trust correctly only
  if we tell them where it's weak.

---

## 9. Phasing

Each phase produces something usable, so this can be stopped at any boundary without
having wasted the prior work.

**Phase 0 — Frame and decide (~1 week).**
Confirm scope and owner. Inventory Tier 2 access (who can pull Gong, CRM, CS notes).
Write the usage policy and get legal's read on the corpus. Decide internal-only. Agree
the fidelity bar that would make this trustworthy.
*Out: one-page charter, data-access list, usage policy, legal sign-off path.*

**Phase 1 — Jose Codex v1 + prompt-only prototype (~2–3 weeks).**
Build the Codex from Tier 3 and Tier 4 plus whatever Tier 2 is immediately accessible.
Stand it up as a hosted chat with no custom infrastructure. Circulate inside DISCO and
watch what people actually ask.
*Out: cited Codex v1, working prototype, first query log, honest list of unknowns.*
*This is the go/no-go gate. If nobody uses the prototype, stop here — cheaply.*

**Phase 2 — Corpus and retrieval (~3–4 weeks, parallel with 3).**
Ingest and tag Tier 2 and Tier 3 at volume. Build retrieval, the answer contract, and
citation enforcement. Add wireframe/multimodal review with the rubric.
*Out: real application, sourced answers with confidence tiers, design-review capability.*

**Phase 3 — Panel and calibration (~4–6 weeks, mostly recruiting latency).**
Recruit and interview 8–12 partners. Fold Tier 1 into the corpus. Run the blind
comparison, build the regression suite, publish the scorecard.
*Out: fidelity scores by topic, calibrated Codex v2, standing panel to refresh from.*
*Start recruiting during Phase 1 — it is the long pole.*

**Phase 4 — Cast and flywheel (ongoing).**
Extend to the other deck personas; add panel mode (ask one question, get Jose, Bill, and
Amanda answering with their real conflicts intact). Wire the query log into the panel
interview guide. Set the refresh cadence. Instrument which answers users act on.
*Out: multi-persona system and a corpus that improves on a schedule.*

Rough shape: a usable, honest v1 in roughly a quarter with a small team — one person
owning research and corpus, one building, part-time design and legal review. Panel
honoraria are the main non-labor cost.

---

## 10. What we need from DISCO

1. An owner with authority to grant Tier 2 data access.
2. Access to sales call recordings, win/loss, CS notes, and survey verbatims.
3. Budget and warm introductions for the partner panel — including non-customers.
4. Legal review of corpus consent and the synthetic-persona disclosure language.
5. Agreement on the usage policy *before* launch, not after the first bad decision.

## 11. Open questions

- Internal tool only, or eventually customer- and prospect-facing? Changes the
  disclosure and confidentiality bar substantially.
- Does synthetic Jose know about DISCO's roadmap, or only about the market? Feeding it
  unreleased plans constrains where it can be used.
- Does it keep the deck's name and likeness, or get a clearly-synthetic identity?
- Jose first, or **Steven** first? The deck argues Steven is the most important
  practitioner for adoption (slide 14 notes: "Steven matters more than any other
  practitioner"), he's a heavier platform user, and DISCO therefore has far more Tier 2
  evidence on him. Jose is the more impressive demo; Steven is probably the more useful
  first build. Worth an explicit decision rather than defaulting.
- What decision, specifically, would DISCO have made differently last quarter if this
  had existed? If we can't answer that, we're building a toy.

## 12. Smallest next step

Phase 1, and specifically the Codex. One week of desk research against Tier 3 and Tier 4
produces a cited dossier and a prompt-only prototype for near-zero cost. That is enough
to (a) show DISCO the shape of the thing, (b) learn from the query log what they actually
want to ask, and (c) find out whether they'll open the Tier 2 vault — which is the real
determinant of whether this becomes an instrument or stays a party trick.
