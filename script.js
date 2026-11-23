/* Builds the whole page from window.SITE (data/site-data.js).
   No admin panel, no browser storage: edit the data file, upload to GitHub, and every visitor sees the same site. */
(function () {
  'use strict';
  var S = window.SITE;
  if (!S) { console.error('data/site-data.js is missing'); return; }
  /* Owner-only preview: unpublished admin changes saved in THIS browser (visitors never have this). */
  window.SITE_ORIG = JSON.parse(JSON.stringify(S));
  var previewing = false;
  try {
    var dr = localStorage.getItem('pk_draft');
    if (dr) { dr = JSON.parse(dr); Object.keys(dr).forEach(function (k) { S[k] = dr[k]; }); previewing = true; }
  } catch (e) {}
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function get(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = S.contact || {};

  /* ---------- splash ---------- */
  (function () {
    var sp = $('#splash'); if (!sp) return;
    document.body.classList.add('splash-on');
    var gone = false;
    function end() { if (gone) return; gone = true; document.body.classList.remove('splash-on'); sp.remove(); }
    setTimeout(end, reduced ? 1000 : 3250);
    sp.addEventListener('click', end);
  })();

  /* ---------- text bindings, accent, SEO ---------- */
  $$('[data-s]').forEach(function (el) { var v = get(S, el.dataset.s); if (typeof v === 'string') el.textContent = v; });
  if (S.appearance && S.appearance.accent) document.documentElement.style.setProperty('--green', S.appearance.accent);
  if (S.seo) {
    if (S.seo.title) document.title = S.seo.title;
    var md = $('meta[name="description"]'); if (md && S.seo.description) md.content = S.seo.description;
  }
  try {
    var ld = document.createElement('script'); ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: S.hero.name, jobTitle: (S.hero.roles || []).join(', '), email: C.email, telephone: C.phone, address: { '@type': 'PostalAddress', addressLocality: 'Nairobi', addressCountry: 'KE' }, url: C.website ? 'https://' + C.website.replace(/^https?:\/\//, '') : undefined });
    document.head.appendChild(ld);
  } catch (e) {}

  /* ---------- announce bar ---------- */
  if (S.announce && S.announce.enabled) {
    $('#announce').hidden = false; $('#announceText').textContent = S.announce.text; $('#announceLink').href = S.announce.link || '#contact';
  }

  /* ---------- nav, progress, to-top, year ---------- */
  var toggle = $('.menu-toggle'), links = $('.nav-links');
  toggle.addEventListener('click', function () { var o = links.classList.toggle('open'); toggle.setAttribute('aria-expanded', o); });
  $$('a', links).forEach(function (a) { a.addEventListener('click', function () { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }); });
  var prog = $('#progress'), top = $('#toTop');
  function onScroll() {
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    top.hidden = h.scrollTop < 700;
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- hero ---------- */
  var heroImg = $('#heroImg'); if (S.appearance && S.appearance.profile) heroImg.src = S.appearance.profile;
  var nm = String(S.hero.name || '').trim().split(' ');
  $('#heroName').innerHTML = esc(nm.slice(0, -1).join(' ')) + ' <span>' + esc(nm.slice(-1)[0] || '') + '</span>';
  (function typed() {
    var el = $('#typed'), roles = S.hero.roles || []; if (!roles.length) return;
    if (reduced) { el.textContent = roles[0]; return; }
    var i = 0, j = 0, del = false;
    (function tick() {
      var w = roles[i];
      j += del ? -1 : 1; el.textContent = w.slice(0, j);
      var d = del ? 35 : 75;
      if (!del && j === w.length) { del = true; d = 1500; }
      else if (del && j === 0) { del = false; i = (i + 1) % roles.length; d = 350; }
      setTimeout(tick, d);
    })();
  })();

  /* ---------- picture banner (auto-slides) ---------- */
  (function banner() {
    var slides = S.slides || [], stage = $('#bnStage'); if (!slides.length) { $('#banner').hidden = true; return; }
    var DUR = 4800, cur = 0, timer = null, paused = false;
    stage.innerHTML = slides.map(function (s, i) {
      return '<div class="bn-slide' + (i === 0 ? ' on' : '') + '"><img src="' + esc(s.image) + '" alt="' + esc(s.title) + '"' + (i ? ' loading="lazy"' : '') + '>' +
        '<div class="bn-copy"><span class="bn-tag">' + esc(s.tag) + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>' +
        (s.cta ? '<a class="button button-white" href="' + esc(s.link || '#contact') + '">' + esc(s.cta) + ' <svg class="ico"><use href="#i-arrow"/></svg></a>' : '') + '</div></div>';
    }).join('');
    var tabs = $('#bnTabs');
    tabs.innerHTML = slides.map(function (s, i) { return '<button type="button" role="tab" data-i="' + i + '">' + esc(String(s.tag || '').split(' ')[0].toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); })) + '<i></i></button>'; }).join('');
    tabs.style.setProperty('--dur', DUR + 'ms');
    function show(i) {
      cur = (i + slides.length) % slides.length;
      $$('.bn-slide', stage).forEach(function (el, k) { el.classList.toggle('on', k === cur); });
      $$('button', tabs).forEach(function (b, k) {
        b.classList.remove('on'); b.setAttribute('aria-selected', k === cur);
        if (k === cur) { void b.offsetWidth; b.classList.add('on'); }
      });
      clearTimeout(timer);
      if (!paused && !reduced) timer = setTimeout(function () { show(cur + 1); }, DUR);
    }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(+b.dataset.i); });
    $('#bnPrev').addEventListener('click', function () { show(cur - 1); });
    $('#bnNext').addEventListener('click', function () { show(cur + 1); });
    var box = $('#banner');
    box.addEventListener('mouseenter', function () { paused = true; clearTimeout(timer); $$('button.on i', tabs).forEach(function (i) { i.style.animationPlayState = 'paused'; }); });
    box.addEventListener('mouseleave', function () { paused = false; $$('button i', tabs).forEach(function (i) { i.style.animationPlayState = ''; }); show(cur); });
    show(0);
  })();

  /* ---------- stats ---------- */
  (function stats() {
    var box = $('#stats'), list = S.stats || []; if (!list.length) { box.hidden = true; return; }
    box.innerHTML = list.map(function (s) {
      var num = /^\d+$/.test(String(s.value));
      return '<div class="stat"><b' + (num ? ' data-count="' + s.value + '"' : '') + '>' + esc(num ? 0 : s.value) + '</b><strong>' + esc(s.label) + '</strong><small>' + esc(s.note || '') + '</small></div>';
    }).join('');
    var els = $$('[data-count]', box); if (!els.length) return;
    function run() { els.forEach(function (el) { var to = +el.dataset.count, t0 = performance.now(); (function f(t) { var p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0); }); }
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.textContent = el.dataset.count; }); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: .4 }); io.observe(box);
  })();

  /* ---------- about ---------- */
  $('#aboutBody').innerHTML = String((S.about && S.about.body) || '').split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  $('#glance').innerHTML = ((S.about && S.about.glance) || []).map(function (r) { return '<li><span>' + esc(r[0]) + '</span><b' + (/open/i.test(r[1]) ? ' class="ok"' : '') + '>' + esc(r[1]) + '</b></li>'; }).join('');

  /* ---------- expertise bento with illustrations ---------- */
  var ART = {
    code: '<svg viewBox="0 0 170 112" fill="none"><rect x="14" y="10" width="142" height="92" rx="12" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M14 30h142" stroke="currentColor" stroke-width="2.5"/><circle cx="28" cy="20" r="3.5" fill="#f43f5e"/><circle cx="40" cy="20" r="3.5" fill="#f59e0b"/><circle cx="52" cy="20" r="3.5" fill="#22c55e"/><path d="M34 52l-12 10 12 10M72 52l12 10-12 10" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M56 48l-8 28" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/><rect x="96" y="44" width="46" height="6" rx="3" fill="currentColor" opacity=".35"/><rect x="96" y="58" width="32" height="6" rx="3" fill="currentColor" opacity=".6"/><rect x="96" y="72" width="40" height="6" rx="3" fill="currentColor" opacity=".25"/></svg>',
    web: '<svg viewBox="0 0 170 112" fill="none"><rect x="10" y="12" width="118" height="82" rx="10" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M10 30h118" stroke="currentColor" stroke-width="2.5"/><rect x="20" y="40" width="54" height="10" rx="5" fill="currentColor"/><rect x="20" y="58" width="76" height="6" rx="3" fill="currentColor" opacity=".3"/><rect x="20" y="70" width="60" height="6" rx="3" fill="currentColor" opacity=".3"/><rect x="82" y="40" width="36" height="42" rx="6" fill="currentColor" opacity=".15"/><circle cx="100" cy="56" r="8" fill="#f59e0b"/><rect x="118" y="38" width="44" height="66" rx="9" fill="#fff" stroke="currentColor" stroke-width="2.5"/><rect x="125" y="48" width="30" height="16" rx="4" fill="currentColor" opacity=".25"/><rect x="125" y="70" width="30" height="5" rx="2.5" fill="currentColor" opacity=".4"/><rect x="125" y="80" width="20" height="5" rx="2.5" fill="currentColor" opacity=".3"/></svg>',
    db: '<svg viewBox="0 0 170 112" fill="none"><ellipse cx="62" cy="24" rx="40" ry="13" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M22 24v56c0 7 18 13 40 13s40-6 40-13V24" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M22 52c0 7 18 13 40 13s40-6 40-13M22 38c0 7 18 13 40 13s40-6 40-13" stroke="currentColor" stroke-width="2.5" opacity=".5"/><circle cx="36" cy="70" r="3.5" fill="#22c55e"/><circle cx="36" cy="50" r="3.5" fill="#f59e0b"/><rect x="112" y="40" width="46" height="52" rx="8" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M122 80v-10M133 80V58M144 80V66" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M104 62h8" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 3"/></svg>',
    sys: '<svg viewBox="0 0 170 112" fill="none"><rect x="12" y="14" width="92" height="62" rx="9" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M44 96h28M58 76v20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M26 34l10 8-10 8" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="44" y="48" width="28" height="5" rx="2.5" fill="#f59e0b"/><rect x="118" y="20" width="40" height="22" rx="6" fill="#fff" stroke="currentColor" stroke-width="2.5"/><rect x="118" y="52" width="40" height="22" rx="6" fill="#fff" stroke="currentColor" stroke-width="2.5"/><circle cx="128" cy="31" r="3" fill="#22c55e"/><circle cx="128" cy="63" r="3" fill="#22c55e"/><path d="M104 45h8M112 45v-14h6M112 45v18h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    photo: '<svg viewBox="0 0 170 112" fill="none"><rect x="14" y="28" width="142" height="76" rx="14" fill="#fff" stroke="currentColor" stroke-width="2.5"/><path d="M54 28l8-14h46l8 14" fill="#fff" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="85" cy="66" r="26" fill="currentColor" opacity=".15" stroke="currentColor" stroke-width="2.5"/><circle cx="85" cy="66" r="16" fill="#fff" stroke="currentColor" stroke-width="2.5"/><circle cx="85" cy="66" r="7" fill="currentColor"/><circle cx="79" cy="60" r="3" fill="#fff"/><circle cx="136" cy="42" r="5" fill="#f43f5e"/><rect x="24" y="40" width="18" height="6" rx="3" fill="currentColor" opacity=".35"/></svg>',
    design: '<svg viewBox="0 0 170 112" fill="none"><path d="M26 86c-10-26 4-62 34-70s56 8 58 32-14 20-24 28-10 24-30 24-30-4-38-14z" fill="#fff" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="52" cy="40" r="8" fill="#e11d74"/><circle cx="78" cy="30" r="8" fill="#f59e0b"/><circle cx="100" cy="46" r="8" fill="#0ea5e9"/><circle cx="48" cy="66" r="8" fill="#22c55e"/><path d="M118 88l30-56 8 5-26 58-12 5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M118 88l-1 10 9-6z" fill="#f59e0b"/></svg>'
  };
  var bento = $('#bento');
  bento.innerHTML = (S.expertise || []).map(function (x, i) {
    return '<article class="bc reveal" data-color="' + esc(x.color || 'indigo') + '"><div class="bc-art" style="color:var(--c)"><span class="bc-num">0' + (i + 1) + '</span>' + (ART[x.art] || ART.code) + '</div>' +
      '<div class="bc-body"><h3>' + esc(x.title) + '</h3><p>' + esc(x.desc) + '</p><div class="tags">' + (x.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></div></article>';
  }).join('');

  /* ---------- tools ---------- */
  $('#toolGrid').innerHTML = (S.tools || []).map(function (g) {
    return '<div class="tool-group reveal"><h4>' + esc(g.group) + '</h4>' + g.items.map(function (t) {
      var n = String(t[0]).replace(/[^A-Za-z0-9 ]/g, ''), mono = n.split(' ').length > 1 ? n.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2) : n.slice(0, 2);
      return '<div class="tool"><i style="--tc:' + esc(t[1]) + '">' + esc(mono) + '</i>' + esc(t[0]) + '</div>';
    }).join('') + '</div>';
  }).join('');

  /* ---------- lightbox ---------- */
  var lb = { items: [], i: 0 };
  function lbShow() { var it = lb.items[lb.i]; $('#lbImg').src = it.src; $('#lbImg').alt = it.cap || ''; $('#lbCap').textContent = (it.cap || '') + (lb.items.length > 1 ? '  ·  ' + (lb.i + 1) + '/' + lb.items.length : ''); }
  function lbOpen(items, i) { lb.items = items; lb.i = i || 0; $('#lightbox').hidden = false; lbShow(); document.body.style.overflow = 'hidden'; $('#lbPrev').hidden = $('#lbNext').hidden = items.length < 2; }
  function lbClose() { $('#lightbox').hidden = true; document.body.style.overflow = ''; }
  $('#lbClose').addEventListener('click', lbClose);
  $('#lightbox').addEventListener('click', function (e) { if (e.target.id === 'lightbox') lbClose(); });
  $('#lbPrev').addEventListener('click', function () { lb.i = (lb.i - 1 + lb.items.length) % lb.items.length; lbShow(); });
  $('#lbNext').addEventListener('click', function () { lb.i = (lb.i + 1) % lb.items.length; lbShow(); });
  document.addEventListener('keydown', function (e) {
    if ($('#lightbox').hidden) return;
    if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') $('#lbPrev').click(); if (e.key === 'ArrowRight') $('#lbNext').click();
  });

  /* ---------- showcase slider ---------- */
  var projects = (S.projects || []).filter(function (p) { return p && p.title; });
  (function showcase() {
    var feat = projects.filter(function (p) { return p.featured && p.images && p.images.length; });
    var real = feat.length ? feat : projects.filter(function (p) { return p.images && p.images.length; }).slice(0, 5);
    var items = real.length ? real.map(function (p) { return { tag: String(p.category || 'PROJECT').toUpperCase(), title: p.title, text: p.description || '', image: p.images[0], link: p.link, sample: false, imgs: p.images }; })
                            : (S.samples || []).map(function (s) { return { tag: s.tag, title: s.title, text: s.text, image: s.image, sample: true, imgs: [s.image] }; });
    var box = $('#slider'); if (!items.length) { box.hidden = true; return; }
    $('#slides').innerHTML = items.map(function (s, i) {
      return '<div class="slide"><div class="slide-text"><span class="tag"><b>' + String(i + 1).padStart(2, '0') + '</b> / ' + String(items.length).padStart(2, '0') + ' · ' + esc(s.tag) + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>' +
        (s.link ? '<a class="button button-dark" target="_blank" rel="noopener" href="' + esc(s.link) + '">Visit project <svg class="ico"><use href="#i-arrow"/></svg></a>' : '<a class="button button-dark" href="#contact">Start a similar project <svg class="ico"><use href="#i-arrow"/></svg></a>') +
        '</div><div class="slide-media">' + (s.sample ? '<span class="sample-tag">SAMPLE</span>' : '') + '<img src="' + esc(s.image) + '" alt="' + esc(s.title) + '" data-i="' + i + '"' + (i ? ' loading="lazy"' : '') + '></div></div>';
    }).join('');
    $('#dots').innerHTML = items.map(function (s, i) { return '<button type="button" aria-label="Slide ' + (i + 1) + '" data-i="' + i + '"></button>'; }).join('');
    var cur = 0, t;
    function go(i) {
      cur = (i + items.length) % items.length;
      $('#slides').style.transform = 'translateX(-' + cur * 100 + '%)';
      $$('#dots button').forEach(function (b, k) { b.classList.toggle('on', k === cur); });
      clearTimeout(t); if (!reduced && items.length > 1) t = setTimeout(function () { go(cur + 1); }, 6000);
    }
    $('#prev').addEventListener('click', function () { go(cur - 1); });
    $('#next').addEventListener('click', function () { go(cur + 1); });
    $('#dots').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go(+b.dataset.i); });
    $('#slides').addEventListener('click', function (e) { var im = e.target.closest('img'); if (im) { var s = items[+im.dataset.i]; lbOpen(s.imgs.map(function (u) { return { src: u, cap: s.title }; }), 0); } });
    box.addEventListener('mouseenter', function () { clearTimeout(t); });
    box.addEventListener('mouseleave', function () { go(cur); });
    go(0);
  })();

  /* ---------- projects grid ---------- */
  (function projectGrid() {
    var grid = $('#projectGrid'), fil = $('#filters'), active = 'All';
    if (!projects.length) {
      fil.hidden = true;
      grid.innerHTML = '<div class="empty"><h3>Project gallery coming together</h3><p>New work is added regularly. Have something in mind? <a href="#contact">Let\'s build the next one.</a></p></div>';
      return;
    }
    var cats = ['All'].concat(projects.map(function (p) { return p.category || 'Other'; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    function draw() {
      fil.innerHTML = cats.map(function (c) { return '<button type="button" class="' + (c === active ? 'on' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
      var list = projects.filter(function (p) { return active === 'All' || (p.category || 'Other') === active; });
      grid.innerHTML = list.map(function (p, i) {
        var imgs = p.images || [];
        return '<article class="project-card"><div class="project-art" data-p="' + projects.indexOf(p) + '">' + (imgs.length ? '<img loading="lazy" src="' + esc(imgs[0]) + '" alt="' + esc(p.title) + '">' + (imgs.length > 1 ? '<span class="img-count">' + imgs.length + ' photos</span>' : '') : esc(String(p.category || 'PROJECT').toUpperCase())) + '</div>' +
          '<div class="project-info"><span class="project-type">' + esc(String(p.category || '').toUpperCase()) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.description || '') + '</p>' +
          ((p.tech || []).length ? '<div class="tags">' + p.tech.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
          (p.link ? '<a class="project-link" target="_blank" rel="noopener" href="' + esc(p.link) + '">Visit project ↗</a>' : '') + '</div></article>';
      }).join('');
    }
    fil.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { active = b.dataset.c; draw(); } });
    grid.addEventListener('click', function (e) {
      var a = e.target.closest('.project-art'); if (!a) return; var p = projects[+a.dataset.p];
      if (p.images && p.images.length) lbOpen(p.images.map(function (u) { return { src: u, cap: p.title }; }), 0);
    });
    draw();
  })();

  /* ---------- services ---------- */
  var SICON = ['<path d="M3 5h18v12H3zM8 21h8M12 17v4"/>', '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>', '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>', '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', '<path d="M12 3a9 9 0 1 0 0 18c1.7 0 2-1.200 1.400-2.200-.7-1.100-.2-2.300 1.200-2.300H17a4 4 0 0 0 4-4c0-5-4-9.500-9-9.500z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.500" r="1"/>'];
  $('#serviceGrid').innerHTML = (S.services || []).map(function (s, i) {
    return '<article class="service reveal"><div class="s-top"><span class="s-ico"><svg viewBox="0 0 24 24">' + SICON[i % SICON.length] + '</svg></span><span class="s-num">0' + (i + 1) + '</span></div><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p></article>';
  }).join('');


  /* ---------- process & FAQ ---------- */
  $('#processGrid').innerHTML = (S.process || []).map(function (p, i) { return '<article class="step reveal"><b>' + (i + 1) + '</b><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></article>'; }).join('');
  var faq = $('#faqList');
  faq.innerHTML = (S.faq || []).map(function (f, i) {
    return '<div class="faq-item' + (i === 0 ? ' open' : '') + '"><button class="faq-q" type="button" aria-expanded="' + (i === 0) + '">' + esc(f.q) + '<span><svg class="ico"><use href="#i-plus"/></svg></span></button><div class="faq-a"><div><p>' + esc(f.a) + '</p></div></div></div>';
  }).join('');
  faq.addEventListener('click', function (e) {
    var q = e.target.closest('.faq-q'); if (!q) return; var it = q.parentNode, o = !it.classList.contains('open');
    $$('.faq-item', faq).forEach(function (x) { x.classList.remove('open'); $('.faq-q', x).setAttribute('aria-expanded', 'false'); });
    if (o) { it.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
  });

  /* ---------- contact ---------- */
  var wnum = String(C.whatsapp || '').replace(/\D/g, '');
  function row(icon, label, val, href, multi) { if (multi) return '<li><span class="ci"><svg class="ico"><use href="#' + icon + '"/></svg></span><div><small>' + label + '</small>' + multi.map(function (m) { return '<a href="mailto:' + esc(m) + '">' + esc(m) + '</a>'; }).join('') + '</div></li>'; return '<li><span class="ci"><svg class="ico"><use href="#' + icon + '"/></svg></span><div><small>' + label + '</small>' + (href ? '<a href="' + esc(href) + '"' + (/^http/.test(href) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(val) + '</a>' : '<span class="v">' + esc(val) + '</span>') + '</div></li>'; }
  var web = C.website ? (/^https?:/.test(C.website) ? C.website : 'https://' + C.website) : '';
  $('#ctaRows').innerHTML = [
    (C.email || C.email2) && row('i-mail', 'Email', '', '', [C.email, C.email2].filter(Boolean)),
    C.phone && row('i-phone', 'WhatsApp / Phone', C.phone, 'tel:+' + wnum), web && row('i-globe', 'Website', C.website, web), (C.address || C.location) && row('i-pin', 'Find me', C.address || C.location)
  ].filter(Boolean).join('');
  $$('.js-mail').forEach(function (a) { a.href = 'mailto:' + (C.email || ''); });
  var SOC = { linkedin: 'LinkedIn', github: 'GitHub', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', x: 'X', youtube: 'YouTube' };
  $('#socials').innerHTML = Object.keys(SOC).filter(function (k) { return C.socials && C.socials[k]; }).map(function (k) { return '<a target="_blank" rel="noopener" href="' + esc(C.socials[k]) + '">' + SOC[k] + '</a>'; }).join('');
  $('#footContact').insertAdjacentHTML('beforeend', [C.email && '<a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a>', C.email2 && '<a href="mailto:' + esc(C.email2) + '">' + esc(C.email2) + '</a>', C.phone && '<a href="tel:+' + wnum + '">' + esc(C.phone) + '</a>', C.location && '<a href="#contact">' + esc(C.location) + '</a>'].filter(Boolean).join(''));

  var sel = $('#fService');
  sel.innerHTML = (S.services || []).map(function (s) { return '<option>' + esc(s.title) + '</option>'; }).join('') + '<option>Something else</option>';

  $('#contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, via = (e.submitter && e.submitter.dataset.via) || 'wa';
    var msg = 'Hello Patrick, my name is ' + f.name.value.trim() + '.\nI need: ' + f.service.value + '\n\n' + f.message.value.trim() + '\n\nReach me on: ' + f.contact.value.trim();
    if (via === 'mail') location.href = 'mailto:' + (C.email || '') + '?subject=' + encodeURIComponent('Project enquiry — ' + f.service.value) + '&body=' + encodeURIComponent(msg);
    else window.open('https://wa.me/' + wnum + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* ---------- reveal on scroll ---------- */
  var rev = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    rev.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el); });
    setTimeout(function () { $$('.reveal:not(.in)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('in'); }); }, 600);
  } else rev.forEach(function (el) { el.classList.add('in'); });

  if (window.PKWidgets) PKWidgets.init(S);

  /* ---------- hidden admin: open by adding #admin to the address ---------- */
  var adminLoaded = false;
  function maybeAdmin() {
    if (location.hash !== '#admin' || adminLoaded) return;
    adminLoaded = true;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'admin.css'; document.head.appendChild(l);
    var sc = document.createElement('script'); sc.src = 'admin.js'; document.body.appendChild(sc);
  }
  window.addEventListener('hashchange', function () { maybeAdmin(); if (location.hash === '#admin' && window.PKAdmin) PKAdmin.open(); });
  maybeAdmin();

  if (previewing) {
    var bar = document.createElement('div'); bar.className = 'draft-bar';
    bar.innerHTML = '<span>Previewing unpublished changes (only you see this)</span><a href="#admin">Open admin</a><button type="button">Discard</button>';
    document.body.appendChild(bar);
    $('button', bar).addEventListener('click', function () { try { localStorage.removeItem('pk_draft'); } catch (e) {} location.hash = ''; location.reload(); });
  }
})();
