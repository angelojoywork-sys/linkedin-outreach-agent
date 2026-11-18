const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byId = id => PEOPLE.find(p => p.id === id);
const first = p => p.name.split(' ')[0];
const icon = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const avatar = (p, size = '') =>
  `<span class="av ${size}" style="--h:${p.hue}" aria-hidden="true">${p.name.split(' ').map(w => w[0]).join('')}</span>`;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const shell = $('#shell');
const pane = $('#pane');

const state = {
  filter: 'new',                       // 'new' | 'inbox'
  activeId: NEW_PEOPLE[0].id,
  drafts: {},                          // id -> { tone, extra, text, edited, said, prev }
  sent: new Set(),
};

function draftFor(p) {
  if (!state.drafts[p.id]) {
    const d = { tone: 'base', extra: null, edited: false, said: '', prev: null };
    d.text = buildDraft(p, d);
    state.drafts[p.id] = d;
  }
  return state.drafts[p.id];
}

/* ---------- list ---------- */

function renderList() {
  const newOnes = state.filter === 'new';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
  const unsent = NEW_PEOPLE.filter(p => !state.sent.has(p.id)).length;
  $('#badge').textContent = unsent || '';
  $('#badge').hidden = !unsent;
  const people = newOnes ? NEW_PEOPLE : PEOPLE.filter(p => !p.isNew || state.sent.has(p.id)).sort((a, b) => b.isNew - a.isNew);
  $('#convos').innerHTML = people.map(p => {
    const last = p.thread[p.thread.length - 1];
    const sent = state.sent.has(p.id);
    let meta, preview;
    if (newOnes) {
      meta = p.when;
      preview = sent ? `${icon('check')}Sent` : `${icon('spark')}Draft ready`;
    } else {
      meta = last ? last.time : '';
      preview = esc((last.from === 'me' ? 'You: ' : '') + last.text.replace(/\n+/g, ' '));
    }
    return `<li><button class="convo ${p.id === state.activeId ? 'on' : ''}" data-open="${p.id}" type="button">
      ${avatar(p)}
      <span class="convo-txt">
        <span class="convo-top"><b>${esc(p.name)}</b><time>${esc(meta)}</time></span>
        <span class="convo-prev ${newOnes ? (sent ? 'is-sent' : 'is-draft') : ''}">${preview}</span>
      </span></button></li>`;
  }).join('');
}

/* ---------- pane ---------- */

function micBtn(target, auto, label) {
  return `<button class="icon-btn mic" type="button" data-mic="${target}" ${auto ? 'data-auto' : ''} aria-label="${label}" aria-pressed="false"
    ${SR ? '' : 'disabled title="Voice input needs Chrome, Edge or Safari"'}>${icon('mic')}</button>`;
}

function renderPane(focusHead) {
  stopVoice();
  const p = byId(state.activeId);
  const sent = state.sent.has(p.id);
  const assisted = p.isNew && !sent;
  const d = assisted ? draftFor(p) : null;

  const connectNote = p.isNew ? `<p class="sys">You connected with ${esc(first(p))} · ${esc(p.when.toLowerCase())}</p>` : '';
  const msgs = p.thread.length
    ? p.thread.map(m => `<div class="msg ${m.from}"><p>${esc(m.text)}</p><time>${esc(m.time)}</time></div>`).join('')
    : '';

  pane.innerHTML = `
    <header class="pane-head">
      <button class="icon-btn m-only" data-back type="button" aria-label="Back to conversations">${icon('back')}</button>
      ${avatar(p)}
      <div class="head-txt"><h2 tabindex="-1">${esc(p.name)}</h2><p class="sub">${esc(p.headline)}</p></div>
    </header>
    <div class="msgs scroll" id="msgs">${connectNote}${msgs}</div>
    <form class="composer" id="composer">
      ${assisted ? assistHtml(p, d) : ''}
      <textarea id="compose" rows="${assisted ? 6 : 3}" placeholder="Write a message, or dictate one" aria-label="Message to ${esc(p.name)}">${assisted ? esc(d.text) : ''}</textarea>
      <div class="toolbar">
        <div class="tools">
          <button class="icon-btn deco" type="button" disabled aria-label="Attach image" title="Not part of this study">${icon('image')}</button>
          <button class="icon-btn deco" type="button" disabled aria-label="Attach file" title="Not part of this study">${icon('clip')}</button>
          <button class="icon-btn deco gif" type="button" disabled aria-label="GIF" title="Not part of this study">GIF</button>
          <button class="icon-btn deco" type="button" disabled aria-label="Emoji" title="Not part of this study">${icon('smile')}</button>
          ${micBtn('compose', false, 'Dictate your message')}
        </div>
        <p class="voice-note" id="note-compose" role="status">${SR ? '' : 'Voice input needs Chrome, Edge or Safari.'}</p>
        <button class="btn btn-primary" id="sendBtn" type="submit" ${assisted && d.text.trim() ? '' : 'disabled'}>Send</button>
      </div>
    </form>`;
  const m = $('#msgs');
  m.scrollTop = m.scrollHeight;
  if (focusHead) $('h2', pane).focus({ preventScroll: true });
}

function assistHtml(p, d) {
  const chip = (cls, key, label, on) => `<button class="chip ${on ? 'on' : ''}" type="button" ${cls}="${key}" aria-pressed="${on}">${label}</button>`;
  return `<div class="assist">
    <div class="assist-head">
      <span class="assist-title">${icon('spark')}Assistant draft</span>
      <ul class="basis" aria-label="Based on">${p.basis.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
    </div>
    <div class="field">
      <input id="ask" type="text" placeholder="Tell the assistant what to change, or press the mic" autocomplete="off" aria-label="Instruction for the assistant">
      ${micBtn('ask', true, 'Speak an instruction')}
      <button class="btn" type="button" id="applyAsk">Apply</button>
    </div>
    <p class="voice-note" id="note-ask" role="status">${d.said ? esc(d.said) : ''}${d.prev ? ' <button class="link" type="button" id="undo">Undo</button>' : ''}</p>
    <div class="chips">
      ${Object.entries(TONES).map(([k, t]) => chip('data-tone', k, t.label, !d.edited && d.tone === k)).join('')}
      <span class="chip-sep" aria-hidden="true"></span>
      ${Object.entries(EXTRAS).map(([k, x]) => chip('data-extra', k, x.label, !d.edited && d.extra === k)).join('')}
    </div>
  </div>`;
}

/* ---------- editing the draft ---------- */

function rewrite(p, patch, said) {
  const d = draftFor(p);
  d.prev = { text: d.text, tone: d.tone, extra: d.extra, edited: d.edited };
  Object.assign(d, patch, { edited: false });
  d.text = buildDraft(p, d);
  d.said = said;
  renderPane();
  $('#ask')?.focus();
}

function applyInstruction(raw) {
  const p = byId(state.activeId);
  const text = raw.trim();
  if (!text) return;
  const d = draftFor(p);
  const tone = Object.keys(TONES).find(k => TONES[k].match.test(text));
  const extra = Object.keys(EXTRAS).find(k => EXTRAS[k].match.test(text));
  if (!tone && !extra) {
    d.said = 'This demo understands: shorter, warmer, more formal, ask for a chat, share my portfolio, ask about roles. A live assistant would take any instruction.';
    renderPane();
    $('#ask')?.focus();
    return;
  }
  const said = [tone && TONES[tone].said, extra && EXTRAS[extra].said].filter(Boolean).join(' ') || 'Back to the original draft.';
  rewrite(p, { tone: tone || d.tone, extra: extra || (tone === 'base' ? null : d.extra) }, said);
}

/* ---------- voice ---------- */

let rec = null;
const VOICE_ERR = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser\'s site settings, or type instead.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in your browser\'s site settings, or type instead.',
  'no-speech': 'No speech heard. Press the mic to try again.',
  'audio-capture': 'No microphone found. Type instead.',
  'network': 'Voice input needs a connection. Type instead.',
};

function stopVoice() { if (rec) { const r = rec; rec = null; r.abort(); } }

function toggleMic(btn) {
  if (rec) { const same = rec.btn === btn; rec.stop(); if (same) return; }
  const target = document.getElementById(btn.dataset.mic);
  const note = document.getElementById('note-' + btn.dataset.mic);
  const auto = 'auto' in btn.dataset;
  const base = target.value ? target.value.replace(/\s*$/, ' ') : '';
  let finalTxt = '', err = '';
  const r = new SR();
  r.btn = btn;
  r.lang = navigator.language || 'en-US';
  r.interimResults = true;
  r.continuous = !auto;
  r.onstart = () => {
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Stop listening');
    btn.innerHTML = icon('stop');
    note.className = 'voice-note';
    note.textContent = auto ? 'Listening. Say what to change, for example "make it warmer and ask for a quick chat".' : 'Listening. Speak, then press stop. Your browser turns the speech into text.';
  };
  r.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTxt += t; else interim += t;
    }
    target.value = base + finalTxt + interim;
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };
  r.onerror = e => { if (e.error !== 'aborted') err = VOICE_ERR[e.error] || 'Voice input stopped. Type instead.'; };
  r.onend = () => {
    const wasCurrent = rec === r;
    if (wasCurrent) rec = null;
    if (!btn.isConnected) return;
    if (auto && finalTxt.trim() && !err && wasCurrent) { applyInstruction(target.value); return; }
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', auto ? 'Speak an instruction' : 'Dictate your message');
    btn.innerHTML = icon('mic');
    note.className = 'voice-note' + (err ? ' err' : '');
    note.textContent = err || (finalTxt && !auto ? 'Check the text before you send it.' : '');
    target.focus();
  };
  rec = r;
  try { r.start(); } catch { rec = null; }
}

/* ---------- send ---------- */

function send() {
  const p = byId(state.activeId);
  const text = $('#compose').value.trim();
  if (!text) return;
  p.thread.push({ from: 'me', text, time: 'Now' });
  let note = `Sent to ${first(p)}.`;
  if (p.isNew && !state.sent.has(p.id)) {
    state.sent.add(p.id);
    const next = NEW_PEOPLE.find(q => !state.sent.has(q.id));
    if (state.filter === 'new' && next) { state.activeId = next.id; note += ` Next: ${first(next)}.`; }
    else if (!next) note += ' All new connections have a message.';
  }
  $('#listNote').textContent = note;
  renderList();
  renderPane(true);
}

/* ---------- events ---------- */

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  if (d.filter) {
    state.filter = d.filter;
    $('#listNote').textContent = '';
    const pool = d.filter === 'new' ? NEW_PEOPLE : PEOPLE.filter(p => !p.isNew || state.sent.has(p.id));
    if (!pool.some(p => p.id === state.activeId)) state.activeId = (d.filter === 'new' ? NEW_PEOPLE : OLD_PEOPLE)[0].id;
    renderList(); renderPane();
  }
  else if (d.open) { state.activeId = d.open; shell.dataset.pane = 'pane'; $('#listNote').textContent = ''; renderList(); renderPane(true); }
  else if ('back' in d) { shell.dataset.pane = 'list'; stopVoice(); }
  else if (d.mic) toggleMic(t);
  else if (d.tone) { const p = byId(state.activeId); rewrite(p, { tone: d.tone, extra: d.tone === 'base' ? null : draftFor(p).extra }, TONES[d.tone].said || 'Back to the original draft.'); }
  else if (d.extra) { const p = byId(state.activeId), cur = draftFor(p); rewrite(p, { extra: cur.extra === d.extra && !cur.edited ? null : d.extra }, cur.extra === d.extra && !cur.edited ? 'Removed the extra line.' : EXTRAS[d.extra].said); }
  else if (t.id === 'applyAsk') applyInstruction($('#ask').value);
  else if (t.id === 'undo') {
    const p = byId(state.activeId), cur = draftFor(p), pv = cur.prev;
    Object.assign(cur, pv, { prev: null, said: 'Restored your previous draft.' });
    cur.text = pv.text;
    renderPane();
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'compose') {
    $('#sendBtn').disabled = !t.value.trim();
    const p = byId(state.activeId);
    if (p.isNew && !state.sent.has(p.id)) {
      const d = draftFor(p);
      d.text = t.value;
      if (!d.edited) {
        d.edited = true;
        pane.querySelectorAll('.chip.on').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
      }
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'ask') { e.preventDefault(); applyInstruction(e.target.value); }
});

document.addEventListener('submit', e => { e.preventDefault(); send(); });

renderList();
renderPane();
