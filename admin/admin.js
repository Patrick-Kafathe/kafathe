(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function get(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function set(o, p, v) { var k = p.split('.'), last = k.pop(); var t = k.reduce(function (a, x) { return a[x] = a[x] || {}; }, o); t[last] = v; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2800); }

  /* ================= AUTH ================= */
  var PW_KEY = 'pk_admin_pw_v1', SESSION = 'pk_admin_session', AI_KEY = 'pk_ai_key_v1', DEFAULT_PW = 'kafathe2026';
  function hash(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode('pk::' + str)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381; str = 'pk::' + str;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Promise.resolve('f' + h);
  }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  if (!ls(PW_KEY)) $('#defaultHint').hidden = false;

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    Promise.all([hash($('#pw').value), ls(PW_KEY) ? Promise.resolve(ls(PW_KEY)) : hash(DEFAULT_PW)]).then(function (r) {
      if (r[0] === r[1]) { try { sessionStorage.setItem(SESSION, '1'); } catch (x) {} enter(); } else $('#loginErr').hidden = false;
    });
  });
  $('#btnLogout').onclick = function () { try { sessionStorage.removeItem(SESSION); } catch (x) {} location.reload(); };
  $('#btnPw').onclick = function () {
    var a = $('#newPw').value, b = $('#newPw2').value;
    if (a.length < 8) return toast('Password must be at least 8 characters.');
    if (a !== b) return toast('The two passwords do not match.');
    hash(a).then(function (h) { ls(PW_KEY, h); $('#newPw').value = $('#newPw2').value = ''; toast('Password updated.'); renderDashboard(); });
  };

  /* ================= STATE ================= */
  var projects = [], S = PKStore.defaults(), images = [], editingId = null, saveTimer;

  function setSaved(busy) { var s = $('#savedState'); s.textContent = busy ? 'Saving…' : 'All changes saved'; s.classList.toggle('busy', !!busy); }
  function saveSettingsSoon() {
    setSaved(true); clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var r = PKStore.saveSettings(S); setSaved(false);
      if (!r.ok) toast(r.error); renderDashboard();
    }, 350);
  }
  function persistProjects() { var r = PKStore.saveProjects(projects); if (!r.ok) { showErr(r.error); toast(r.error); return false; } return true; }
  function showErr(m) { var e = $('#formErr'); e.textContent = m; e.hidden = !m; }

  function enter() {
    $('#login').hidden = true; $('#app').hidden = false;
    $('#fCat').innerHTML = PKStore.categories.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    PKStore.loadAll('../').then(function (d) { projects = d.projects; S = d.settings; bindSettings(); renderAll(); });
  }
  try { if (sessionStorage.getItem(SESSION)) enter(); } catch (e) {}

  /* ================= TABS ================= */
  var TITLES = { dashboard: 'Dashboard', projects: 'Projects', banner: 'Banner & Hero', about: 'About', services: 'Services', reviews: 'Reviews', contact: 'Contact & Social', appearance: 'Appearance & SEO', settings: 'Settings' };
  function showTab(t) {
    $$('.tab').forEach(function (x) { x.hidden = x.id !== 'tab-' + t; });
    $$('.nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    $('#pageTitle').textContent = TITLES[t]; $('#side').classList.remove('open');
    try { location.hash = t; } catch (e) {}
    window.scrollTo(0, 0);
  }
  $('.nav').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) showTab(g.dataset.go); });
  $('#burger').onclick = function () { $('#side').classList.toggle('open'); };

  /* ================= SETTINGS BINDING ================= */
  function bindSettings() {
    $$('[data-s]').forEach(function (el) {
      var v = get(S, el.dataset.s), type = el.dataset.type;
      if (type === 'bool') el.checked = !!v;
      else if (type === 'lines') el.value = (v || []).join('\n');
      else el.value = v == null ? '' : v;
      el.oninput = el.onchange = function () {
        var nv = type === 'bool' ? el.checked : type === 'lines' ? el.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) : el.value;
        set(S, el.dataset.s, nv); saveSettingsSoon();
        if (el.dataset.s === 'appearance.accent') markSwatch();
      };
    });
    $('#profilePrev').src = S.appearance.profile || '../assets/profile.jpg';
    renderServices(); renderSwatches(); markSwatch(); renderManual();
  }
  function refreshField(path) { var el = $('[data-s="' + path + '"]'); if (!el) return; var v = get(S, path); el.value = Array.isArray(v) ? v.join('\n') : (v || ''); }

  /* swatches */
  var COLORS = ['#12883a', '#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#0b0d0c'];
  function renderSwatches() {
    $('#swatches').innerHTML = COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('');
  }
  function markSwatch() { $$('#swatches button').forEach(function (b) { b.classList.toggle('on', b.dataset.c.toLowerCase() === String(S.appearance.accent).toLowerCase()); }); }
  $('#swatches').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    S.appearance.accent = b.dataset.c; $('[data-s="appearance.accent"]').value = b.dataset.c; markSwatch(); saveSettingsSoon();
  });

  /* images */
  function compress(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = rej;
      fr.onload = function () {
        var img = new Image(); img.onerror = rej;
        img.onload = function () {
          var s = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  $('#btnProfile').onclick = function () { $('#profileFile').click(); };
  $('#profileFile').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    compress(f, 1000, .82).then(function (u) { S.appearance.profile = u; $('#profilePrev').src = u; saveSettingsSoon(); toast('Profile photo updated.'); }).catch(function () { toast('Could not read that image.'); });
    e.target.value = '';
  };
  $('#btnProfileReset').onclick = function () { S.appearance.profile = ''; $('#profilePrev').src = '../assets/profile.jpg'; saveSettingsSoon(); toast('Original photo restored.'); };

  /* ================= AI WRITER ================= */
  function aiKey() { return ls(AI_KEY) || ''; }
  function refreshAiState() { var p = $('#aiState'), has = !!aiKey(); p.textContent = has ? 'Claude connected' : 'Built-in writer'; p.classList.toggle('on', has); }
  $('#btnAiSave').onclick = function () {
    var k = $('#aiKey').value.trim(); if (!/^sk-ant-/.test(k)) return toast('That does not look like a Claude API key.');
    ls(AI_KEY, k); $('#aiKey').value = ''; refreshAiState(); toast('Key saved in this browser.');
  };
  $('#btnAiClear').onclick = function () { ls(AI_KEY, null); refreshAiState(); toast('Key removed.'); };

  function claude(prompt, imageDataUrl) {
    var content = [];
    if (imageDataUrl) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageDataUrl.split(',')[1] } });
    content.push({ type: 'text', text: prompt });
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 600, messages: [{ role: 'user', content: content }] })
    }).then(function (r) { if (!r.ok) throw new Error('API ' + r.status); return r.json(); })
      .then(function (d) { return ((d.content || [])[0] || {}).text || ''; });
  }

  var FIELD_BRIEF = {
    'announce.text': 'a short announcement-bar line (max 90 characters) inviting visitors to book or contact me',
    'hero.intro': 'a 2-sentence hero intro (max 260 characters), confident and warm',
    'about.lead': 'a one-sentence opening statement for my About section (max 220 characters)',
    'about.body': 'two short paragraphs for my About section (max 700 characters total), separated by a blank line',
    'about.philosophy': 'one or two sentences describing my work philosophy (max 240 characters), written to follow the words "My philosophy:" and starting lower-case',
    'seo.description': 'an SEO meta description (max 155 characters)'
  };
  var LOCAL = {
    'announce.text': function () { return pick(['Now booking websites, systems and design projects — let\'s talk.', 'Open for new projects this season — get a free quote today.', 'Need a website, database or brand refresh? I\'m available now.']); },
    'hero.intro': function () { return pick([
      'I build reliable software, structure data that works, design clean websites and capture visuals that tell a story — helping businesses in Kenya and beyond grow with technology.',
      'From databases and web apps to photography and brand design, I turn ideas into dependable, good-looking solutions that help businesses stand out.']); },
    'about.lead': function () { return pick([
      'I\'m a Software Engineer, Database Administrator, Web Developer, Photographer and Graphic Designer who turns ideas into reliable systems and visuals people enjoy using.',
      'I combine engineering and creativity to build software, organise data and design visuals that help businesses work better and look better.']); },
    'about.body': function () { return 'I build and improve websites and software, organise and maintain the data behind them, and design the visuals that carry a brand — from logos and print material to portraits and event photography.\n\nI take time to understand each client\'s goals, then turn them into clear, polished work delivered on time. Based in Nairobi, Kenya, I\'m open to opportunities, collaborations and meaningful projects.'; },
    'about.philosophy': function () { return pick(['great engineering and great design aren\'t separate things — a system should be dependable underneath and effortless on the surface.', 'every project is a chance to sharpen both craft and problem-solving, and good work should feel simple to the people using it.']); },
    'seo.description': function () { return 'Patrick Kafathe — Software Engineer, Database Administrator, Web Developer, Photographer and Graphic Designer in Nairobi, Kenya. View projects and get in touch.'; }
  };
  var CAT_TEXT = {
    'Web Development': ['A responsive, fast-loading website built to present the business clearly and turn visitors into enquiries.', 'Clean layouts, mobile-first design and straightforward navigation help customers find what they need quickly.'],
    'Software': ['A custom software solution that automates everyday tasks and keeps operations organised in one place.', 'Built with a focus on reliability, simple workflows and a clear interface for everyday users.'],
    'Database': ['A well-structured database setup covering schema design, performance tuning and secure access.', 'Regular backups and clear documentation keep the data dependable, fast and easy to maintain.'],
    'Photography': ['A photography project captured with careful lighting, composition and clean editing to tell a clear visual story.', 'Delivered as a polished set of images ready for web, print and social media.'],
    'Graphic Design': ['A graphic design project that communicates the brand clearly through considered typography, colour and layout.', 'Delivered as consistent, print- and web-ready assets that strengthen brand identity.']
  };
  function localProject(title, cat, tech) {
    var t = CAT_TEXT[cat] || CAT_TEXT['Web Development'];
    var tools = tech.length ? ' Built with ' + tech.slice(0, 5).join(', ') + '.' : '';
    var lead = title ? title + ' \u2014 ' + t[0].charAt(0).toLowerCase() + t[0].slice(1) : t[0];
    return lead + ' ' + t[1] + tools;
  }

  /* field buttons */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ai]'); if (!b) return;
    var path = b.dataset.ai;
    var local = LOCAL[path]();
    var apply = function (txt) { set(S, path, txt.trim()); refreshField(path); saveSettingsSoon(); toast('Written — edit it however you like.'); };
    if (!aiKey()) { apply(local); return; }
    var ctx = 'My name is ' + S.hero.name + '. I am a ' + S.hero.roles.join(', ') + ' based in ' + S.contact.location + '. Write ' + FIELD_BRIEF[path] + ' for my portfolio website. Return only the text, no quotes.';
    var old = b.textContent; b.disabled = true; b.textContent = '✨ …';
    claude(ctx).then(apply).catch(function () { toast('Claude was unreachable — used the built-in writer.'); apply(local); }).then(function () { b.disabled = false; b.textContent = old; });
  });

  /* project description */
  $('#aiProject').onclick = function () {
    var title = $('#fTitle').value.trim(), cat = $('#fCat').value;
    var tech = $('#fTech').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!title && !images.length) return toast('Add a title (or an image) first so the AI has something to work with.');
    var b = this, old = b.textContent, fill = function (t) { $('#fDesc').value = t.trim().slice(0, 500); };
    if (!aiKey()) { fill(localProject(title, cat, tech)); toast('Description drafted — tweak as needed.'); return; }
    b.disabled = true; b.textContent = '✨ Writing…';
    var prompt = 'Write a project description (max 320 characters, 2 sentences, no hype words) for a portfolio card. Title: "' + title + '". Category: ' + cat + '. Technologies: ' + (tech.join(', ') || 'not specified') + '. ' + (images.length ? 'The attached image is a screenshot of the project — mention what it shows. ' : '') + 'Return only the description.';
    claude(prompt, images[0]).then(function (t) { fill(t); toast('Description written by Claude.'); })
      .catch(function () { fill(localProject(title, cat, tech)); toast('Claude was unreachable — used the built-in writer.'); })
      .then(function () { b.disabled = false; b.textContent = old; });
  };

  /* ================= SERVICES EDITOR ================= */
  function renderServices() {
    $('#serviceEditor').innerHTML = S.services.map(function (s, i) {
      return '<div class="svc"><span class="n">' + ('0' + (i + 1)).slice(-2) + '</span><div class="f"><input data-sv="title" data-i="' + i + '" value="' + esc(s.title) + '" placeholder="Service name">' +
        '<textarea data-sv="desc" data-i="' + i + '" rows="2" placeholder="Short description">' + esc(s.desc) + '</textarea>' +
        '<div><button type="button" class="ai" data-svai="' + i + '">✨ Write description</button></div></div>' +
        '<div class="a"><button type="button" data-mv="-1" data-i="' + i + '" aria-label="Move up">↑</button><button type="button" data-mv="1" data-i="' + i + '" aria-label="Move down">↓</button><button type="button" data-rm="' + i + '" aria-label="Delete">✕</button></div></div>';
    }).join('') || '<div class="empty">No services yet.</div>';
  }
  $('#serviceEditor').addEventListener('input', function (e) {
    var k = e.target.dataset.sv; if (!k) return; S.services[+e.target.dataset.i][k] = e.target.value; saveSettingsSoon();
  });
  $('#serviceEditor').addEventListener('click', function (e) {
    var t = e.target, i;
    if (t.dataset.rm !== undefined) { S.services.splice(+t.dataset.rm, 1); }
    else if (t.dataset.mv) { i = +t.dataset.i; var j = i + +t.dataset.mv; if (j < 0 || j >= S.services.length) return; var x = S.services.splice(i, 1)[0]; S.services.splice(j, 0, x); }
    else if (t.dataset.svai !== undefined) {
      i = +t.dataset.svai; var sv = S.services[i];
      if (!sv.title.trim()) return toast('Give the service a name first.');
      var local = sv.title + ' tailored to your needs — clear scope, dependable delivery and support after launch.';
      var done = function (txt) { sv.desc = txt.trim(); renderServices(); saveSettingsSoon(); };
      if (!aiKey()) return done(local);
      t.disabled = true; t.textContent = '✨ …';
      return claude('Write one sentence (max 110 characters) describing this freelance service for a portfolio: "' + sv.title + '". Return only the sentence.').then(done).catch(function () { toast('Claude was unreachable — used the built-in writer.'); done(local); });
    } else return;
    renderServices(); saveSettingsSoon();
  });
  $('#addService').onclick = function () { S.services.push({ title: '', desc: '' }); renderServices(); saveSettingsSoon(); var l = $$('#serviceEditor input'); if (l.length) l[l.length - 1].focus(); };

  /* ================= PROJECT FORM ================= */
  function addFiles(files) {
    var list = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); }); if (!list.length) return;
    Promise.all(list.map(function (f) { return compress(f, 1400, .78); })).then(function (u) { images = images.concat(u); renderThumbs(); showErr(''); })
      .catch(function () { showErr('One of the images could not be read.'); });
  }
  function renderThumbs() {
    $('#thumbs').innerHTML = images.map(function (u, i) {
      return '<div class="thumb"><img src="' + u + '" alt=""><button type="button" class="x" data-rm="' + i + '" aria-label="Remove image">✕</button>' +
        (i === 0 ? '<span class="badge">Cover</span>' : '<button type="button" class="cover" data-cover="' + i + '">Cover</button>') + '</div>';
    }).join('');
  }
  $('#drop').onclick = function () { $('#fImgs').click(); };
  $('#fImgs').onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
  ['dragover', 'dragenter'].forEach(function (ev) { $('#drop').addEventListener(ev, function (e) { e.preventDefault(); this.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { $('#drop').addEventListener(ev, function (e) { e.preventDefault(); this.classList.remove('over'); }); });
  $('#drop').addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
  $('#thumbs').addEventListener('click', function (e) {
    var rm = e.target.getAttribute('data-rm'), cv = e.target.getAttribute('data-cover');
    if (rm !== null) { images.splice(+rm, 1); renderThumbs(); }
    if (cv !== null) { var x = images.splice(+cv, 1)[0]; images.unshift(x); renderThumbs(); }
  });
  function resetForm() {
    editingId = null; images = []; $('#projectForm').reset(); $('#fFeat').checked = true;
    $('#formTitle').textContent = 'Add a project'; $('#btnSave').textContent = 'Save project'; $('#btnCancel').hidden = true; renderThumbs(); showErr('');
  }
  $('#btnCancel').onclick = resetForm;
  $('#projectForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var link = $('#fLink').value.trim();
    if (link && !/^https?:\/\//i.test(link)) return showErr('The link must start with http:// or https://');
    var data = { title: $('#fTitle').value.trim(), category: $('#fCat').value, description: $('#fDesc').value.trim(),
      tech: $('#fTech').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean), link: link, featured: $('#fFeat').checked, images: images.slice() };
    var backup = projects.slice(), wasEdit = !!editingId;
    if (editingId) projects = projects.map(function (p) { return p.id === editingId ? Object.assign({}, p, data) : p; });
    else { data.id = PKStore.uid(); data.date = new Date().toISOString(); projects.unshift(data); }
    if (!persistProjects()) { projects = backup; return; }
    toast(wasEdit ? 'Project updated.' : 'Project added — it is now on your site.'); resetForm(); renderAll();
  });
  $('#list').addEventListener('click', function (e) {
    var ed = e.target.getAttribute('data-edit'), dl = e.target.getAttribute('data-del');
    if (ed) {
      var p = projects.filter(function (x) { return x.id === ed; })[0]; if (!p) return;
      editingId = p.id; images = (p.images || []).slice();
      $('#fTitle').value = p.title; $('#fCat').value = p.category; $('#fDesc').value = p.description;
      $('#fTech').value = (p.tech || []).join(', '); $('#fLink').value = p.link || ''; $('#fFeat').checked = p.featured !== false;
      $('#formTitle').textContent = 'Edit project'; $('#btnSave').textContent = 'Update project'; $('#btnCancel').hidden = false; renderThumbs(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (dl && confirm('Delete this project? This cannot be undone.')) {
      var backup = projects.slice(); projects = projects.filter(function (x) { return x.id !== dl; });
      if (!persistProjects()) { projects = backup; return; }
      if (editingId === dl) resetForm(); renderAll(); toast('Project deleted.');
    }
  });

  /* ================= RENDER ================= */
  function renderList() {
    $('#count').textContent = projects.length;
    $('#list').innerHTML = projects.length ? projects.map(function (p) {
      return '<div class="item"><div class="pic">' + (p.images && p.images[0] ? '<img src="' + p.images[0] + '" alt="">' : 'NO IMAGE') + '</div>' +
        '<div><h3>' + esc(p.title) + '</h3><p class="meta"><b>' + esc(p.category) + '</b> · ' + (p.images || []).length + ' image(s)' + (p.featured !== false ? ' · In slides' : '') + '</p></div>' +
        '<div class="acts"><button class="btn ghost sm" data-edit="' + esc(p.id) + '">Edit</button><button class="btn danger sm" data-del="' + esc(p.id) + '">Delete</button></div></div>';
    }).join('') : '<div class="empty"><b>No projects yet.</b><br>Add your first project with the form — it will appear in the showcase slides and the projects grid.</div>';
    var kb = PKStore.usageKB(); $('#storeInfo').textContent = 'Using ~' + kb + ' KB of ~5,000 KB browser storage'; $('#storeUse').textContent = 'Storage used: ~' + kb + ' KB of ~5,000 KB.';
  }
  function renderDashboard() {
    var imgs = projects.reduce(function (n, p) { return n + (p.images || []).length; }, 0), feat = projects.filter(function (p) { return p.images && p.images.length && p.featured !== false; }).length;
    $('#stats').innerHTML = [[projects.length, 'Projects'], [imgs, 'Images'], [feat, 'In showcase slides'], [PKStore.usageKB() + ' KB', 'Storage used']].map(function (s) { return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
    var socials = S.contact.socials || {}, hasSocial = Object.keys(socials).some(function (k) { return socials[k]; });
    var items = [
      ['Add your first project', projects.length > 0, 'projects'], ['Upload your own profile photo', !!S.appearance.profile, 'appearance'],
      ['Add social media links', hasSocial, 'contact'], ['Set your WhatsApp number', !!S.contact.whatsapp, 'contact'],
      ['Turn on an announcement banner', !!S.announce.enabled, 'banner'], ['Change the default admin password', !!ls(PW_KEY), 'settings']
    ];
    $('#checklist').innerHTML = items.map(function (it) { return '<li class="' + (it[1] ? 'done' : '') + '"><span class="dot">' + (it[1] ? '✓' : '') + '</span><span>' + it[0] + '</span>' + (it[1] ? '' : '<a data-go="' + it[2] + '">Do it →</a>') + '</li>'; }).join('');
    var counts = {}; PKStore.categories.forEach(function (c) { counts[c] = 0; }); projects.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var max = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }).concat(1));
    $('#catBars').innerHTML = Object.keys(counts).map(function (k) { return '<div class="bar"><span>' + esc(k) + '</span><div><i style="width:' + (counts[k] / max * 100) + '%"></i></div><b>' + counts[k] + '</b></div>'; }).join('');
  }
  function renderAll() { renderList(); renderDashboard(); refreshAiState(); }

  /* ================= REVIEWS ================= */
  function rvApi() { return '../' + (S.reviews.api || 'api/reviews.php'); }
  function rvToken() { return $('#rvToken').value.trim(); }
  function rvStatus(m, bad) { var e = $('#rvStatus'); e.textContent = m; e.style.color = bad ? 'var(--red)' : ''; }
  function rvCall(opts) {
    return fetch(rvApi() + (opts.query || ''), { method: opts.body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': rvToken() }, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.text().then(function (t) { var d = null; try { d = JSON.parse(t); } catch (x) {} return d; }); });
  }
  function rvRender(items) {
    var box = $('#rvAdminList');
    if (!items.length) { box.innerHTML = '<div class="empty" style="margin-top:10px">No client reviews yet.</div>'; return; }
    box.innerHTML = items.map(function (r) {
      var img = r.image ? '<img src="../' + esc(r.image) + '" alt="">' : esc((r.name || '?').charAt(0).toUpperCase());
      return '<div class="rvi"><div class="pic">' + img + '</div><div><b>' + esc(r.name) + '</b><span class="st ' + esc(r.status) + '">' + esc(r.status) + '</span><p class="meta">' + esc(r.role || '') + ' · ' + '★'.repeat(+r.rating || 0) + ' · ' + esc(r.topic || '') + '</p><p>' + esc(r.text) + '</p></div>' +
        '<div class="acts">' + (r.status !== 'approved' ? '<button class="btn green sm" data-rvact="approved" data-id="' + esc(r.id) + '">Approve</button>' : '<button class="btn ghost sm" data-rvact="hidden" data-id="' + esc(r.id) + '">Hide</button>') +
        '<button class="btn danger sm" data-rvdel="' + esc(r.id) + '">Delete</button></div></div>';
    }).join('');
  }
  function rvLoadAll() {
    if (!rvToken()) return rvStatus('Enter your admin token first.', true);
    rvStatus('Loading…');
    rvCall({ query: '?action=all' }).then(function (d) {
      if (!d) return rvStatus('No reviews server found here. This needs PHP hosting — until then, add reviews by hand below.', true);
      if (!d.ok) return rvStatus(d.error || 'Could not load reviews.', true);
      rvStatus(d.items.length + ' review(s) loaded.'); rvRender(d.items);
    }).catch(function () { rvStatus('Could not reach the reviews server.', true); });
  }
  $('#rvLoad').onclick = rvLoadAll;
  $('#rvAdminList').addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-rvact'), d = e.target.getAttribute('data-rvdel'), id = e.target.getAttribute('data-id') || d;
    if (!a && !d) return;
    if (d && !confirm('Delete this review permanently?')) return;
    rvCall({ body: d ? { action: 'delete', id: id } : { action: 'status', id: id, status: a } }).then(function (r) {
      if (!r || !r.ok) return toast((r && r.error) || 'Action failed.');
      toast(d ? 'Review deleted.' : (a === 'approved' ? 'Review approved — it is now on your site.' : 'Review hidden.')); rvLoadAll();
    }).catch(function () { toast('Could not reach the reviews server.'); });
  });

  function renderManual() {
    var items = (S.reviews.items || []);
    $('#rvManualList').innerHTML = items.map(function (r, i) {
      return '<div class="rvi"><div class="pic">' + esc((r.name || '?').charAt(0).toUpperCase()) + '</div><div><b>' + esc(r.name) + '</b><p class="meta">' + esc(r.role || '') + ' · ' + '★'.repeat(+r.rating || 0) + ' · ' + esc(r.topic || '') + '</p><p>' + esc(r.text) + '</p></div><div class="acts"><button class="btn danger sm" data-mdel="' + i + '">Delete</button></div></div>';
    }).join('');
  }
  $('#rvmAdd').onclick = function () {
    var name = $('#rvmName').value.trim(), text = $('#rvmText').value.trim();
    if (name.length < 2 || text.length < 10) return toast('Add the client name and their review text.');
    S.reviews.items = S.reviews.items || [];
    S.reviews.items.unshift({ id: 'm' + Date.now().toString(36), name: name, role: $('#rvmRole').value.trim(), rating: +$('#rvmRating').value, topic: $('#rvmTopic').value, text: text, date: new Date().toISOString() });
    $('#rvmName').value = $('#rvmRole').value = $('#rvmText').value = ''; renderManual(); saveSettingsSoon(); toast('Review added to your site.');
  };
  $('#rvManualList').addEventListener('click', function (e) {
    var i = e.target.getAttribute('data-mdel'); if (i === null) return;
    S.reviews.items.splice(+i, 1); renderManual(); saveSettingsSoon();
  });

  /* ================= EXPORT / IMPORT / RESET ================= */
  function exportAll() {
    var blob = new Blob([JSON.stringify({ projects: projects, settings: S }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'site.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); toast('Exported. Upload it to data/site.json on your hosting.');
  }
  $('#btnExport').onclick = $('#btnExport2').onclick = exportAll;
  $('#importFile').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return; var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result), list = Array.isArray(d) ? d : d.projects;
        if (!Array.isArray(list)) throw new Error();
        list = list.filter(function (p) { return p && p.title; }).map(function (p) {
          return { id: p.id || PKStore.uid(), title: String(p.title), category: p.category || PKStore.categories[0], description: String(p.description || ''), tech: Array.isArray(p.tech) ? p.tech : [], link: p.link || '', featured: p.featured !== false, images: Array.isArray(p.images) ? p.images : [], date: p.date || new Date().toISOString() };
        });
        var bp = projects, bs = S; projects = list; if (d.settings) S = PKStore.merge(d.settings);
        if (!PKStore.saveProjects(projects).ok || !PKStore.saveSettings(S).ok) { projects = bp; S = bs; return toast('Storage is full — import cancelled.'); }
        bindSettings(); renderAll(); toast('Imported ' + list.length + ' project(s).');
      } catch (x) { toast('That file is not a valid site.json.'); }
    };
    fr.readAsText(f); e.target.value = '';
  };
  $('#btnReset').onclick = function () {
    if (!confirm('Reset all text and settings to the defaults? Projects are kept.')) return;
    S = PKStore.defaults(); PKStore.saveSettings(S); bindSettings(); renderAll(); toast('Settings reset.');
  };
  var h = (location.hash || '').slice(1); if (TITLES[h]) { try { if (sessionStorage.getItem(SESSION)) showTab(h); } catch (e) {} }
})();
