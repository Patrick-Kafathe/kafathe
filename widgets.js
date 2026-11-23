/* Reviews wizard, floating WhatsApp widget and the "check prices" buttons.
   Everything reads from window.SITE (data/site-data.js). No backend, no browser storage. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var quiet = { closed: false };   // remembers "user closed the chat" for this page view only

  var S = null, ready = false;

  /* ================= PRICES BUTTONS ================= */
  function initPrices() {
    var p = S.pricing || {};
    $$('.js-price-label').forEach(function (el) { el.textContent = p.label || 'Check website prices'; });
    $$('.js-price').forEach(function (a) {
      if (p.file) { a.href = p.file; a.setAttribute('download', p.file.split('/').pop() || 'website-prices.pdf'); a.hidden = false; }
      else a.hidden = true;
    });
  }

  /* ================= WHATSAPP WIDGET ================= */
  var wa = { idx: 0, tipCount: 0, tMsg: 0 };
  function waNumber() { return String((S.contact && S.contact.whatsapp) || '').replace(/\D/g, ''); }
  function waUrl(text) { return 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(text); }
  var CHIPS = [
    ['💡', 'I have an idea', "Hi Patrick! I have an idea in mind and I'd love to build it with you."],
    ['🌐', 'I need a website', 'Hi Patrick! I need a website. Can we talk about what it should include?'],
    ['🗄️', 'Database help', 'Hi Patrick! I need help with a database / system. Are you available?'],
    ['📸', 'Book a shoot', "Hi Patrick! I'd like to book a photography session. What's your availability?"],
    ['🎨', 'Logo & design', 'Hi Patrick! I need a logo / graphic design. Can you help?'],
    ['💰', 'Ask about prices', 'Hi Patrick! Could you share your website pricing and what is included?']
  ];
  function waShowMsg(text) {
    var typing = $('#waTyping'), msg = $('#waMsg');
    typing.hidden = false; msg.hidden = true;
    clearTimeout(wa.tMsg);
    wa.tMsg = setTimeout(function () { typing.hidden = true; msg.textContent = text; msg.hidden = false; }, 1100);
  }
  function waOpen() {
    var pop = $('#waPop'); if (!pop.hidden || $('#wa').hidden) return;
    pop.hidden = false; requestAnimationFrame(function () { pop.classList.add('open'); });
    $('#waTip').hidden = true; $('#waBadge').hidden = true; $('#wa').classList.add('is-open');
    var list = S.wa.bubbles && S.wa.bubbles.length ? S.wa.bubbles : ["Hi! Got an idea in mind? Let's build it 🚀"];
    waShowMsg(list[wa.idx % list.length]);
  }
  function waClose(user) {
    var pop = $('#waPop'); pop.classList.remove('open'); $('#wa').classList.remove('is-open');
    setTimeout(function () { pop.hidden = true; }, 220);
    if (user) quiet.closed = true;
  }
  function waTip() {
    if ($('#wa').hidden || !$('#waPop').hidden) return;
    var list = S.wa.bubbles || []; if (!list.length) return;
    wa.idx = (wa.idx + 1) % list.length; wa.tipCount++;
    var tip = $('#waTip'); $('#waTipText').textContent = list[wa.idx];
    tip.hidden = false; requestAnimationFrame(function () { tip.classList.add('show'); });
    setTimeout(function () { tip.classList.remove('show'); setTimeout(function () { tip.hidden = true; }, 250); }, 5200);
  }
  function initWa() {
    var root = $('#wa'); if (!root) return;
    S.wa = S.wa || {};
    if (!S.wa.enabled || !waNumber()) { root.hidden = true; return; }
    root.hidden = false;
    $('#waName').textContent = S.wa.name || 'Patrick';
    $('#waAv').src = (S.appearance && S.appearance.profile) || 'assets/profile.jpg';
    $('#waCta').href = waUrl(S.wa.prefill || "Hello! I'd like to chat.");
    $('#waChips').innerHTML = CHIPS.map(function (c) { return '<a class="wa-chip" target="_blank" rel="noopener" href="' + esc(waUrl(c[2])) + '"><i>' + c[0] + '</i>' + esc(c[1]) + '</a>'; }).join('');
    $$('.js-wa, #faqWa').forEach(function (a) { a.href = waUrl(S.wa.prefill || "Hello Patrick!"); });
    $('#waBtn').addEventListener('click', function () { $('#waPop').hidden ? waOpen() : waClose(true); });
    $('#waX').addEventListener('click', function () { waClose(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#waPop').hidden) waClose(true); });
    if (S.wa.popup !== false) {
      setTimeout(function () { if (!document.body.classList.contains('splash-on')) waTip(); }, 5500);
      setTimeout(function () { if ($('#waPop').hidden && !quiet.closed && !document.body.classList.contains('splash-on')) waOpen(); }, 11000);
    }
    setInterval(function () { if (quiet.closed && wa.tipCount < 5 && !document.hidden) waTip(); }, 40000);
  }

  /* ================= REVIEWS (simple: stars + message + name) ================= */
  var WORDS = ['Tap a star', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 18l-6.4 3.6 1.4-7.1-5.3-5 7.2-.9z"/></svg>';
  var F = { rating: 5, lastDraft: '' };
  var shown = 4;

  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += STAR.replace('<svg', '<svg class="' + (i <= n ? 'on' : '') + '"'); return s; }
  function colorFor(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return 'hsl(' + h + ',52%,44%)'; }

  function renderReviews() {
    var rvc = S.reviews || {}, sec = $('#reviews');
    if (!rvc.enabled) { sec.hidden = true; return; }
    sec.hidden = false;
    var items = (rvc.items || []).filter(function (r) { return r && r.text; }).slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    var list = $('#rvList'), sum = $('#rvSummary');
    if (!items.length) {
      sum.hidden = true;
      list.innerHTML = '<div class="rv-empty"><div class="rv-quote">“</div><h3>Be the first to review</h3><p>Worked with me? A few honest lines help the next client decide.</p></div>';
      return;
    }
    var avg = items.reduce(function (n, r) { return n + (+r.rating || 0); }, 0) / items.length;
    sum.hidden = false; $('#rvAvg').textContent = avg.toFixed(1); $('#rvStars').innerHTML = stars(Math.round(avg));
    $('#rvCount').textContent = items.length + (items.length === 1 ? ' review' : ' reviews');
    var part = items.slice(0, shown);
    list.innerHTML = '<div class="rv-masonry">' + part.map(function (r) {
      var init = esc(String(r.name || '?').trim().charAt(0).toUpperCase());
      return '<article class="rv-card"><div class="stars">' + stars(+r.rating || 0) + '</div><p class="rv-text">' + esc(r.text) + '</p>' +
        '<div class="rv-by"><span class="rv-av" style="background:' + colorFor(String(r.name || '')) + '">' + init + '</span><div><b>' + esc(r.name) + '</b><small>' + esc(r.role || '') + '</small></div></div></article>';
    }).join('') + '</div>' + (items.length > part.length ? '<button type="button" class="button button-light rv-more" id="rvMore">Show more</button>' : '');
    var more = $('#rvMore'); if (more) more.onclick = function () { shown += 4; renderReviews(); };
  }

  /* ✨ built-in writer: templates only, nothing is sent anywhere */
  var OPEN = {
    5: ['Working with Patrick was a great experience.', "I'm so glad I chose Patrick for this project.", 'Patrick exceeded my expectations.'],
    4: ['Patrick did a very good job on this project.', 'I really enjoyed working with Patrick.'],
    3: ['Patrick delivered what we agreed on.'],
    2: ['Parts of the project went well, and there is room to improve.'],
    1: ['The project did not fully meet my expectations.']
  };
  var MID = ['Communication was clear and quick.', 'The result looks professional and works smoothly.', 'Everything was delivered on time and with care.', 'He understood exactly what we needed.'];
  var CLOSE = ["I'd happily recommend him to anyone.", 'I would work with him again.', 'Highly recommended.'];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function draft() { var r = F.rating || 5, out = [pick(OPEN[r] || OPEN[5])]; if (r >= 3) out.push(pick(MID)); if (r >= 4) out.push(pick(CLOSE)); return out.join(' '); }
  function polish(text) {
    var t = text.replace(/\s+/g, ' ').trim();
    t = t.replace(/(^|[.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    if (!/[.!?]$/.test(t)) t += '.';
    if (t.length < 70 && F.rating >= 4) t += ' ' + pick(CLOSE);
    return t.slice(0, 400);
  }
  function renderRate() {
    var html = ''; for (var i = 1; i <= 5; i++) html += '<button type="button" class="rate-star' + (i <= F.rating ? ' on' : '') + '" data-n="' + i + '" role="radio" aria-checked="' + (i === F.rating) + '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '">' + STAR + '</button>';
    $('#rate').innerHTML = html; $('#rateWord').textContent = WORDS[F.rating] || '';
  }
  function showErr(m) { var e = $('#rvErr'); e.textContent = m; e.hidden = !m; }

  var wired = false;
  function initReviews() {
    if (!$('#rvForm')) return;
    renderReviews();
    if (wired) return; wired = true;
    var f = $('#rvForm'), ta = $('#rvText');
    renderRate();
    $('#rate').addEventListener('click', function (e) { var b = e.target.closest('.rate-star'); if (!b) return; F.rating = +b.dataset.n; renderRate(); });
    $('#rvAi').addEventListener('click', function () {
      var btn = this, cur = ta.value.trim();
      btn.disabled = true; btn.textContent = '✨ Writing…';
      setTimeout(function () {
        var txt = (!cur || cur === F.lastDraft) ? draft() : polish(cur);
        F.lastDraft = txt; ta.value = txt; btn.disabled = false; btn.textContent = '✨ Try another'; ta.focus();
      }, 400);
    });
    $('#rvAgain').addEventListener('click', function () {
      $('#rvDone').hidden = true; f.hidden = false; f.reset(); F.lastDraft = ''; F.rating = 5; renderRate(); $('#rvAi').textContent = '✨ Help me write';
    });
    f.addEventListener('submit', onSubmit);
  }

  function onSubmit(e) {
    e.preventDefault(); showErr('');
    var f = e.target, name = f.name.value.trim(), text = f.text.value.trim();
    if (f.website.value) return;                      // honeypot: bots only
    if (text.length < 10) return showErr('Please write a little more — or tap ✨ Help me write.');
    if (name.length < 2) return showErr('Please add your name.');
    var role = f.role.value.trim();
    var review = { name: name, role: role, rating: F.rating, text: text, date: new Date().toISOString().slice(0, 10) };
    var plain = 'New review for Patrick ' + '⭐'.repeat(F.rating) + '\nFrom: ' + name + (role ? ' (' + role + ')' : '') + '\n\n"' + text + '"';
    var withJson = plain + '\n\n— for the admin panel (Reviews > Paste) —\n' + JSON.stringify(review);
    var btn = $('#rvSubmit'), label = btn.innerHTML; btn.disabled = true; btn.textContent = 'Sending…';
    function finish(sent) {
      btn.disabled = false; btn.innerHTML = label;
      f.hidden = true; $('#rvDone').hidden = false;
      var w = $('#rvDoneWa'), m = $('#rvDoneMail'), c = S.contact || {};
      if (sent) { $('#rvDoneMsg').textContent = 'Sent! It will appear here once Patrick approves it.'; w.hidden = true; m.hidden = true; }
      else {
        $('#rvDoneMsg').textContent = 'Last step — tap one button to send it to Patrick.';
        w.href = waUrl(withJson); w.hidden = !waNumber();
        m.href = 'mailto:' + (c.email || '') + '?subject=' + encodeURIComponent('New review from ' + name) + '&body=' + encodeURIComponent(withJson); m.hidden = !c.email;
      }
    }
    var ep = S.reviews && S.reviews.endpoint;
    if (!ep) return finish(false);
    fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(review) })
      .then(function (r) { finish(r.ok); }).catch(function () { finish(false); });
  }

  window.PKWidgets = {
    init: function (settings) {
      S = settings;
      initPrices(); initWa(); initReviews(); ready = true;
    }
  };
})();
