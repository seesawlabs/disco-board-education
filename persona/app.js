/* Synthetic user — prototype client.
 *
 * Talks to /api/persona. Keeps one transcript per persona so switching voices
 * doesn't discard context. Everything the answer contract returns is rendered:
 * voice, confidence tier, what would raise it, and resolved sources.
 */

const PERSONAS = {
  steven: { name: 'Steven', role: 'Junior partner · Top AmLaw firm', portrait: 'persona-steven-portrait.png' },
  jose:   { name: 'Jose',   role: 'Senior partner · Top AmLaw firm', portrait: 'persona-jose-portrait.png' },
  bill:   { name: 'Bill',   role: 'Technology operations lead',      portrait: 'persona-bill-portrait.png' },
  panel:  { name: 'All three', role: 'Steven, Jose and Bill — same question', portrait: null },
};

const TIER_COPY = {
  A: 'Attested — real practitioners addressed this',
  B: 'Grounded — documented behaviour, extrapolated',
  C: 'Inferred — no direct evidence',
  D: 'Evidence gap — not collected yet',
  W: 'Misaddressed — wrong person to ask',
};

const el = (id) => document.getElementById(id);
const thread = el('thread');
const composer = el('composer');
const qBox = el('q');
const sendBtn = el('send');
const fileInput = el('file');
const attached = el('attached');
const attachedImg = el('attachedImg');

let persona = 'steven';
let image = null;             // { media_type, data, url }
let busy = false;
const histories = { steven: [], jose: [], bill: [], panel: [] };
const backlog = [];

/* ─────────────────────────── persona switching ─────────────────────────── */

function paintPersona() {
  const p = PERSONAS[persona];
  el('pname').textContent = p.name;
  el('prole').textContent = p.role;
  const face = el('pface');
  if (p.portrait) {
    face.style.backgroundImage = `url('/assets/${p.portrait}')`;
    face.innerHTML = '';
  } else {
    // Panel mode has no single face — show the three it fans out to.
    face.style.backgroundImage = 'none';
    face.innerHTML = ['steven', 'jose', 'bill']
      .map((s) => `<span class="stack ${s}" style="background-image:url('/assets/${PERSONAS[s].portrait}')"></span>`)
      .join('');
  }
  document.querySelectorAll('.who-b').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.persona === persona);
  });
  qBox.placeholder =
    persona === 'panel'
      ? 'Ask one question, get three incompatible answers…'
      : `Ask ${p.name} a question, or attach a design…`;
  el('dropzone').firstElementChild.textContent =
    persona === 'panel'
      ? 'Drop the design — all three will react'
      : `Drop the design to have ${p.name} react to it`;
  renderThread();
}

el('who').addEventListener('click', (e) => {
  const btn = e.target.closest('.who-b');
  if (!btn || busy) return;
  persona = btn.dataset.persona;
  paintPersona();
});

/* ─────────────────────────────── rendering ─────────────────────────────── */

function sourceLine(s) {
  const pill = s.tier === 4
    ? '<span class="pill deck">our deck</span>'
    : '<span class="pill pub">public</span>';
  const unv = s.verified ? '' : '<span class="pill unv">unverified figure</span>';
  const label = s.url
    ? `<a href="${s.url}" target="_blank" rel="noopener">${s.source}</a>`
    : s.source;
  return `<li>${pill}${unv}${label}${s.date ? ` · ${s.date}` : ''}</li>`;
}

function answerCard(a) {
  const tier = (a.confidence || 'C').toUpperCase();
  const cells = [];

  if (a.right_person) {
    const warn = a.right_person === 'no' ? ' warn' : '';
    cells.push(
      `<div class="cell${warn}"><dt>Right person to ask?</dt><dd>${a.right_person}</dd></div>`,
    );
  }
  if (a.who_to_ask) {
    cells.push(`<div class="cell"><dt>Who actually owns this</dt><dd>${a.who_to_ask}</dd></div>`);
  }
  if (a.would_let_team_adopt && a.would_let_team_adopt !== 'n/a') {
    cells.push(
      `<div class="cell"><dt>Would I let my team adopt it?</dt><dd>${a.would_let_team_adopt}</dd></div>`,
    );
  }
  if (a.objection) {
    cells.push(`<div class="cell"><dt>The objection I'd raise</dt><dd>${a.objection}</dd></div>`);
  }
  if (a.what_would_change_it) {
    cells.push(
      `<div class="cell"><dt>What would have to change</dt><dd>${a.what_would_change_it}</dd></div>`,
    );
  }

  // An odd cell count would leave a hole in a two-column grid, which reads as a
  // rendering bug — let the last one span instead.
  if (cells.length > 1 && cells.length % 2 === 1) {
    cells[cells.length - 1] = cells[cells.length - 1].replace(
      '<div class="cell', '<div style="grid-column:1/-1" class="cell',
    );
  }
  const grid = cells.length
    ? `<dl class="grid" style="grid-template-columns:repeat(${Math.min(cells.length, 2)},1fr)">${cells.join('')}</dl>`
    : '';

  // W is an outcome, not a rung on the confidence scale — don't label it as one.
  const lead = tier === 'W' ? TIER_COPY.W : `Confidence ${tier} — ${TIER_COPY[tier]}`;
  const why = `<p class="why"><b>${lead}.</b> ${a.confidence_reason || ''}${
    a.what_would_raise_it ? ` <br><b>What would raise it:</b> ${a.what_would_raise_it}` : ''
  }</p>`;

  const srcs = a.sources && a.sources.length
    ? `<div class="srcs"><h3>Evidence</h3><ol>${a.sources.map(sourceLine).join('')}</ol></div>`
    : '<div class="srcs"><h3>Evidence</h3><p class="note">Nothing in the evidence base covers this.</p></div>';

  // Show the real prompt size. `uncached` alone looks absurdly small because the
  // dossier and evidence arrive as a cache read or write, not as fresh input.
  const u = a.usage;
  const meter = u
    ? `<p class="meter">${u.total_in.toLocaleString()} in (${
        u.cache_read ? `${u.cache_read.toLocaleString()} from cache` : `${u.cache_write.toLocaleString()} cache write`
      }, ${u.uncached} new) · ${u.output.toLocaleString()} out</p>`
    : '';

  return `
    <article class="ans">
      <header class="ans-h">
        <span class="av ${a.persona}">${a.name.charAt(0)}</span>
        <span class="ans-n">${a.name}</span>
        <span class="ans-r">${a.role}</span>
        <span class="badge ${tier.toLowerCase()}">${tier}</span>
      </header>
      <div class="ans-b">
        <p class="voice">${escapeHtml(a.answer)}</p>
        ${grid}${why}${srcs}
      </div>
      ${meter}
    </article>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
  );
}

function renderThread() {
  const h = histories[persona];
  if (!h.length) {
    thread.innerHTML = thread.dataset.intro || thread.innerHTML;
    return;
  }
  thread.innerHTML = h
    .map((t) => {
      if (t.role === 'user') {
        const img = t.imageUrl ? `<img src="${t.imageUrl}" alt="Attached design">` : '';
        return `<div class="turn mine"><div class="bubble">${img}${escapeHtml(t.content)}</div></div>`;
      }
      return `<div class="turn">${t.answers.map(answerCard).join('')}</div>`;
    })
    .join('');
  thread.scrollTop = thread.scrollHeight;
}

function renderBacklog() {
  if (!backlog.length) return;
  el('backlogBox').hidden = false;
  el('backlog').innerHTML = backlog.map((q) => `<li>${escapeHtml(q)}</li>`).join('');
}

/* ──────────────────────────── image attachment ─────────────────────────── */
/* Three ways in — paste, drag-and-drop, file picker — all funnelling through
 * acceptImage() so the downscaling can't be bypassed. A raw retina screenshot
 * base64s past Vercel's ~4.5MB request limit and would 413 before reaching the
 * model, so scaling is required, not cosmetic. It also caps image tokens.        */

const MAX_EDGE = 1568;   // long edge; above this the extra pixels mostly cost tokens
const PNG_CEILING = 1.2 * 1024 * 1024; // beyond this, re-encode as JPEG

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

async function acceptImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    showError('That file is not an image. PNG, JPEG, WebP or GIF.');
    return;
  }
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    // Flatten onto white so transparent PNGs don't read as black in JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // PNG keeps UI text crisp; fall back to JPEG when that gets too heavy.
    let url = canvas.toDataURL('image/png');
    let media_type = 'image/png';
    if (url.length * 0.75 > PNG_CEILING) {
      url = canvas.toDataURL('image/jpeg', 0.9);
      media_type = 'image/jpeg';
    }

    image = { media_type, data: url.split(',')[1], url };
    attachedImg.src = url;
    el('attachedMeta').textContent =
      `${w}×${h} · ${Math.round((url.length * 0.75) / 1024)} KB` +
      (scale < 1 ? ` · scaled from ${img.width}×${img.height}` : '');
    attached.hidden = false;
    qBox.focus();
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  const box = document.createElement('div');
  box.className = 'turn err';
  box.textContent = msg;
  thread.appendChild(box);
  thread.scrollTop = thread.scrollHeight;
}

fileInput.addEventListener('change', () => {
  acceptImage(fileInput.files && fileInput.files[0]);
});

el('dropAttach').addEventListener('click', () => {
  image = null;
  fileInput.value = '';
  attached.hidden = true;
});

// Paste — the natural gesture after ⌘⇧4. Ignored while typing a normal paste
// into the textarea unless the clipboard actually carries an image.
document.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  acceptImage(item.getAsFile());
});

// Drag and drop anywhere over the conversation.
const stage = el('stage');
let dragDepth = 0;   // dragenter/leave fire per child; count to avoid flicker
const carriesFile = (e) => [...(e.dataTransfer?.types || [])].includes('Files');

stage.addEventListener('dragenter', (e) => {
  if (!carriesFile(e)) return;
  e.preventDefault();
  dragDepth++;
  stage.classList.add('is-dragging');
});
stage.addEventListener('dragover', (e) => {
  if (carriesFile(e)) e.preventDefault();
});
stage.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) { dragDepth = 0; stage.classList.remove('is-dragging'); }
});
stage.addEventListener('drop', (e) => {
  if (!carriesFile(e)) return;
  e.preventDefault();
  dragDepth = 0;
  stage.classList.remove('is-dragging');
  acceptImage(e.dataTransfer.files && e.dataTransfer.files[0]);
});
// A drop that lands outside the stage would otherwise navigate away from the page.
window.addEventListener('dragover', (e) => { if (carriesFile(e)) e.preventDefault(); });
window.addEventListener('drop', (e) => { if (carriesFile(e)) e.preventDefault(); });

/* ──────────────────────────────── sending ──────────────────────────────── */

el('seeds').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-seed]');
  if (!btn || busy) return;
  qBox.value = btn.dataset.seed;
  qBox.focus();
  autogrow();
});

function autogrow() {
  qBox.style.height = 'auto';
  qBox.style.height = `${Math.min(qBox.scrollHeight, 180)}px`;
}
qBox.addEventListener('input', autogrow);
qBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = qBox.value.trim();
  if (!text || busy) return;

  const mode = image ? 'review' : 'chat';
  const sentImage = image;

  histories[persona].push({ role: 'user', content: text, imageUrl: sentImage?.url || null });
  qBox.value = '';
  autogrow();
  image = null;
  fileInput.value = '';
  attached.hidden = true;

  busy = true;
  sendBtn.disabled = true;
  renderThread();
  const waiting = document.createElement('div');
  waiting.className = 'turn wait';
  waiting.textContent =
    persona === 'panel' ? 'Three answers coming — this takes a moment…' : 'Thinking…';
  thread.appendChild(waiting);
  thread.scrollTop = thread.scrollHeight;

  try {
    // Send only role/content — the API doesn't want our UI fields.
    const wire = histories[persona].map((t) => ({
      role: t.role,
      content:
        t.role === 'user'
          ? t.content
          : t.answers.map((a) => (t.answers.length > 1 ? `${a.name}: ${a.answer}` : a.answer)).join('\n\n'),
    }));

    const res = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona,
        mode,
        messages: wire,
        image: sentImage ? { media_type: sentImage.media_type, data: sentImage.data } : null,
      }),
    });

    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || `Request failed (${res.status}).`);

    histories[persona].push({ role: 'assistant', answers: payload.answers });

    // Anything the evidence base couldn't carry becomes a research task.
    payload.answers.forEach((a) => {
      if (['C', 'D', 'W'].includes((a.confidence || '').toUpperCase()) && !backlog.includes(text)) {
        backlog.push(text);
      }
    });
    renderBacklog();
  } catch (err) {
    histories[persona].pop(); // drop the unanswered turn so retry is clean
    renderThread();
    showError(err.message);
  } finally {
    busy = false;
    sendBtn.disabled = false;
    waiting.remove();
    if (histories[persona].at(-1)?.role === 'assistant') renderThread();
  }
});

/* ──────────────────────────────── startup ─────────────────────────────── */

thread.dataset.intro = thread.innerHTML;
paintPersona();
