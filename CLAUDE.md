# DISCO — Litigation World · Board Education (slide deck)

Self-contained static slide deck shown in the browser. No build step, no framework.

## Files
- `index.html` — the entire deck. Every slide is a `<section>`. An inline `<script>` at
  the bottom drives navigation, the presenter console, and the persona-video overlays.
  Speaker notes live in `<script type="application/json" id="speaker-notes">`.
- `styles.css` — all styling.
- `deck-stage.js` — stage / thumbnail-rail logic.
- `assets/` — persona videos, portrait stills, other media.
- `vercel.json` — response headers only (`noindex`). Hosted on Vercel.

## Deck model
- Slides group into chapters ("Class 1–4") via divider sections.
- Each content slide's chrome shows a running number `<em>NN</em>/ DD` and an eyebrow
  `X.Y` section number. Nav/thumbnails read `data-label` / `data-screen-label`, whose
  numeric prefix matches the slide's position.

## Persona slides
Persona slides use the `persona-detail v2` template with a click-to-play intro video.
- Assets: `assets/persona-<slug>.mp4` + `assets/persona-<slug>-portrait.png`.
- The play handler is **event-delegated** (`.av-video` button → sibling `.pv-overlay`),
  so adding a persona needs **no JS changes**.
- Full procedure + video recipe: **`docs/PERSONA-SLIDES.md`**.

## Editing rules
- Match surrounding markup exactly — indentation, class names, `ptag` and `av` color classes.
- **Inserting or reordering any slide shifts everything after it.** You must renumber
  downstream: chrome numbers `<em>NN</em>`, denominators `/ DD`, `data-label` /
  `data-screen-label` prefixes, and eyebrow `X.Y` numbers.
- After any structural edit verify: `<section>` open/close balance, chrome numbers
  sequential, eyebrows sequential.
- Vercel hosts it: pushing a branch yields a preview, `main` is production. Confirm
  whether the project is Git-connected (auto-deploy) or CLI-deployed (`vercel --prod`).
