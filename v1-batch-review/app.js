const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byId = id => PEOPLE.find(p => p.id === id);
const first = p => p.name.split(' ')[0];
const icon = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const avatar = (p, size = '') =>
  `<span class="av ${size}" style="--h:${p.hue}" aria-hidden="true">${p.name.split(' ').map(w => w[0]).join('')}</span>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const shell = $('#shell');
const pane = $('#pane');

const state = {
  view: 'thread',          // 'thread' | 'assistant'
  activeId: PEOPLE[0].id,
  step: 'setup',           // 'setup' | 'drafting' | 'review' | 'sent'
  goalText: GOALS.portfolio.label,
  goalKey: 'portfolio',
  selected: new Set(),
  queue: [],               // { id, tone, html, status, edited, said, seen, d }
  cur: 0,
  result: null,
  run: 0,
};

/* ---------- drafts ---------- */

function composeHtml(p, goalKey, tone) {
  const t = TONES[tone];
  const hook = esc(tone === 'shorter' ? p.hookShort : p.hook)
    .replace(/\[\[(.+?)\|(\w+)\]\]/g, '<mark data-ev="$2">$1</mark>');
  return [esc(t.greet(first(p))), hook, esc(GOALS[goalKey].ask[tone]), esc(t.sign).replace(/\n/g, '<br>')]
    .map(x => `<p>${x}</p>`).join('');
}

function plainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
  return [...d.childNodes].map(n => n.textContent.trim()).filter(Boolean).join('\n\n');
}

function setTone(item, tone, said) {
  item.tone = tone;
  item.html = composeHtml(byId(item.id), state.goalKey, tone);
  item.edited = false;
  item.seen = false;
  item.status = 'pending';
  item.said = said || '';
}

/* ---------- views ---------- */

function head(title, sub, backClass = '') {
  return `<header class="pane-head">
    <button class="icon-btn ${backClass}" data-back type="button" aria-label="Back to conversations">${icon('back')}</button>
    <div class="head-txt"><h2 tabindex="-1">${esc(title)}</h2><p class="sub">${esc(sub)}</p></div>
  </header>`;
}

function micBtn(target) {
  return `<button class="icon-btn mic" type="button" data-mic="${target}" aria-label="Dictate" aria-pressed="false"
    ${SR ? '' : 'disabled title="Voice input needs Chrome, Edge or Safari"'}>${icon('mic')}</button>`;
}

function renderConvos() {
  $('#convos').innerHTML = PEOPLE.map(p => {
    const last = p.thread[p.thread.length - 1];
    const preview = last ? (last.from === 'me' ? 'You: ' : '') + last.text : p.headline;
    const on = state.view === 'thread' && state.activeId === p.id;
    return `<li><button class="convo ${on ? 'on' : ''}" data-open="${p.id}" type="button">
      ${avatar(p)}
      <span class="convo-txt">
        <span class="convo-top"><b>${esc(p.name)}</b><time>${last ? esc(last.time) : ''}</time></span>
        <span class="convo-prev">${esc(preview)}</span>
      </span></button></li>`;
  }).join('');
}

function renderThread() {
  const p = byId(state.activeId);
  pane.innerHTML = `
    <header class="pane-head">
      <button class="icon-btn m-only" data-back type="button" aria-label="Back to conversations">${icon('back')}</button>
      ${avatar(p)}
      <div class="head-txt"><h2 tabindex="-1">${esc(p.name)}</h2><p class="sub">${esc(p.headline)}</p></div>
    </header>
    <div class="msgs scroll" id="msgs">
      ${p.thread.length
        ? p.thread.map(m => `<div class="msg ${m.from}"><p>${esc(m.text)}</p><time>${esc(m.time)}</time></div>`).join('')
        : `<p class="empty">No messages with ${esc(first(p))} yet.</p>`}
    </div>
    <form class="composer" id="composer">
      <textarea id="compose" rows="2" placeholder="Write a message, or dictate one" aria-label="Message to ${esc(p.name)}"></textarea>
      <div class="composer-row">
        ${micBtn('compose')}
        <p class="voice-note" id="note-compose" role="status">${SR ? '' : 'Voice input needs Chrome, Edge or Safari.'}</p>
        <button class="btn btn-primary" id="sendOne" type="submit" disabled>Send</button>
      </div>
    </form>`;
  const m = $('#msgs');
  m.scrollTop = m.scrollHeight;
}

function renderSetup() {
  pane.innerHTML = `
    ${head('Outreach assistant', 'Drafts a personal message for each person. Nothing is sent until you approve it.')}
    <div class="scroll setup">
      <section class="block">
        <h3><label for="goal">What do you want to say?</label></h3>
        <div class="field">
          <textarea id="goal" rows="2">${esc(state.goalText)}</textarea>
          ${micBtn('goal')}
        </div>
        <p class="voice-note" id="note-goal" role="status">${SR ? '' : 'Voice input needs Chrome, Edge or Safari.'}</p>
        <div class="chips">
          ${Object.entries(GOALS).map(([k, g]) => `<button class="chip" type="button" data-goal="${k}">${esc(g.label)}</button>`).join('')}
        </div>
        <p class="demo-note">Scripted demo: drafts are pre-written for these two goals.</p>
      </section>
      <section class="block">
        <div class="block-head"><h3 id="whoH">Who should get one?</h3><span class="count" id="count"></span></div>
        <ul class="people" aria-labelledby="whoH">
          ${PEOPLE.map(p => `<li><label class="person">
            <input type="checkbox" data-pick="${p.id}" ${state.selected.has(p.id) ? 'checked' : ''}>
            ${avatar(p)}
            <span class="person-txt"><b>${esc(p.name)}</b><span class="sub">${esc(p.headline)}</span><span class="rel">${esc(p.relation)}</span></span>
          </label></li>`).join('')}
        </ul>
      </section>
    </div>
    <footer class="pane-foot">
      <p class="foot-note" id="footNote" role="status"></p>
      <button class="btn btn-primary" id="draftBtn" type="button"></button>
    </footer>`;
  syncSetup();
}

function syncSetup() {
  const n = state.selected.size;
  const full = n >= MAX_BATCH;
  $('#count').textContent = `${n} of ${MAX_BATCH} selected`;
  const b = $('#draftBtn');
  b.disabled = !n || !state.goalText.trim();
  b.textContent = n ? `Draft ${plural(n, 'message')}` : 'Draft messages';
  pane.querySelectorAll('[data-pick]').forEach(c => { c.disabled = full && !c.checked; });
  $('#footNote').textContent = full ? `Up to ${MAX_BATCH} at a time, so every message gets a real review.`
    : !n ? 'Choose at least one person.'
    : !state.goalText.trim() ? 'Say what the message is about.' : '';
}

function renderDrafting() {
  const text = { wait: 'Waiting', read: 'Reading profile and recent activity', done: 'Draft ready' };
  pane.innerHTML = `
    ${head('Drafting', 'Looking for something specific to say to each person.')}
    <ul class="drafting scroll">
      ${state.queue.map(i => { const p = byId(i.id); return `<li class="d-${i.d}">
        ${avatar(p)}
        <span class="person-txt"><b>${esc(p.name)}</b><span class="sub">${text[i.d]}</span></span>
        <span class="d-mark">${i.d === 'done' ? icon('check') : ''}</span></li>`; }).join('')}
    </ul>`;
}

function startDrafting() {
  state.goalKey = GOALS.roles.match.test(state.goalText) && !GOALS.portfolio.match.test(state.goalText) ? 'roles' : 'portfolio';
  state.queue = PEOPLE.filter(p => state.selected.has(p.id)).map(p => ({ id: p.id, status: 'pending', d: 'wait' }));
  state.queue.forEach(i => setTone(i, 'base'));
  state.cur = 0;
  state.step = 'drafting';
  const run = ++state.run;
  const beat = reduceMotion ? 250 : 950;
  let ix = 0;
  const live = () => run === state.run && state.step === 'drafting';
  const tick = () => {
    if (run !== state.run) return;
    if (ix > 0) state.queue[ix - 1].d = 'done';
    if (ix < state.queue.length) {
      state.queue[ix++].d = 'read';
      if (live() && state.view === 'assistant') renderDrafting();
      setTimeout(tick, beat);
    } else {
      if (state.step === 'drafting') state.step = 'review';
      if (state.view === 'assistant') render(true);
    }
  };
  render(true);
  tick();
}

const STATUS = { pending: 'To review', approved: 'Approved', skipped: 'Skipped' };

function renderReview() {
  const q = state.queue, item = q[state.cur], p = byId(item.id);
  const fresh = !item.seen;
  item.seen = true;
  pane.innerHTML = `
    ${head('Review drafts', GOALS[state.goalKey].label)}
    <div class="review">
      <ol class="queue" aria-label="Drafts">
        ${q.map((i, ix) => `<li><button class="qitem ${ix === state.cur ? 'on' : ''}" data-q="${ix}" type="button" ${ix === state.cur ? 'aria-current="true"' : ''}>
          ${avatar(byId(i.id), 'sm')}
          <span class="qname">${esc(first(byId(i.id)))}</span>
          <span class="status s-${i.status}" data-status="${ix}">${STATUS[i.status]}</span></button></li>`).join('')}
        <li class="queue-edit"><button class="link" type="button" data-setup>Change people or goal</button></li>
      </ol>
      <div class="draft-col scroll">
        <div class="to">${avatar(p)}<div><b>To ${esc(p.name)}</b><p class="sub">${esc(p.headline)}</p></div></div>
        <div class="draft ${fresh ? 'fresh' : ''}" id="draft" contenteditable="true" role="textbox" aria-multiline="true"
          aria-label="Draft message to ${esc(p.name)}" spellcheck="true">${item.html}</div>
        <p class="edited" id="edited" ${item.edited ? '' : 'hidden'}>You edited this draft. Highlights show what is still taken from the profile.</p>
        <div class="draft-actions">
          <button class="btn" type="button" data-act="skipped">${item.status === 'skipped' ? 'Undo skip' : 'Skip'}</button>
          <button class="btn btn-approve" type="button" data-act="approved">${icon('check')}${item.status === 'approved' ? 'Undo approval' : 'Approve'}</button>
        </div>
        <section class="evidence">
          <h3>Taken from ${esc(first(p))}'s profile</h3>
          <ul id="evList">
            ${p.evidence.map(e => `<li data-ev="${e.id}" tabindex="0"><span class="src">${esc(e.source)}</span><span>${esc(e.detail)}</span><em class="unused-tag">Not in this draft</em></li>`).join('')}
          </ul>
        </section>
        <form class="refine" id="refine">
          <h3><label for="refineIn">Ask for a change</label></h3>
          <div class="field">
            <input id="refineIn" type="text" placeholder="For example: make it warmer" autocomplete="off">
            ${micBtn('refineIn')}
            <button class="btn" type="submit">Rewrite</button>
          </div>
          <p class="voice-note" id="note-refineIn" role="status">${esc(item.said || (SR ? '' : 'Voice input needs Chrome, Edge or Safari.'))}</p>
          <div class="chips">
            ${[['shorter', 'Shorter'], ['warmer', 'Warmer'], ['formal', 'More formal'], ['base', 'Original']]
              .map(([k, l]) => `<button class="chip ${item.tone === k && !item.edited ? 'on' : ''}" type="button" data-tone="${k}">${l}</button>`).join('')}
          </div>
        </form>
      </div>
    </div>
    <footer class="pane-foot">
      <p class="foot-note" id="tally" role="status"></p>
      <button class="btn btn-primary" id="sendAll" type="button"></button>
    </footer>`;
  syncReview();
}

function syncReview() {
  const q = state.queue;
  const n = s => q.filter(i => i.status === s).length;
  q.forEach((i, ix) => {
    const el = pane.querySelector(`[data-status="${ix}"]`);
    if (el) { el.textContent = STATUS[i.status]; el.className = `status s-${i.status}`; }
  });
  const a = n('approved'), pend = n('pending');
  $('#tally').textContent = [a && `${a} approved`, pend && `${pend} to review`, n('skipped') && `${n('skipped')} skipped`].filter(Boolean).join(', ');
  const b = $('#sendAll');
  b.disabled = !a;
  b.innerHTML = `${icon('send')}${a ? `Send ${plural(a, 'message')}` : 'Send approved'}`;
  const used = new Set([...pane.querySelectorAll('#draft mark')].map(m => m.dataset.ev));
  pane.querySelectorAll('#evList li').forEach(li => li.classList.toggle('unused', !used.has(li.dataset.ev)));
}

function sendApproved() {
  const sent = [], held = [];
  state.queue.forEach(i => {
    if (i.status !== 'approved') return held.push(i.id);
    byId(i.id).thread.push({ from: 'me', text: plainText(i.html), time: 'Now' });
    sent.push(i.id);
  });
  state.result = { sent, held };
  state.queue = [];
  state.selected.clear();
  state.step = 'sent';
  render(true);
}

function renderSent() {
  const { sent, held } = state.result;
  const row = (id, action) => { const p = byId(id); return `<li>${avatar(p)}<span class="person-txt"><b>${esc(p.name)}</b><span class="sub">${esc(p.headline)}</span></span>${action(p)}</li>`; };
  pane.innerHTML = `
    ${head(`${plural(sent.length, 'message')} sent`, 'Each one went out exactly as you approved it.')}
    <div class="scroll setup">
      <section class="block">
        <h3>Sent</h3>
        <ul class="people plain">${sent.map(id => row(id, p => `<button class="btn" type="button" data-open="${p.id}">Open conversation</button>`)).join('')}</ul>
      </section>
      ${held.length ? `<section class="block">
        <h3>Not sent</h3>
        <p class="sub">Skipped or left unreviewed. Nothing went to these people.</p>
        <ul class="people plain">${held.map(id => row(id, () => '')).join('')}</ul>
      </section>` : ''}
    </div>
    <footer class="pane-foot"><span></span><button class="btn btn-primary" type="button" data-reset>Start another batch</button></footer>`;
}

function render(focusHead) {
  stopVoice();
  renderConvos();
  if (state.view === 'thread') renderThread();
  else ({ setup: renderSetup, drafting: renderDrafting, review: renderReview, sent: renderSent })[state.step]();
  if (focusHead) pane.querySelector('h2')?.focus({ preventScroll: true });
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

function stopVoice() { if (rec) rec.abort(); }

function toggleMic(btn) {
  if (rec) { const same = rec.btn === btn; rec.stop(); if (same) return; }
  const target = document.getElementById(btn.dataset.mic);
  const note = document.getElementById('note-' + btn.dataset.mic);
  const base = target.value ? target.value.replace(/\s*$/, ' ') : '';
  let finalTxt = '', err = '';
  const r = new SR();
  r.btn = btn;
  r.lang = navigator.language || 'en-US';
  r.interimResults = true;
  r.continuous = true;
  r.onstart = () => {
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Stop dictating');
    btn.innerHTML = icon('stop');
    note.className = 'voice-note';
    note.textContent = 'Listening. Speak, then press stop. Your browser turns the speech into text.';
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
    if (rec === r) rec = null;
    if (!btn.isConnected) return;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Dictate');
    btn.innerHTML = icon('mic');
    note.className = 'voice-note' + (err ? ' err' : '');
    note.textContent = err || (finalTxt ? 'Check the text before you use it.' : '');
    target.focus();
  };
  rec = r;
  try { r.start(); } catch { rec = null; }
}

/* ---------- events ---------- */

function openPane() { shell.dataset.pane = 'pane'; }

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'openAssistant') { state.view = 'assistant'; openPane(); render(true); }
  else if (d.open) { state.view = 'thread'; state.activeId = d.open; openPane(); render(true); }
  else if ('back' in d) { state.view = 'thread'; shell.dataset.pane = 'list'; render(); }
  else if (d.mic) toggleMic(t);
  else if (d.goal) { state.goalText = GOALS[d.goal].label; $('#goal').value = state.goalText; syncSetup(); }
  else if (t.id === 'draftBtn') startDrafting();
  else if (d.q) { state.cur = +d.q; render(); }
  else if ('setup' in d) { state.run++; state.step = 'setup'; render(true); }
  else if (d.tone) { setTone(state.queue[state.cur], d.tone, TONES[d.tone].said || 'Back to the original draft.'); render(); }
  else if (d.act) {
    const item = state.queue[state.cur];
    item.status = item.status === d.act ? 'pending' : d.act;
    const next = state.queue.findIndex(i => i.status === 'pending');
    if (item.status !== 'pending' && next > -1) state.cur = next;
    render();
    pane.querySelector('.draft-col').scrollTop = 0;
  }
  else if (t.id === 'sendAll') sendApproved();
  else if ('reset' in d) { state.step = 'setup'; render(true); }
});

document.addEventListener('change', e => {
  const id = e.target.dataset?.pick;
  if (!id) return;
  e.target.checked ? state.selected.add(id) : state.selected.delete(id);
  syncSetup();
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'goal') { state.goalText = t.value; syncSetup(); }
  else if (t.id === 'compose') $('#sendOne').disabled = !t.value.trim();
  else if (t.id === 'draft') {
    const item = state.queue[state.cur];
    item.html = t.innerHTML;
    item.edited = true;
    item.status = 'pending';
    $('#edited').hidden = false;
    pane.querySelectorAll('.chip.on').forEach(c => c.classList.remove('on'));
    pane.querySelector('[data-act="approved"]').innerHTML = `${icon('check')}Approve`;
    pane.querySelector('[data-act="skipped"]').textContent = 'Skip';
    syncReview();
  }
});

document.addEventListener('paste', e => {
  if (e.target.closest?.('#draft')) {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }
});

document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'composer') {
    const text = $('#compose').value.trim();
    if (!text) return;
    byId(state.activeId).thread.push({ from: 'me', text, time: 'Now' });
    render();
    $('#compose').focus();
  } else if (e.target.id === 'refine') {
    const ask = $('#refineIn').value.trim();
    if (!ask) return;
    const item = state.queue[state.cur];
    const tone = /original|undo|revert/i.test(ask) ? 'base' : Object.keys(TONES).find(k => TONES[k].match?.test(ask));
    if (tone) setTone(item, tone, TONES[tone].said || 'Back to the original draft.');
    else item.said = 'This demo understands shorter, warmer and more formal. A live assistant would take any instruction.';
    render();
    $('#refineIn').focus();
  }
});

// Link each highlighted phrase to the profile detail it came from.
function hot(e, on) {
  const el = e.target.closest?.('[data-ev]');
  if (!el || !pane.contains(el)) return;
  pane.querySelectorAll(`[data-ev="${el.dataset.ev}"]`).forEach(x => x.classList.toggle('hot', on));
}
['mouseover', 'focusin'].forEach(ev => pane.addEventListener(ev, e => hot(e, true)));
['mouseout', 'focusout'].forEach(ev => pane.addEventListener(ev, e => hot(e, false)));

render();
