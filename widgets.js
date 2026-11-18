/* Reviews section, floating WhatsApp widget and the "check prices" button */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }

  var S = null, BASE = '', ready = false;

  /* ================= PRICES BUTTON ================= */
  function initPrices() {
    var b = $('#priceBtn'); if (!b) return;
    $('#priceLabel').textContent = S.prices.label || 'Check website prices';
    if (S.prices.file) { b.href = BASE + S.prices.file; b.setAttribute('download', S.prices.file.split('/').pop() || 'website-prices.pdf'); b.hidden = false; }
    else b.hidden = true;
  }

  /* ================= WHATSAPP WIDGET ================= */
  var wa = { idx: 0, opened: false, timers: [], tipCount: 0 };
  function waNumber() { return String(S.contact.whatsapp || '').replace(/\D/g, ''); }
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
    if (user) ss('pk_wa_closed', '1');
  }
  function waTip() {
    if ($('#wa').hidden || !$('#waPop').hidden || ss('pk_wa_closed') !== '1' && wa.tipCount > 0) return;
    var list = S.wa.bubbles && S.wa.bubbles.length ? S.wa.bubbles : []; if (!list.length) return;
    wa.idx = (wa.idx + 1) % list.length; wa.tipCount++;
    var tip = $('#waTip'); $('#waTipText').textContent = list[wa.idx];
    tip.hidden = false; requestAnimationFrame(function () { tip.classList.add('show'); });
    setTimeout(function () { tip.classList.remove('show'); setTimeout(function () { tip.hidden = true; }, 250); }, 5200);
  }
  function initWa() {
    var root = $('#wa'); if (!root) return;
    if (!S.wa.enabled || !waNumber()) { root.hidden = true; return; }
    root.hidden = false;
    $('#waName').textContent = S.wa.name || 'Patrick';
    $('#waAv').src = (S.appearance.profile || BASE + 'assets/profile.jpg');
    $('#waCta').href = waUrl(S.wa.prefill || "Hello! I'd like to chat.");
    $('#waChips').innerHTML = CHIPS.map(function (c) { return '<a class="wa-chip" target="_blank" rel="noopener" href="' + esc(waUrl(c[2])) + '"><i>' + c[0] + '</i>' + esc(c[1]) + '</a>'; }).join('');
    if (ready) return;
    $('#waBtn').addEventListener('click', function () { $('#waPop').hidden ? waOpen() : waClose(true); });
    $('#waX').addEventListener('click', function () { waClose(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#waPop').hidden) waClose(true); });
    // auto-pop once per visit, then occasional small tips
    if (S.wa.popup !== false && ss('pk_wa_closed') !== '1') {
      setTimeout(function () { if (!document.body.classList.contains('splash-on')) waTip(); }, 5500);
      setTimeout(function () { if ($('#waPop').hidden && ss('pk_wa_closed') !== '1' && !document.body.classList.contains('splash-on')) waOpen(); }, 11000);
    }
    setInterval(function () { if (ss('pk_wa_closed') === '1' && wa.tipCount < 5 && !document.hidden) waTip(); }, 40000);
  }

  /* ================= REVIEWS ================= */
  var TOPICS = ['Website', 'Software', 'Database', 'Photography', 'Design', 'Other'];
  var HL = ['Fast delivery', 'Great communication', 'Creative', 'Professional', 'Good value', 'Reliable'];
  var TONES = [['warm', 'Warm'], ['pro', 'Professional'], ['short', 'Short & sweet']];
  var WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  var F = { rating: 5, topic: 'Website', hl: [], tone: 'warm', photo: '', lastDraft: '' };
  var rv = { api: [], manual: [], apiOk: null, shown: 6, all: [] };

  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<svg class="' + (i <= n ? 'on' : '') + '" viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 18l-6.4 3.6 1.4-7.1-5.3-5 7.2-.9z"/></svg>'; return s; }
  function safeImg(u) { u = String(u || ''); if (/^data:image\/(jpeg|png|webp);base64,/.test(u)) return u; if (/^(api\/uploads|assets)\/[\w\-./]+$/.test(u)) return BASE + u; return ''; }
  function colorFor(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return 'hsl(' + h + ',48%,38%)'; }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); } catch (e) { return ''; } }

  function howCard() {
    return '<div class="rv-how"><h4>How reviews work</h4><ol><li><b>Rate</b><span>Pick your stars and what I helped with.</span></li><li><b>Write</b><span>Type your own words, or tap ✨ Help me write.</span></li><li><b>Shared</b><span>I approve it and it appears here for everyone.</span></li></ol></div>';
  }

  function renderReviews() {
    var items = rv.manual.concat(rv.api).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    rv.all = items;
    var list = $('#rvList'), sum = $('#rvSummary');
    if (!S.reviews.enabled) { $('#reviews').hidden = true; return; }
    $('#reviews').hidden = false;
    if (!items.length) {
      sum.hidden = true;
      list.innerHTML = '<div class="rv-empty"><div class="rv-quote">“</div><h3>Be the first to leave a review</h3><p>Your words help other businesses decide. Share how the project went — use the ✨ helper if you\'re not sure what to write.</p><div class="rv-ghost"><span></span><span></span><span></span></div></div>' + howCard();
      return;
    }
    var avg = items.reduce(function (n, r) { return n + (+r.rating || 0); }, 0) / items.length;
    sum.hidden = false; $('#rvAvg').textContent = avg.toFixed(1); $('#rvStars').innerHTML = stars(Math.round(avg)); $('#rvCount').textContent = items.length + (items.length === 1 ? ' review' : ' reviews');
    var shown = items.slice(0, rv.shown);
    list.innerHTML = '<div class="rv-masonry">' + shown.map(function (r) {
      var img = safeImg(r.image), init = esc(String(r.name || '?').trim().charAt(0).toUpperCase());
      return '<article class="rv-card">' + (img ? '<div class="rv-pic"><img loading="lazy" src="' + esc(img) + '" alt="Shared by ' + esc(r.name) + '"></div>' : '') +
        '<div class="rv-stars">' + stars(+r.rating || 0) + '</div><p class="rv-text">“' + esc(r.text) + '”</p>' +
        '<div class="rv-by"><span class="rv-av" style="background:' + colorFor(String(r.name || '')) + '">' + init + '</span><div><b>' + esc(r.name) + '</b><small>' + esc(r.role || '') + '</small></div>' +
        (r.topic ? '<span class="rv-topic">' + esc(r.topic) + '</span>' : '') + '</div></article>';
    }).join('') + '</div>' + (items.length > shown.length ? '<button type="button" class="button button-light rv-more" id="rvMore">Show more reviews</button>' : '') + howCard();
    var more = $('#rvMore'); if (more) more.onclick = function () { rv.shown += 6; renderReviews(); };
  }

  function loadReviews() {
    rv.manual = (S.reviews.items || []).filter(function (r) { return r && r.text; });
    renderReviews();
    if (!S.reviews.api) { rv.apiOk = false; return; }
    fetch(BASE + S.reviews.api + '?action=list', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) { rv.api = d.items || []; rv.apiOk = true; renderReviews(); } else rv.apiOk = false; })
      .catch(function () { rv.apiOk = false; });
  }

  /* ---------- AI helper (built-in writer: nothing is sent anywhere) ---------- */
  var OPEN = {
    5: { warm: ['Working with Patrick was a genuinely great experience.', "I'm so glad I chose Patrick for this project.", 'Patrick exceeded my expectations from day one.'],
         pro: ['Patrick delivered an excellent result.', "I was highly impressed with Patrick's work.", 'Patrick approached the project with real expertise.'] },
    4: { warm: ['Patrick did a very good job on this project.', 'I really enjoyed working with Patrick.'], pro: ['Patrick delivered a very good result.', 'The work Patrick produced was of a high standard.'] },
    3: { warm: ['Patrick delivered what we agreed on.'], pro: ['The project was delivered as agreed.'] },
    2: { warm: ['Parts of the project went well, and there is room to improve.'], pro: ['The project had strong points, with some areas to improve.'] },
    1: { warm: ['The project did not fully meet my expectations.'], pro: ['The result did not fully meet my expectations.'] }
  };
  var TOPIC_LINE = {
    Website: ['The website he built looks modern and works smoothly on every device.', 'Our new website is clean, fast and easy to use.'],
    Software: ['The system he developed made our daily work much easier.', 'The software is reliable and does exactly what we needed.'],
    Database: ['He organised our data so it is now secure, fast and easy to manage.', 'Our database is well structured and dependable.'],
    Photography: ['The photos were beautifully lit and captured exactly the mood we wanted.', 'The pictures came out sharp, natural and full of character.'],
    Design: ['The designs were creative, clean and true to our brand.', 'The graphics gave our brand a fresh, consistent look.'],
    Other: ['The final result matched what we needed.', 'The end product was well thought out and polished.']
  };
  var HL_CLAUSE = { 'Fast delivery': 'everything was delivered on time', 'Great communication': 'communication was clear and quick', 'Creative': 'the creativity really stood out', 'Professional': 'the whole process was professional', 'Good value': 'the value for money was excellent', 'Reliable': 'he is dependable and follows through' };
  var CLOSE = { warm: ["I'd happily recommend him to anyone.", "I can't wait to work with him again!"], pro: ['I recommend Patrick for dependable technical and creative work.', 'I would not hesitate to work with him again.'], short: ['Highly recommended.', 'Would work with him again.'] };

  function join(list) { if (list.length < 2) return list[0] || ''; return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function draft() {
    var tone = F.tone, r = F.rating || 5, t = F.topic, out = [];
    var o = (OPEN[r] || OPEN[5])[tone === 'short' ? 'pro' : tone] || OPEN[5].warm;
    if (tone !== 'short') out.push(pick(o));
    out.push(pick(TOPIC_LINE[t] || TOPIC_LINE.Other));
    if (F.hl.length) out.push(cap(join(F.hl.map(function (h) { return HL_CLAUSE[h]; }))) + '.');
    if (r >= 4) out.push(pick(CLOSE[tone]));
    return out.join(' ').slice(0, 500);
  }
  function polish(text) {
    var t = text.replace(/\s+/g, ' ').trim();
    t = t.replace(/(^|[.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    if (!/[.!?]$/.test(t)) t += '.';
    if (t.length < 80 && F.rating >= 4) t += ' ' + (F.hl.length ? cap(join(F.hl.map(function (h) { return HL_CLAUSE[h]; }))) + '.' : pick(CLOSE[F.tone === 'short' ? 'pro' : F.tone]));
    return t.slice(0, 500);
  }

  function chips(box, list, kind) {
    box.innerHTML = list.map(function (x) {
      var val = Array.isArray(x) ? x[0] : x, lab = Array.isArray(x) ? x[1] : x;
      var on = kind === 'hl' ? F.hl.indexOf(val) > -1 : F[kind] === val;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-v="' + esc(val) + '" aria-pressed="' + on + '">' + esc(lab) + '</button>';
    }).join('');
  }
  function renderRate() {
    var html = ''; for (var i = 1; i <= 5; i++) html += '<button type="button" class="rate-star' + (i <= F.rating ? ' on' : '') + '" data-n="' + i + '" role="radio" aria-checked="' + (i === F.rating) + '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '"><svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 18l-6.4 3.6 1.4-7.1-5.3-5 7.2-.9z"/></svg></button>';
    $('#rate').innerHTML = html; $('#rateWord').textContent = WORDS[F.rating] || '';
  }
  function compress(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = rej;
      fr.onload = function () {
        var img = new Image(); img.onerror = rej;
        img.onload = function () {
          var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function showErr(m) { var e = $('#rvErr'); e.textContent = m; e.hidden = !m; }

  var formWired = false;
  function initReviews() {
    if (!$('#rvForm')) return;
    if (!formWired) {
      formWired = true;
      renderRate(); chips($('#topicChips'), TOPICS, 'topic'); chips($('#hlChips'), HL, 'hl'); chips($('#toneChips'), TONES, 'tone');
      $('#rate').addEventListener('click', function (e) { var b = e.target.closest('.rate-star'); if (!b) return; F.rating = +b.dataset.n; renderRate(); });
      $('#topicChips').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; F.topic = b.dataset.v; chips($('#topicChips'), TOPICS, 'topic'); });
      $('#toneChips').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; F.tone = b.dataset.v; chips($('#toneChips'), TONES, 'tone'); });
      $('#hlChips').addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return; var v = b.dataset.v, i = F.hl.indexOf(v);
        if (i > -1) F.hl.splice(i, 1); else F.hl.push(v); chips($('#hlChips'), HL, 'hl');
      });
      var ta = $('#rvText');
      ta.addEventListener('input', function () { $('#rvLen').textContent = ta.value.length + ' / 500'; });
      $('#rvAi').addEventListener('click', function () {
        var btn = this, cur = ta.value.trim(), old = btn.textContent;
        btn.disabled = true; btn.textContent = '✨ Writing…';
        setTimeout(function () {
          var txt = (!cur || cur === F.lastDraft) ? draft() : polish(cur);
          F.lastDraft = txt; ta.value = txt; ta.dispatchEvent(new Event('input'));
          btn.disabled = false; btn.textContent = '✨ Try another'; ta.focus();
        }, 450);
      });
      $('#rvPhotoBtn').addEventListener('click', function () { $('#rvPhoto').click(); });
      $('#rvPhoto').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        compress(f, 900, .8).then(function (u) { F.photo = u; var p = $('#rvPhotoPrev'); p.src = u; p.hidden = false; $('#rvPhotoX').hidden = false; $('#rvPhotoBtn').classList.add('has'); })
          .catch(function () { showErr('That image could not be read.'); });
        e.target.value = '';
      });
      $('#rvPhotoX').addEventListener('click', function () { F.photo = ''; $('#rvPhotoPrev').hidden = true; this.hidden = true; $('#rvPhotoBtn').classList.remove('has'); });
      $('#rvAgain').addEventListener('click', function () { $('#rvDone').hidden = true; $('#rvForm').hidden = false; $('#rvForm').reset(); F.photo = ''; F.hl = []; F.lastDraft = ''; $('#rvPhotoPrev').hidden = true; $('#rvPhotoX').hidden = true; $('#rvPhotoBtn').classList.remove('has'); chips($('#hlChips'), HL, 'hl'); $('#rvLen').textContent = '0 / 500'; $('#rvAi').textContent = '✨ Help me write'; });
      $('#rvForm').addEventListener('submit', onSubmit);
    }
  }
  function onSubmit(e) {
    e.preventDefault(); showErr('');
    var f = e.target, name = f.name.value.trim(), text = f.text.value.trim();
    if (name.length < 2) return showErr('Please enter your name.');
    if (!F.rating) return showErr('Please choose a rating.');
    if (text.length < 10) return showErr('Please write a little more — or tap ✨ Help me write.');
    if (!f.consent.checked) return showErr('Please tick the box to allow your review to be shown.');
    var payload = { action: 'submit', name: name, role: f.role.value.trim(), rating: F.rating, topic: F.topic, text: text, image: F.photo, website: f.website.value };
    var btn = $('#rvSubmit'); btn.disabled = true; btn.textContent = 'Sending…';
    var done = function (viaApi) {
      btn.disabled = false; btn.textContent = 'Submit review ↗';
      $('#rvForm').hidden = true; $('#rvDone').hidden = false;
      var w = $('#rvDoneWa');
      if (viaApi) { $('#rvDoneMsg').textContent = 'Your review was sent and will appear on this page once Patrick approves it.'; w.hidden = true; }
      else {
        $('#rvDoneMsg').textContent = "Almost done — tap below to send your review to Patrick on WhatsApp and he'll add it to the page.";
        var msg = 'New review for Patrick ' + '⭐'.repeat(F.rating) + '\nFrom: ' + name + (payload.role ? ' (' + payload.role + ')' : '') + '\nAbout: ' + F.topic + '\n\n"' + text + '"';
        w.href = waUrl(msg); w.hidden = !waNumber();
      }
    };
    if (!S.reviews.api) return done(false);
    fetch(BASE + S.reviews.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.text().then(function (t) { var d; try { d = JSON.parse(t); } catch (x) { d = null; } return { status: r.status, d: d }; }); })
      .then(function (r) {
        if (r.d && r.d.ok) return done(true);
        if (r.d && r.d.error) { btn.disabled = false; btn.textContent = 'Submit review ↗'; return showErr(r.d.error); }
        done(false);   // no PHP server here (static hosting) -> WhatsApp fallback
      })
      .catch(function () { done(false); });
  }

  window.PKWidgets = {
    init: function (settings, base) {
      S = settings; BASE = base || '';
      initPrices(); initWa(); initReviews(); loadReviews(); ready = true;
    }
  };
})();
