# Synthetic persona — demo plan and build proposal

A conversational synthetic user that DISCO's **product, marketing, and sales** teams can
interrogate instead of hunting down a real litigation practitioner for every question.

Two documents in one, because they have different jobs:

- **Part A — the demo** Seesaw Labs builds on spec, to show DISCO the capability and win
  the work. Constrained, deliberately scoped, honest about its seams.
- **Part B — the real product** we're proposing DISCO fund. Part A must make Part B feel
  inevitable and correctly priced.

Primary persona: **Steven, junior partner** (deck slide 14, section 2.6). Jose appears as
a second voice, not the lead — see §A2.

Status: proposal / not yet built. Companion to the Board Education deck (`index.html`).

---

# Part A — the demo

## A1. What the demo has to prove

Not "we can build a chatbot." Anyone can build a chatbot, and if that's what DISCO sees,
their reasonable next thought is that their own engineers could do it in a sprint. The
demo has to prove three things instead:

1. **The method produces specific, checkable, non-obvious answers** — recognizably true
   to people who talk to litigators for a living.
2. **Seesaw has a rigorous approach to fidelity** — sourced evidence, confidence tiers,
   calibration against real practitioners. This is the part DISCO can't casually
   replicate, and it's what separates an instrument from a party trick.
3. **The value scales with DISCO's own data** — and that data is currently locked up
   where the demo can't reach it. This is the ask.

Point 3 is the whole commercial argument, and it changes the design of the demo. See §A3.

## A2. The evidence problem, and why Steven makes it harder

The earlier version of this plan put DISCO's institutional memory at the center of the
evidence base: sales call recordings, win/loss interviews, CS notes, RFP responses, NPS
verbatims. **Seesaw does not have any of that pre-contract.** That tier is gone from the
demo, and it was the best tier. Everything below is a response to that constraint.

What remains available to build on:

- **Public record** — legal trade press, firm AI announcements, court sanctions orders on
  unverified AI citations, bar ethics opinions, Legalweek/ILTACON panels, legal-tech
  podcasts, vendor materials, partner and associate writing on LinkedIn and in bar
  publications.
- **The deck** — `index.html` plus speaker notes. Steven's slide, the buyers-vs-users
  structure, the Class 3 AI material, the trust threshold.
- **A small self-funded panel** — 3–5 interviews Seesaw pays for out of business
  development budget. Not statistically meaningful, and we won't claim it is. Its job is
  to *demonstrate the method exists* and put a handful of real verbatims in the demo.

**Steven is the right long-term target and the harder demo target.** Senior partners like
Jose write op-eds, sit on conference panels, and give press interviews — there's a public
paper trail. Junior partners mostly don't. Steven is publicly quieter, which means the
public-record tier is thinner for him precisely where it's thickest for Jose.

That's a real cost, and it's worth naming rather than discovering mid-build. Two things
mitigate it. First, associates and junior partners *are* visible in a different register —
practice-group blog posts, CLE materials, r/biglaw and legal-Twitter griping about
workflow, ILTA panels on matter management, and the substantial body of writing about
the leverage model and billable-hour economics that defines his job. Different sources,
similar volume, more synthesis work.

Second, the thin spot is itself the pitch: **Steven is exactly the persona whose evidence
lives inside DISCO rather than in public.** He's the heavy platform user (the deck lists
DISCO among his daily tools), he sits in the demos, he's on the support tickets, he owns
the matter budget. So the demo can say, credibly and specifically: *this is Steven built
from the outside; the inside view is in your Gong library and your telemetry, and that's
what Part B buys.* That's a much stronger position than the same argument made about
Jose, who a reasonably well-read consultant could approximate from public sources.

Prediction to set expectations early: synthetic Steven will be strong on workflow pain,
time allocation, budget pressure, and career incentive; weak on vendor-specific opinion
and pricing. That's the honest shape of a public-record-only build, and it maps cleanly
onto what DISCO's data would fix.

## A3. Design the seams on purpose

The classic failure of a capability demo is that it's *too* polished. DISCO concludes the
thing is finished, thanks us, and doesn't fund Part B. Every limitation therefore needs
to be **visible, explained, and priced** rather than hidden.

The mechanism is the confidence tier, which stops being only an epistemic safeguard and
becomes the commercial argument. Every answer is labeled:

- **A — Attested.** Real practitioners addressed this specific question; verbatims exist.
  *Rare in the demo, by construction.*
- **B — Grounded.** Documented behavior of this population, extrapolated.
- **C — Inferred.** Consistent with the persona dossier, no direct evidence. Flagged.
- **D — Out of scope.** Declines, and names who'd actually have to be asked — often
  another persona, since procurement questions belong to Bill, not Steven.

And every B or C answer carries the same closing line, in the interface:

> *Confidence: Grounded. This would be Attested if the corpus included DISCO's win/loss
> interviews and partner-attended call transcripts.*

DISCO's team will hit that line a dozen times in a half-hour session. It does the selling
without anyone in the room having to pitch, and it's *true*, which is why it works. The
demo's weakness becomes the product's roadmap, legibly.

A second seam worth showing rather than hiding: the **research backlog**, auto-built from
what DISCO's own team asks during the session. "Here are the eleven questions your team
put to Steven that the evidence base couldn't answer well. That list is the interview
guide for the panel in Phase 2." Their own curiosity, turned into a scope document.

## A4. The circularity trap

**The most dangerous credibility risk in this build:** Seesaw wrote the deck. Steven is
our own composite. A synthetic Steven built primarily from the deck will agree with the
deck, and that proves exactly nothing — it's our own thinking played back through a
language model with a portrait attached.

If anyone technical at DISCO notices this before we address it, credibility is gone for
the rest of the meeting. So we address it first, unprompted:

- Ground the dossier in **external, dated, citable sources**, using the deck only as
  scaffolding and consistency check. In the demo's evidence panel, deck-sourced claims
  should be visually distinguishable from externally-sourced ones.
- Deliberately surface at least two or three places where external evidence **contradicts
  or complicates the deck's persona.** These are the most valuable moments available to
  us: they prove the system is reading evidence rather than reciting us, and they hand
  DISCO an immediate improvement to a deck they've already approved. Go looking for them
  during corpus work and treat finding none as a warning sign, not a relief.
- State the circularity risk out loud in the demo. Naming your own weakness before your
  audience finds it converts a vulnerability into evidence of rigor.

## A5. Demo scope — what to build

Two to three weeks, small team. Curation over scale everywhere.

**Build:**

1. **Steven Codex v1** — structured, versioned, cited dossier: role and firm context, the
   leverage/billable economics that drive his behavior, where his hours actually go,
   decision criteria and veto rules, risk posture, trust network (Jose above, associates
   below, litigation support sideways), vocabulary including the vendor words he doesn't
   use, known positions with citations, and an explicit unknowns list.
2. **Jose Codex v0.5** — lighter, from the existing plan work, to enable panel mode.
3. **Bill Codex v0.5** — lighter still. Needed because he's the buyer, and the
   buyer/user conflict is the best thing we can show.
4. **Curated corpus, 150–300 excerpts** — hand-picked, each tagged with source, tier,
   date, persona relevance, topic. Hand-curated beats a big messy ingest at this scale,
   and every excerpt being defensible matters more than coverage. No ingest pipeline.
5. **Chat app in the deck's design language** — reuse `styles.css` and the existing
   `assets/persona-steven.mp4` / `-portrait.png`. Visual continuity is a cheap, strong
   signal: this is the deck coming alive, not a generic tool with a lawyer costume on.
6. **Answer contract enforced in the UI** — voice, evidence panel with dates, confidence
   tier, and the "what would raise confidence" line.
7. **Wireframe / design review** — image, PDF, or written concept in; structured critique
   out, against a rubric derived from the Codex.
8. **Panel mode** — one question, three voices, conflicts intact. See §A6.
9. **Honest fidelity scorecard** — per topic, not one global number, with the small-n
   caveat stated plainly.

**Deliberately don't build:** ingest automation, all eight personas, auth or
multi-tenancy, Slack integration, automated eval harness beyond a small regression set,
anything requiring DISCO data access.

## A6. Panel mode is the money shot

The single strongest thing to demo, because it's the deck's own central thesis made
operational. Deck slide 19: *the buyers and the users are not the same people.* DISCO has
already accepted that argument — they bought the deck.

So: one question in, three answers out, with the disagreement preserved and visible.

> *"We're considering an AI-generated case summary feature that drafts the client update."*
>
> **Steven** wants it badly and immediately asks who owns the error if it's wrong, because
> he's the one who'd sign off before it reaches Jose.
> **Jose** doesn't care about the feature; he cares whether he can trust the output in
> front of a client, and the deck's trust threshold says drafting hasn't crossed the line.
> **Bill** asks where the data goes, which model, and how it survives the firm's security
> review.

Three real, incompatible objections to one feature, sourced and confidence-tagged. No
amount of prompt-engineering polish beats that structurally — it's a genuine analytical
output, and it's the thing a single customer interview *cannot* give you. It also
demonstrates the Part B expansion path without a slide about the Part B expansion path.

## A7. Choreography — one demo, three audiences

The three teams have different jobs and different tolerance for being impressed. Design a
beat for each.

**Sales — the best beachhead, and open here.** Pre-call rehearsal: *"I'm walking into a
pitch at an AmLaw 50 firm next week; the junior partner will be in the room. What does he
push back on?"* Sales can validate the answer against their own lived experience
instantly. That's the point — credibility comes from DISCO's own people recognizing truth,
not from novelty. Open with the beat that's easiest for the room to check.

**Product — the highest-value beat.** Wireframe critique plus adoption verdict. Handle the
live-upload question carefully; see §A8.

**Marketing — the most underrated beat.** Message testing against a persona who will tell
you which of your words he'd never use. Run DISCO's actual current positioning line
through it and see what comes back. Also competitor perception: what has Steven heard
about Harvey, and how does that differ from what's documented?

Sequence: two or three answers they can immediately verify as true, *then* one genuinely
non-obvious answer, *then* panel mode, *then* the research backlog and the ask. Recognition
first, insight second, scope third.

## A8. Demo risk management

- **Live LLM demos fail.** Rehearse hero paths until they're reliable, but keep genuine
  live capability — a demo that's obviously on rails proves nothing. Have fallbacks for
  every beat.
- **The live wireframe upload** is the highest-risk, highest-reward moment. Inviting DISCO
  to bring their own unreleased design is enormously impressive if it lands and damaging
  if the critique is generic. Hedge: seed a few of DISCO's public product screenshots
  during corpus work so the retrieval has something real to reason against, and rehearse
  against comparable competitor UI. Decide in advance whether to invite the cold upload;
  if we do, frame it as a stress test rather than a showcase, so a mediocre answer reads
  as honesty rather than failure.
- **Sycophancy is the dominant failure mode of every persona bot.** A synthetic Steven who
  likes every wireframe is worthless, and a product team will spot it within three
  prompts. Adversarially test before the demo: try to get him to endorse something a real
  junior partner would reject on sight. He must be capable of "I wouldn't use this, and
  here's the one thing that would change my mind."
- **He must sometimes say the feature isn't for him.** For plenty of wireframes the true
  answer is that Bo or Tanner is the user. That answer builds more trust than enthusiasm.
- **Don't let the demo answer pricing questions.** It's the weakest topic on a
  public-only corpus and the one most likely to produce a confidently wrong number that
  someone remembers. Tier D it explicitly.

## A9. What Seesaw leaves behind

The meeting ends; the artifacts have to keep working. Three things, and the proposal
should be one of them so approval is a signature rather than a fresh decision cycle:

1. **The Steven Codex as a standalone document** — genuinely useful to DISCO even if they
   never fund Part B. Tangible, readable, cited, obviously laborious.
2. **The fidelity scorecard and research backlog** — what's weak, what their team asked
   that we couldn't answer, and what data would fix it.
3. **The Part B proposal, priced**, with the phase gates from §B2.

## A10. Commercial and legal notes

- **IP and ownership.** Agree up front who owns the Codex, the curated corpus, and the
  application if DISCO doesn't proceed. Ambiguity here gets expensive later.
- **Panel consent.** The 3–5 self-funded interviewees need explicit consent that their
  input informs a synthetic persona shown to a third party.
- **Composite only, never a real likeness.** Steven stays synthesized from many
  practitioners. Modeling him on one identifiable customer creates confidentiality and
  relationship risk for no analytical gain.
- **Label it synthetic, always** — including inside the demo UI. Under-claiming is a
  competitive advantage here: DISCO's team is professionally suspicious of AI that
  overstates itself, and the deck's own trust-threshold argument (§ slide 24) says
  verifiability is what earns adoption. Demoing a tool that shows its sources and admits
  its gaps *is* the argument, performed.

---

# Part B — the real product (what we're proposing DISCO fund)

## B1. What changes when DISCO is paying

**The evidence base opens up.** This is the substance of Part B:

- Sales call recordings and transcripts, filtered to practitioner attendees.
- Win/loss write-ups, churn reasons, save-attempt notes.
- CS and QBR notes, escalation threads, support tickets.
- RFP and security questionnaire responses — these encode what firms actually
  interrogate.
- NPS and survey verbatims; field notes from conferences and roadshows.
- **Product telemetry.** This is where Steven-first pays off. Jose barely touches the
  platform, so analytics can't see him; Steven is a daily user, so behavioral evidence
  and stated evidence can be cross-checked against each other. That's a category of
  rigor unavailable for any other persona and unavailable to the demo.

**A real panel becomes possible:** 8–12 practitioners, mixed customers and non-customers
(a customer-only panel yields a synthetic Steven who likes DISCO), on a refresh cadence
rather than one-time collection.

**Calibration becomes real.** Blind paired comparison — the same questions to the panel
and to synthetic Steven, with practitioners asked to identify which answer is synthetic
and to grade substance, priority ordering, and register. Per-topic fidelity scores, a
regression suite so prompt and corpus changes can't silently degrade quality, and a
standing adversarial pass for sycophancy.

**Architecture hardens:** real ingest and tagging pipeline, hybrid retrieval with tier and
recency filters, the full persona cast, panel mode across all eight, Slack delivery (which
puts the persona where product debates actually happen), and usage instrumentation.

## B2. Phases and gates

**Phase 1 — the demo.** Seesaw, on spec, ~2–3 weeks. Part A above.
*Gate: DISCO funds Phase 2, and grants data access.*

**Phase 2 — corpus and hardening.** ~4 weeks. Ingest DISCO's internal evidence, harden
retrieval, rebuild the Codex against real data, ship the application properly.
*Gate: measurable fidelity lift over the demo baseline, visible per topic.*

**Phase 3 — panel and calibration.** ~4–6 weeks, mostly recruiting latency, so start
recruiting during Phase 2. Panel interviews, Tier 1 into the corpus, blind comparison,
published scorecard.
*Gate: fidelity bar agreed in Phase 0 is met.*

**Phase 4 — cast and flywheel.** Ongoing. Remaining personas, panel mode across the cast,
query log wired into the panel interview guide, refresh cadence, instrumentation of which
answers teams actually act on.

## B3. Usage policy — agree before launch, not after

The demo should introduce this, because proposing your own guardrails reads as maturity
rather than hedging.

- **Green-light:** exploring and pressure-testing ideas, surfacing objections before a
  real customer call, writing better interview questions, onboarding new PMs and AEs into
  the persona, demo prep, red-teaming positioning.
- **Red-light:** go/no-go decisions, roadmap prioritization, pricing calls, quantitative
  claims ("70% of partners would…"), or any assertion of customer demand in board
  material without the fidelity score and method attached.

Put it in the interface. Convincing answers get over-trusted by default, not by malice.

## B4. Open questions

- Internal only, or eventually prospect-facing? Changes the confidentiality and
  disclosure bar substantially. Recommendation: internal for Phases 1–3.
- Does the persona know DISCO's unreleased roadmap? Feeding it in constrains where it can
  be used and who can query it.
- Does Steven keep the deck's name and likeness in the product, or get a clearly
  synthetic identity?
- **The question to put to DISCO in the demo:** what decision did you make last quarter
  that you'd have made differently with this? Their answer is the business case, in their
  words, which is worth more than ours — and it tells us which team to build for first.
