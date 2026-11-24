/* Feedback strip for the public test. Plain JS, no libraries.
   Records: a visit, which assistant controls were tried, a send, one
   helpful / not helpful rating and an optional comment. No names, no text
   the tester types into the message box. */
(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const live = Boolean(cfg.url && cfg.key);
  const RATED_KEY = 'oa_rated';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  let sid = store.get('oa_sid');
  if (!sid) { sid = uid(); store.set('oa_sid', sid); }

  async function track(type, extra = {}) {
    if (!live) { console.info('[demo mode, not saved]', type, extra); return true; }
    try {
      const res = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/feedback_events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.key,
          Authorization: 'Bearer ' + cfg.key,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ session_id: sid, type, ...extra }),
        keepalive: true,
      });
      return res.ok;
    } catch { return false; }
  }

  /* ---------- strip ---------- */
  const bar = document.createElement('section');
  bar.className = 'fb';
  bar.setAttribute('aria-label', 'Prototype feedback');
  bar.innerHTML = `
    <p class="fb-text" id="fbText" role="status"></p>
    <div class="fb-actions" id="fbActions"></div>`;
  document.querySelector('header.topbar').after(bar);
  const text = bar.querySelector('#fbText');
  const actions = bar.querySelector('#fbActions');

  const root = document.documentElement;
  const sync = () => root.style.setProperty('--strip', bar.offsetHeight + 'px');
  new ResizeObserver(sync).observe(bar);
  sync();

  let tried = false;
  const sentActions = new Set();

  function btn(label, cls, onClick, disabled) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fb-btn ' + (cls || '');
    b.textContent = label;
    b.disabled = Boolean(disabled);
    b.addEventListener('click', onClick);
    return b;
  }
  const link = (label, href) => {
    const a = document.createElement('a');
    a.className = 'fb-link';
    a.href = href;
    a.textContent = label;
    return a;
  };

  function showAsk() {
    text.textContent = tried
      ? 'Did the assistant help you write a first message?'
      : 'Test this concept. Open a person, then tap a chip or speak an instruction. Come back here to rate it.';
    actions.replaceChildren(
      btn('Helpful', 'good', () => rate(true), !tried),
      btn('Not helpful', '', () => rate(false), !tried),
      link('Live results', '../results/'),
    );
  }

  async function rate(helpful) {
    store.set(RATED_KEY, '1');
    track('rating', { helpful });
    text.textContent = helpful ? 'Glad it helped. Anything you would change? (optional)' : 'Sorry about that. What would make it better? (optional)';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'fbComment';
    input.maxLength = 500;
    input.className = 'fb-input';
    input.placeholder = 'One line is plenty';
    input.setAttribute('aria-label', 'Your comment');
    const send = btn('Send', 'good', async () => {
      const v = input.value.trim();
      if (v) await track('comment', { comment: v });
      thanks();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send.click(); } });
    actions.replaceChildren(input, send, btn('Skip', '', thanks));
    input.focus();
  }

  function thanks() {
    text.textContent = 'Thank you. Your rating is anonymous and counted in the results.';
    actions.replaceChildren(link('See live results', '../results/'));
  }

  if (store.get(RATED_KEY)) thanks(); else showAsk();

  /* ---------- what testers do ---------- */
  function noteTry(action) {
    if (!tried) { tried = true; if (!store.get(RATED_KEY)) showAsk(); }
    if (!sentActions.has(action)) { sentActions.add(action); track('try', { action }); }
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.tone) noteTry('tone:' + t.dataset.tone);
    else if (t.dataset.extra) noteTry('extra:' + t.dataset.extra);
    else if (t.dataset.mic) noteTry(t.hasAttribute('data-auto') ? 'voice-instruction' : 'voice-dictation');
    else if (t.id === 'applyAsk') noteTry('instruction');
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'ask' && e.target.value.trim()) noteTry('instruction');
  }, true);

  document.addEventListener('input', e => {
    if (e.target.id === 'compose') noteTry('edit');
  }, true);

  document.addEventListener('submit', () => {
    noteTry('send');
    if (!sentActions.has('__sent')) { sentActions.add('__sent'); track('send'); }
  }, true);

  track('visit');
})();
