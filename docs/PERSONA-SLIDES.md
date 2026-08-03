# Playbook: persona slides & their intro videos

How to add or edit a persona slide in `index.html`. Personas currently: Amanda, Bill,
Jose, Steven, Bo, Tanner, Erin, Vishal.

## Video + portrait assets

Naming (in `assets/`): `persona-<slug>.mp4` and `persona-<slug>-portrait.png`
(slug = lowercase first name, e.g. `erin`, `vishal`).

Raw exports (e.g. from Flow) are large; the committed videos are compressed to a few MB.
Transcode to match, and cut the portrait still from a frame:

~~~bash
# compress to ~720p H.264
ffmpeg -i RAW.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k \
  assets/persona-<slug>.mp4
# portrait still (bump -ss to pick a nicer frame)
ffmpeg -y -i RAW.mp4 -ss 1 -frames:v 1 assets/persona-<slug>-portrait.png
~~~

The portrait is used as the `background-image` of the play button; keep it portrait-ish
(the six originals are 600×760-class). A placeholder gradient PNG is acceptable until the
real still exists — the slide still renders.

## Anatomy of a persona `<section>`

Duplicate an existing persona section (search `persona-detail v2`) and swap these fields:

- `data-label="NN <Name>"` and `data-screen-label="NN Persona — <Name>"` — NN = slide position.
- eyebrow: `<span class="n">X.Y</span>` (section number) + `<span class="lbl">…</span>`.
- portrait button: `data-video="assets/persona-<slug>.mp4"`, the `aria-label`, the
  `background-image:url('assets/persona-<slug>-portrait.png')`, and the `.pd-namecard`
  (name + role line).
- `.pd-tags-row` — three `.pd-tag` chips.
- `.pd-quote` — the pull quote.
- "Uses daily" card — `ptag` + three `.pd-tool`s + `.pd-note`.
- "Buys" card — `ptag` + `.pd-buy` text.
- chrome: `<span class="num"><em>NN</em>/ DD</span>`.
- `.pv-overlay` at the end — its `<video class="pv-video" src="assets/persona-<slug>.mp4">`.

No JavaScript changes: the `.av-video` → `.pv-overlay` click handler is delegated.

### Colour classes
- `ptag`: `buyer` (coral), `user` / `champion` (teal), `none` (grey).
- `av` avatar: `coral`, `teal`, `ink`.

## Adding a persona — full checklist

1. Produce assets: `persona-<slug>.mp4` + `persona-<slug>-portrait.png`.
2. Insert the new persona `<section>` at the right spot among the persona slides.
3. Update the **four cross-reference slides** that list the cast:
   - **Two Entities** (roster) — add the role under the correct entity/group.
   - **The People** (practitioner grid) — add a `.person` card and bump the
     "…practitioners" count in the headline and caption.
   - **Buyers vs Users** — add a `.persona-card`.
   - **Shared Absence** (faces row) — add an `.av` face and bump the "N roles" caption.
4. **Renumber downstream** (everything after the insertion): chrome `<em>NN</em>`,
   denominators `/ DD`, `data-label` / `data-screen-label` prefixes, eyebrow `X.Y`.
5. Verify: `<section>` open/close balance is equal; chrome numbers run sequentially;
   eyebrows run sequentially; the play button opens the video.

## Ship it
Commit on a branch, push → Vercel preview for client review → merge to `main` for prod.
