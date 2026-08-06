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
  D: 'Out of scope — declined',
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
    face.style.backgroundImage = `url('../assets/${p.portrait}')`;
    face.innerHTML = '';
  } else {
    // Panel mode has no single face — show the three it fans out to.
    face.style.backgroundImage = 'none';
    face.innerHTML = ['steven', 'jose', 'bill']
      .map((s) => `<span class="stack ${s}" style="background-image:url('../assets/${PERSONAS[s].portrait}')"></span>`)
      .join('');
  }
  document.querySelectorAll('.who-b').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.persona === persona);
  });
  qBox.placeholder =
    persona === 'panel'
      ? 'Ask one question, get three incompatible answers…'
      : `Ask ${p.name} a question, or attach a design…`;
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

  if (a.am_i_the_user && a.am_i_the_user !== 'n/a') {
    const warn = a.am_i_the_user === 'no' ? ' warn' : '';
    cells.push(
      `<div class="cell${warn}"><dt>Am I the user?</dt><dd>${a.am_i_the_user}</dd></div>`,
    );
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

  const grid = cells.length
    ? `<dl class="grid" style="grid-template-columns:repeat(${Math.min(cells.length, 2)},1fr)">${cells.join('')}</dl>`
    : '';

  const why = `<p class="why"><b>Confidence ${tier} — ${TIER_COPY[tier]}.</b> ${a.confidence_reason || ''}${
    a.what_would_raise_it ? ` <br><b>What would raise it:</b> ${a.what_would_raise_it}` : ''
  }</p>`;

  const srcs = a.sources && a.sources.length
    ? `<div class="srcs"><h3>Evidence</h3><ol>${a.sources.map(sourceLine).join('')}</ol></div>`
    : '<div class="srcs"><h3>Evidence</h3><p class="note">Nothing in the evidence base covers this.</p></div>';

  const meter = a.usage
    ? `<p class="meter">${a.usage.input} in · ${a.usage.cache_read} cached · ${a.usage.output} out</p>`
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

fileInput.addEventListener('change', () => {
  const f = fileInput.files && fileInput.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const url = reader.result;
    image = { media_type: f.type, data: url.split(',')[1], url };
    attachedImg.src = url;
    attached.hidden = false;
  };
  reader.readAsDataURL(f);
});

el('dropAttach').addEventListener('click', () => {
  image = null;
  fileInput.value = '';
  attached.hidden = true;
});

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
      if (['C', 'D'].includes((a.confidence || '').toUpperCase()) && !backlog.includes(text)) {
        backlog.push(text);
      }
    });
    renderBacklog();
  } catch (err) {
    histories[persona].pop(); // drop the unanswered turn so retry is clean
    renderThread();
    const box = document.createElement('div');
    box.className = 'turn err';
    box.textContent = err.message;
    thread.appendChild(box);
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
