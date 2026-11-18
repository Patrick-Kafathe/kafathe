(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^(https?:\/\/|#|mailto:)/i.test(u || '') ? u : ''; }
  function get(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }

  var S = PKStore.defaults();

  /* splash screen: lock scroll while it plays, then remove it */
  var splash = $('#splash');
  if (splash) {
    document.body.classList.add('splash-on');
    var endSplash = function () { document.body.classList.remove('splash-on'); if (splash.parentNode) splash.parentNode.removeChild(splash); };
    setTimeout(endSplash, matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 3250);
    splash.addEventListener('click', endSplash);
  }

  /* year, nav, progress */
  $('#year').textContent = new Date().getFullYear();
  var toggle = $('.menu-toggle'), links = $('.nav-links');
  toggle.addEventListener('click', function () { var o = links.classList.toggle('open'); toggle.setAttribute('aria-expanded', o); });
  links.addEventListener('click', function (e) { if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  var bar = $('#progress');
  window.addEventListener('scroll', function () { var h = document.documentElement; bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%'; }, { passive: true });

  /* typed roles */
  var typedStarted = false;
  function startTyping() {
    if (typedStarted) return; typedStarted = true;
    var typed = $('#typed'), ri = 0, ci = 0, del = false;
    var roles = (S.hero.roles && S.hero.roles.length) ? S.hero.roles : ['Software Engineer'];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { typed.textContent = roles.join(' · '); return; }
    (function tick() {
      var word = roles[ri % roles.length];
      ci += del ? -1 : 1;
      typed.textContent = word.slice(0, ci);
      var wait = del ? 35 : 70;
      if (!del && ci >= word.length) { del = true; wait = 1400; }
      else if (del && ci <= 0) { del = false; ri = (ri + 1) % roles.length; wait = 350; }
      setTimeout(tick, wait);
    })();
  }

  /* reveal */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .1 }) : null;
  function observe(root) { $$('.reveal', root).forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); }); }
  observe();

  /* icons for services */
  var ICONS = [
    '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01M6 17.5h.01"/>',
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  ];

  /* ---------- apply settings ---------- */
  function applySettings() {
    $$('[data-s]').forEach(function (el) { var v = get(S, el.dataset.s); if (typeof v === 'string') el.textContent = v; });

    // name: last word highlighted
    var parts = String(S.hero.name || '').trim().split(/\s+/), last = parts.pop() || '';
    $('#heroName').innerHTML = (parts.length ? esc(parts.join(' ')) + ' ' : '') + '<span>' + esc(last) + '</span>';
    var eb = $('#heroEyebrow'); eb.hidden = !S.hero.eyebrow; $('.status-dot', eb).hidden = !S.hero.available;

    // announcement bar
    var an = $('#announce');
    if (S.announce.enabled && S.announce.text) {
      $('#announceText').textContent = S.announce.text; an.setAttribute('data-tone', S.announce.tone || 'green');
      $('#announceLink').setAttribute('href', safeUrl(S.announce.link) || '#contact'); an.hidden = false;
    } else an.hidden = true;

    // about body
    $('#aboutBody').innerHTML = String(S.about.body || '').split(/\n\s*\n/).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');

    // accent + images + seo
    var acc = /^#[0-9a-f]{6}$/i.test(S.appearance.accent) ? S.appearance.accent : '#12883a';
    document.documentElement.style.setProperty('--green', acc);
    $('meta[name="theme-color"]').setAttribute('content', acc);
    if (S.appearance.profile) $('#heroImg').src = S.appearance.profile;
    if (S.seo.title) document.title = S.seo.title;
    if (S.seo.description) $('meta[name="description"]').setAttribute('content', S.seo.description);

    // services
    $('#serviceGrid').innerHTML = (S.services || []).map(function (s, i) {
      return '<article class="service reveal"><div class="s-top"><div class="s-ico"><svg viewBox="0 0 24 24">' + ICONS[i % ICONS.length] + '</svg></div><span class="s-num">' + ('0' + (i + 1)).slice(-2) + '</span></div><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p></article>';
    }).join('');
    observe($('#serviceGrid'));

    // contact
    var c = S.contact, wa = String(c.whatsapp || '').replace(/\D/g, '');
    $$('.js-mail').forEach(function (a) { a.href = 'mailto:' + c.email; });
    $$('.js-wa').forEach(function (a) { if (wa) a.href = 'https://wa.me/' + wa; else a.hidden = true; });
    var det = [];
    if (c.email) det.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    if (c.email2) det.push('<a href="mailto:' + esc(c.email2) + '">' + esc(c.email2) + '</a>');
    if (c.phone) det.push('<a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>');
    if (c.location) det.push('<span>' + esc(c.location) + '</span>');
    $('#contactDetails').innerHTML = det.join('');
    var names = { linkedin: 'LinkedIn', github: 'GitHub', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', x: 'X', youtube: 'YouTube' };
    $('#socials').innerHTML = Object.keys(names).filter(function (k) { return /^https?:\/\//i.test(c.socials && c.socials[k] || ''); })
      .map(function (k) { return '<a href="' + esc(c.socials[k]) + '" target="_blank" rel="noopener">' + names[k] + '</a>'; }).join('');
    startTyping();
  }

  /* contact form → mailto */
  $('#contactForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    var body = f.message.value + '\n\n— ' + f.name.value + ' (' + f.email.value + ')';
    location.href = 'mailto:' + S.contact.email + '?subject=' + encodeURIComponent('Website enquiry from ' + f.name.value) + '&body=' + encodeURIComponent(body);
  });

  /* ---------- sample slides ---------- */
  var samples = [
    { tag: 'WEB DEVELOPMENT', title: 'Business websites that build trust', text: 'Responsive, fast and easy to manage — designed to present services and turn visitors into customers.',
      mock: '<div class="mock"><div class="mock-bar"><b></b><b></b><b></b><em>yourbusiness.co.ke</em></div><div class="mock-body"><div class="mock-hero"></div><div class="ln m"></div><div class="ln s"></div><div class="ln g"></div><div class="mock-cols"><div></div><div></div><div></div></div></div></div>' },
    { tag: 'SOFTWARE & SYSTEMS', title: 'Dashboards and management systems', text: 'Registration, reporting, point-of-sale and admin systems that keep operations organised.',
      mock: '<div class="mock"><div class="mock-bar"><b></b><b></b><b></b><em>app.system/dashboard</em></div><div class="mock-body"><div class="mock-chart"><b style="height:40%"></b><b style="height:65%"></b><b style="height:50%"></b><b style="height:85%"></b><b style="height:60%"></b><b style="height:95%"></b></div><div class="mock-table"><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div></div></div></div>' },
    { tag: 'DATABASE ADMINISTRATION', title: 'Data that is organised, fast and safe', text: 'Schema design, optimisation, backups and access control for dependable data systems.',
      mock: '<div class="mock"><div class="mock-bar"><b></b><b></b><b></b><em>db.console</em></div><div class="mock-body"><div class="mock-table"><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div></div><div class="ln g"></div></div></div>' },
    { tag: 'GRAPHIC DESIGN', title: 'Brands that look and feel consistent', text: 'Logos, stationery, flyers, social graphics and print layouts built around your identity.',
      mock: '<div class="mock"><div class="mock-bar"><b></b><b></b><b></b><em>brand-board</em></div><div class="mock-body"><div class="mock-brand"><div style="background:#12883a;color:#fff">K</div><div style="background:#0b0d0c;color:#5be08a">Aa</div><div style="background:#e6f5ec;color:#0b6a2b">◐</div><div style="background:#f4f7f5;color:#0b0d0c">★</div></div></div></div>' },
    { tag: 'PHOTOGRAPHY', title: 'Visuals that tell the story', text: 'Portraits, events and product photography with careful light and clean editing.',
      mock: '<div class="mock"><div class="mock-bar"><b></b><b></b><b></b><em>gallery</em></div><div class="mock-body"><div class="mock-photo"><div></div><div></div><div></div></div></div></div>' }
  ];

  /* ---------- slider ---------- */
  var slides = $('#slides'), dots = $('#dots'), cur = 0, count = 0, timer;
  function go(i) {
    cur = (i + count) % count;
    slides.style.transform = 'translateX(' + (-100 * cur) + '%)';
    $$('button', dots).forEach(function (d, k) { d.classList.toggle('on', k === cur); });
  }
  function auto() { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 6500); }
  function buildSlider(projects) {
    var withImg = projects.filter(function (p) { return p.images && p.images.length && p.featured !== false; });
    var items = withImg.slice(0, 8), html;
    if (items.length) {
      html = items.map(function (p, i) {
        var link = safeUrl(p.link);
        return '<div class="slide"><div class="slide-text"><span class="tag">' + esc((p.category || '').toUpperCase()) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.description) + '</p>' +
          (link ? '<a class="button button-white" href="' + esc(link) + '" target="_blank" rel="noopener">Visit project ↗</a>' : '<a class="button button-white" href="#projects">See all work ↗</a>') +
          '</div><div class="slide-media"><img class="shot" data-open="' + esc(p.id) + '" src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="' + (i ? 'lazy' : 'eager') + '"></div></div>';
      }).join('');
    } else {
      html = samples.map(function (s) {
        return '<div class="slide"><div class="slide-text"><span class="tag">' + s.tag + '</span><h3>' + s.title + '</h3><p>' + s.text + '</p><a class="button button-white" href="#contact">Start a project ↗</a></div><div class="slide-media"><span class="sample-tag">SAMPLE</span>' + s.mock + '</div></div>';
      }).join('');
    }
    slides.innerHTML = html;
    count = $$('.slide', slides).length;
    dots.innerHTML = '';
    for (var i = 0; i < count; i++) (function (k) { var b = document.createElement('button'); b.setAttribute('aria-label', 'Go to slide ' + (k + 1)); b.onclick = function () { go(k); auto(); }; dots.appendChild(b); })(i);
    go(0); auto();
  }
  $('#prev').onclick = function () { go(cur - 1); auto(); };
  $('#next').onclick = function () { go(cur + 1); auto(); };
  var sx = null, sl = $('#slider');
  sl.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  sl.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); auto(); } sx = null; });
  sl.addEventListener('mouseenter', function () { clearInterval(timer); });
  sl.addEventListener('mouseleave', auto);

  /* ---------- projects ---------- */
  var all = [], filter = 'All';
  function renderFilters() {
    var cats = ['All'].concat(PKStore.categories);
    $('#filters').innerHTML = cats.map(function (c) { return '<button type="button" class="' + (c === filter ? 'on' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  }
  function renderGrid() {
    var list = all.filter(function (p) { return filter === 'All' || p.category === filter; });
    var grid = $('#projectGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><h3>' + (all.length ? 'Nothing in this category yet' : 'Projects coming soon') + '</h3><p>' + (all.length ? 'Try another filter.' : 'New work will appear here as soon as it is added. Want something built? <a href="#contact">Let\'s talk</a>.') + '</p></div>';
      return;
    }
    grid.innerHTML = list.map(function (p) {
      var link = safeUrl(p.link), n = (p.images || []).length;
      var tech = (p.tech || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
      return '<article class="project-card reveal"><div class="project-art" ' + (n ? 'data-open="' + esc(p.id) + '"' : '') + '>' +
        (n ? '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy">' + (n > 1 ? '<span class="img-count">' + n + ' photos</span>' : '') : esc((p.category || '').toUpperCase())) +
        '</div><div class="project-info"><p class="project-type">' + esc((p.category || '').toUpperCase()) + '</p><h3>' + esc(p.title) + '</h3><p>' + esc(p.description) + '</p>' +
        (tech ? '<div class="tags">' + tech + '</div>' : '') +
        (link ? '<a class="project-link" href="' + esc(link) + '" target="_blank" rel="noopener">View project ↗</a>' : '') + '</div></article>';
    }).join('');
    observe(grid);
  }
  $('#filters').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.c; renderFilters(); renderGrid();
  });

  /* ---------- lightbox ---------- */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbList = [], lbI = 0, lbTitle = '';
  function lbShow() { lbImg.src = lbList[lbI]; lbImg.alt = lbTitle; lbCap.textContent = lbTitle + (lbList.length > 1 ? '  ·  ' + (lbI + 1) + ' / ' + lbList.length : ''); }
  function lbOpen(id) {
    var p = all.filter(function (x) { return x.id === id; })[0]; if (!p || !p.images || !p.images.length) return;
    lbList = p.images; lbI = 0; lbTitle = p.title; lbShow(); lb.hidden = false; document.body.style.overflow = 'hidden';
  }
  function lbClose() { lb.hidden = true; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-open]'); if (t) lbOpen(t.dataset.open); });
  $('#lbClose').onclick = lbClose;
  lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
  $('#lbPrev').onclick = function () { lbI = (lbI - 1 + lbList.length) % lbList.length; lbShow(); };
  $('#lbNext').onclick = function () { lbI = (lbI + 1) % lbList.length; lbShow(); };
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') $('#lbPrev').click();
    if (e.key === 'ArrowRight') $('#lbNext').click();
  });

  /* load */
  renderFilters();
  applySettings(); // defaults first so the page is never empty
  PKStore.loadAll('').then(function (d) { S = d.settings; all = d.projects; applySettings(); buildSlider(all); renderGrid(); if (window.PKWidgets) PKWidgets.init(S, ''); });
})();
