/* Hidden admin panel — open it by adding #admin to the end of the website address.
   It edits a DRAFT stored in this browser only. When you are happy, "Publish" downloads an
   update package (data/site-data.js + your new pictures). Upload those files to GitHub and the
   live site becomes identical to your draft. Visitors never see drafts. */
(function () {
  'use strict';
  var KEYS = ['hero', 'about', 'slides', 'projects', 'contact', 'appearance', 'reviews', 'announce'];
  var CATS = ['Web Development', 'Software', 'Database', 'Photography', 'Graphic Design', 'Other'];
  var D, root, tab = 'projects', editing = -1, dirty = false;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o === undefined ? null : o)); }
  function getp(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? '' : a[k]; }, o); }
  function setp(o, p, v) { var k = p.split('.'), last = k.pop(); var t = k.reduce(function (a, x) { if (a[x] == null || typeof a[x] !== 'object') a[x] = {}; return a[x]; }, o); t[last] = v; }
  function slug(s) { return String(s || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item'; }

  /* ---------- draft storage ---------- */
  function save() {
    try { localStorage.setItem('pk_draft', JSON.stringify(D)); dirty = true; status('Draft saved in this browser'); return true; }
    catch (e) { status('Storage is full — use fewer/smaller pictures, or publish what you have first.', true); return false; }
  }
  function status(msg, bad) { var s = $('#adSt'); if (!s) return; s.textContent = msg; s.className = bad ? 'bad' : ''; }

  /* ---------- images ---------- */
  function compress(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = rej;
      fr.onload = function () {
        var img = new Image(); img.onerror = rej;
        img.onload = function () {
          var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', q));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- AI helper (templates, nothing leaves the browser) ---------- */
  function aiDesc(p) {
    var t = (p.tech || []).filter(Boolean), tech = t.length ? ' Built with ' + t.slice(0, 4).join(', ') + '.' : '';
    var by = {
      'Web Development': 'A responsive, fast website designed to present the business clearly and turn visitors into customers.',
      'Software': 'A custom system that streamlines daily operations — organised, reliable and easy for the team to use.',
      'Database': 'A well-structured database set up for speed, security and dependable backups.',
      'Photography': 'A photo project captured with careful light and clean, natural editing to tell the story.',
      'Graphic Design': 'A brand and design project with a consistent look across logo, print and social media.'
    };
    return ((by[p.category] || 'A project delivered with care, from first idea to polished result.') + tech).slice(0, 300);
  }

  /* ---------- zip (store-only) so the update can be downloaded as one file ---------- */
  var CT = null;
  function crc32(b) {
    if (!CT) { CT = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CT[n] = c >>> 0; } }
    var c2 = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c2 = CT[(c2 ^ b[i]) & 255] ^ (c2 >>> 8); return (c2 ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), cr = crc32(f.data), sz = f.data.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, cr, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
      c.setUint32(16, cr, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + sz;
    });
    var cs = central.reduce(function (n, p) { return n + p.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  function dataBytes(u) { var b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

  function buildPackage() {
    var out = Object.assign({}, clone(window.SITE_ORIG), clone(D)), files = [], n = 0;
    function take(u, path) { if (/^data:image\//.test(u || '')) { files.push({ name: path, data: dataBytes(u) }); n++; return path; } return u; }
    (out.projects || []).forEach(function (p, i) { p.images = (p.images || []).map(function (u, j) { return take(u, 'assets/projects/' + (i + 1) + '-' + slug(p.title) + '-' + (j + 1) + '.jpg'); }); });
    (out.slides || []).forEach(function (s, i) { s.image = take(s.image, 'assets/img/banner-custom-' + (i + 1) + '.jpg'); });
    if (out.appearance && out.appearance.profile) out.appearance.profile = take(out.appearance.profile, 'assets/profile.jpg');
    var js = '/* Website content — edited with the admin panel (#admin). Upload this file to GitHub (data/site-data.js). */\nwindow.SITE = ' + JSON.stringify(out, null, 2) + ';\n';
    var enc = new TextEncoder();
    files.push({ name: 'data/site-data.js', data: enc.encode(js) });
    files.push({ name: 'README-UPLOAD.txt', data: enc.encode('Upload these files to GitHub, keeping the folders:\r\n\r\n  data/site-data.js   -> replaces the old one\r\n  assets/...          -> your new pictures\r\n\r\nEasiest: unzip this file over your website folder, then upload/commit the changed files.\r\nAfter publishing, open the site with #admin and press "Clear draft".\r\n') });
    return { blob: zip(files), count: n };
  }

  /* ---------- UI helpers ---------- */
  function field(label, path, o) {
    o = o || {}; var v = getp(D, path);
    if (o.csv) v = (v || []).join(', ');
    var attrs = 'data-b="' + path + '"' + (o.csv ? ' data-t="csv"' : '');
    var el = o.area ? '<textarea ' + attrs + ' rows="' + (o.rows || 3) + '">' + esc(v) + '</textarea>' : '<input ' + attrs + ' value="' + esc(v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>';
    return '<label class="f' + (o.wide ? ' w' : '') + '"><span>' + label + '</span>' + el + (o.hint ? '<em>' + o.hint + '</em>' : '') + '</label>';
  }
  function check(label, path) { return '<label class="chk"><input type="checkbox" data-b="' + path + '" data-t="bool"' + (getp(D, path) ? ' checked' : '') + '> ' + label + '</label>'; }
  function pic(src) { return src ? '<img src="' + esc(src) + '" alt="">' : '<i>No picture</i>'; }

  /* ---------- tabs ---------- */
  function tProjects() {
    var ps = D.projects, h = '<div class="bar"><h2>Projects</h2><button class="b dark" data-a="addp">+ Add project</button></div><p class="hint">Projects appear in the sliding showcase (if marked Featured) and in the gallery below it.</p>';
    if (!ps.length) h += '<div class="empty">No projects yet. Tap <b>+ Add project</b> and upload your first pictures.</div>';
    h += ps.map(function (p, i) {
      var open = editing === i, im = p.images || [];
      return '<div class="card' + (open ? ' open' : '') + '"><div class="row"><div class="th">' + pic(im[0]) + '</div><div class="grow"><b>' + esc(p.title || 'Untitled') + '</b><small>' + esc(p.category || '') + ' · ' + im.length + ' picture' + (im.length === 1 ? '' : 's') + (p.featured ? ' · Featured' : '') + '</small></div>' +
        '<button class="b" data-a="edit" data-i="' + i + '">' + (open ? 'Close' : 'Edit') + '</button><button class="b ghost" data-a="delp" data-i="' + i + '">Delete</button></div>' +
        (open ? '<div class="form">' + field('Title', 'projects.' + i + '.title') +
          '<label class="f"><span>Category</span><select data-b="projects.' + i + '.category">' + CATS.map(function (c) { return '<option' + (c === p.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' +
          field('Description', 'projects.' + i + '.description', { area: true, wide: true }) +
          '<div class="w"><button class="b ai" data-a="aip" data-i="' + i + '">✨ Write description for me</button></div>' +
          field('Tools used (comma separated)', 'projects.' + i + '.tech', { csv: true }) + field('Link (optional)', 'projects.' + i + '.link', { ph: 'https://' }) +
          '<div class="w">' + check('Featured (show in the sliding showcase)', 'projects.' + i + '.featured') + '</div>' +
          '<div class="w"><span class="lbl">Pictures (first one is the cover)</span><div class="imgs">' + im.map(function (u, j) { return '<div class="im"><img src="' + esc(u) + '" alt=""><button data-a="rmi" data-i="' + i + '" data-j="' + j + '" aria-label="Remove">×</button></div>'; }).join('') +
          '<label class="up">+ Add<input type="file" accept="image/*" multiple hidden data-a="addi" data-i="' + i + '"></label></div></div></div>' : '') + '</div>';
    }).join('');
    return h;
  }
  function tBanner() {
    var h = '<div class="bar"><h2>Banner pictures</h2><button class="b dark" data-a="adds">+ Add slide</button></div><p class="hint">The sliding banner under your portrait. Best picture size: wide (about 1600×640).</p>';
    h += D.slides.map(function (s, i) {
      return '<div class="card"><div class="form"><div class="w ban"><div class="bimg">' + pic(s.image) + '</div><label class="up">Change picture<input type="file" accept="image/*" hidden data-a="slidei" data-i="' + i + '"></label><button class="b ghost" data-a="dels" data-i="' + i + '">Remove slide</button></div>' +
        field('Tag', 'slides.' + i + '.tag') + field('Title', 'slides.' + i + '.title') + field('Text', 'slides.' + i + '.text', { area: true, rows: 2, wide: true }) + field('Button text', 'slides.' + i + '.cta') + field('Button link', 'slides.' + i + '.link', { ph: '#contact' }) + '</div></div>';
    }).join('');
    return h;
  }
  function tProfile() {
    return '<div class="bar"><h2>Profile & intro</h2></div><div class="card"><div class="form"><div class="w ban"><div class="bimg sq">' + pic(D.appearance.profile) + '</div><label class="up">Change portrait<input type="file" accept="image/*" hidden data-a="prof"></label></div>' +
      field('Your name', 'hero.name') + field('Roles (comma separated)', 'hero.roles', { csv: true, wide: true }) + field('Intro paragraph', 'hero.intro', { area: true, wide: true }) + field('Small line under buttons', 'hero.meta', { wide: true }) +
      field('About — headline', 'about.lead', { area: true, rows: 2, wide: true }) + field('About — details', 'about.body', { area: true, rows: 5, wide: true, hint: 'Leave a blank line between paragraphs.' }) + field('My philosophy', 'about.philosophy', { area: true, rows: 3, wide: true }) +
      '<div class="w">' + check('Show a top announcement bar', 'announce.enabled') + '</div>' + field('Announcement text', 'announce.text', { wide: true }) + '</div></div>';
  }
  function tContact() {
    return '<div class="bar"><h2>Contact details</h2></div><div class="card"><div class="form">' + field('Email', 'contact.email') + field('Second email', 'contact.email2') + field('WhatsApp number (digits, with 254)', 'contact.whatsapp', { ph: '254725481338' }) + field('Phone (shown)', 'contact.phone') +
      field('Website', 'contact.website') + field('Town / country', 'contact.location') + field('Address', 'contact.address', { wide: true }) +
      ['linkedin', 'github', 'instagram', 'facebook', 'tiktok', 'x', 'youtube'].map(function (k) { return field(k.charAt(0).toUpperCase() + k.slice(1) + ' link', 'contact.socials.' + k, { ph: 'https://' }); }).join('') +
      '</div></div><p class="hint">The price list PDF is the file <b>assets/docs/MK-Technologies-Website-Packages.pdf</b> — replace it on GitHub (same name) to update the "Check website prices" button.</p>';
  }
  function tReviews() {
    var it = D.reviews.items || [];
    var h = '<div class="bar"><h2>Reviews</h2></div><div class="card"><div class="form">' + '<div class="w">' + check('Show the reviews section', 'reviews.enabled') + '</div>' +
      field('Optional: form address (Formspree etc.) so reviews reach your inbox', 'reviews.endpoint', { wide: true, ph: 'https://formspree.io/f/…' }) + '</div></div>';
    h += '<div class="card"><div class="form"><div class="w"><span class="lbl">Paste a review sent by a client</span></div><label class="f w"><textarea id="rvPaste" rows="3" placeholder="Paste the whole WhatsApp/email message here, then tap Add pasted review"></textarea></label><div class="w"><button class="b dark" data-a="rvpaste">Add pasted review</button></div>' +
      '<div class="w"><span class="lbl">Or write one</span></div><label class="f"><span>Name</span><input id="rvN"></label><label class="f"><span>Role / business</span><input id="rvR"></label><label class="f"><span>Stars</span><select id="rvS"><option>5</option><option>4</option><option>3</option></select></label><label class="f w"><span>Message</span><textarea id="rvT" rows="2"></textarea></label><div class="w"><button class="b" data-a="rvadd">Add review</button></div></div></div>';
    h += it.map(function (r, i) { return '<div class="card"><div class="row"><div class="grow"><b>' + esc(r.name) + ' · ' + '★'.repeat(+r.rating || 0) + '</b><small>' + esc(r.role || '') + '</small><small class="q">' + esc(r.text) + '</small></div><button class="b ghost" data-a="rvdel" data-i="' + i + '">Delete</button></div></div>'; }).join('');
    return h;
  }
  function tPublish() {
    return '<div class="bar"><h2>Publish to GitHub</h2></div><div class="card"><div class="form"><div class="w"><p class="steps"><b>1.</b> Make your changes in the other tabs (they save automatically in this browser).<br><b>2.</b> Press the button — you get one file with your updated <code>data/site-data.js</code> and new pictures.<br><b>3.</b> Unzip it over your website folder and upload the changed files to GitHub. The live site will then match your draft exactly.<br><b>4.</b> Open the site with <code>#admin</code> and press <b>Clear draft</b>.</p></div>' +
      '<div class="w"><button class="b dark big" data-a="pkg">⬇ Download update package</button> <button class="b ghost" data-a="clear">Clear draft</button></div><div class="w"><small class="hint" id="pkgNote"></small></div></div></div>' +
      '<p class="hint">Why a download? GitHub Pages has no server, so the site cannot save changes by itself. This keeps your site identical everywhere.</p>';
  }
  var TABS = [['projects', 'Projects', tProjects], ['banner', 'Banner', tBanner], ['profile', 'Profile', tProfile], ['contact', 'Contact', tContact], ['reviews', 'Reviews', tReviews], ['publish', 'Publish', tPublish]];

  function render() {
    var t = TABS.filter(function (x) { return x[0] === tab; })[0] || TABS[0], scroll = $('#adMain') ? $('#adMain').scrollTop : 0;
    $('#adTabs').innerHTML = TABS.map(function (x) { return '<button data-a="tab" data-t="' + x[0] + '" class="' + (x[0] === tab ? 'on' : '') + '">' + x[1] + '</button>'; }).join('');
    $('#adMain').innerHTML = t[2]();
    $('#adMain').scrollTop = scroll;
  }

  /* ---------- events ---------- */
  function onInput(e) {
    var el = e.target, p = el.dataset && el.dataset.b; if (!p) return;
    var v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.t === 'csv') v = String(v).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    setp(D, p, v); save();
  }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b || b.type === 'file') return;
    var a = b.dataset.a, i = +b.dataset.i, j = +b.dataset.j;
    if (a === 'close') return close();
    if (a === 'view') { close(); location.reload(); return; }
    if (a === 'tab') { tab = b.dataset.t; editing = -1; return render(); }
    if (a === 'addp') { D.projects.unshift({ title: 'New project', category: 'Web Development', description: '', tech: [], link: '', featured: false, images: [] }); editing = 0; save(); return render(); }
    if (a === 'edit') { editing = editing === i ? -1 : i; return render(); }
    if (a === 'delp') { if (confirm('Delete this project?')) { D.projects.splice(i, 1); editing = -1; save(); render(); } return; }
    if (a === 'aip') { D.projects[i].description = aiDesc(D.projects[i]); save(); return render(); }
    if (a === 'rmi') { D.projects[i].images.splice(j, 1); save(); return render(); }
    if (a === 'adds') { D.slides.push({ image: 'assets/img/banner-web.jpg', tag: 'NEW SLIDE', title: 'Your headline', text: 'A short line about this service.', cta: 'Get in touch', link: '#contact' }); save(); return render(); }
    if (a === 'dels') { if (D.slides.length < 2) return alert('Keep at least one slide.'); if (confirm('Remove this slide?')) { D.slides.splice(i, 1); save(); render(); } return; }
    if (a === 'rvdel') { D.reviews.items.splice(i, 1); save(); return render(); }
    if (a === 'rvadd') { var n = $('#rvN').value.trim(), t = $('#rvT').value.trim(); if (!n || t.length < 5) return alert('Add a name and a message.'); D.reviews.items = D.reviews.items || []; D.reviews.items.unshift({ name: n, role: $('#rvR').value.trim(), rating: +$('#rvS').value, text: t, date: new Date().toISOString().slice(0, 10) }); save(); return render(); }
    if (a === 'rvpaste') {
      var txt = $('#rvPaste').value, m = txt.match(/\{[^{}]*"text"[^{}]*\}/);
      if (!m) return alert('I could not find the review data in that message. Use "Or write one" below instead.');
      try { var r = JSON.parse(m[0]); if (!r.name || !r.text) throw 0; D.reviews.items = D.reviews.items || []; D.reviews.items.unshift({ name: String(r.name), role: String(r.role || ''), rating: +r.rating || 5, text: String(r.text), date: r.date || new Date().toISOString().slice(0, 10) }); save(); render(); }
      catch (x) { alert('That review data looks incomplete.'); }
      return;
    }
    if (a === 'pkg') {
      var pk = buildPackage(), u = URL.createObjectURL(pk.blob), l = document.createElement('a');
      l.href = u; l.download = 'kafathe-site-update.zip'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      $('#pkgNote').textContent = 'Downloaded: data/site-data.js + ' + pk.count + ' picture' + (pk.count === 1 ? '' : 's') + '.'; return;
    }
    if (a === 'clear') { if (confirm('Clear the draft and return to the published site content?')) { try { localStorage.removeItem('pk_draft'); } catch (x) {} location.hash = ''; location.reload(); } return; }
  }
  function onChange(e) {
    var el = e.target; if (el.type !== 'file' || !el.files.length) return;
    var a = el.dataset.a, i = +el.dataset.i, files = Array.prototype.slice.call(el.files); el.value = '';
    status('Processing picture…');
    var job;
    if (a === 'addi') job = Promise.all(files.map(function (f) { return compress(f, 1400, .8); })).then(function (us) { D.projects[i].images = (D.projects[i].images || []).concat(us); });
    else if (a === 'slidei') job = compress(files[0], 1600, .82).then(function (u) { D.slides[i].image = u; });
    else if (a === 'prof') job = compress(files[0], 1000, .85).then(function (u) { D.appearance.profile = u; });
    if (!job) return;
    job.then(function () { save(); render(); }).catch(function () { status('That picture could not be read.', true); });
  }

  /* ---------- open / close ---------- */
  function build() {
    root = document.createElement('div'); root.id = 'adminRoot'; root.className = 'adm';
    root.innerHTML = '<div class="adm-top"><div class="adm-t"><b>Admin</b><span id="adSt">Draft saves in this browser</span></div><div class="adm-btns"><button class="b" data-a="view">Preview site</button><button class="b dark" data-a="close">Close</button></div></div><nav id="adTabs" class="adm-tabs"></nav><main id="adMain" class="adm-main"></main>';
    document.body.appendChild(root);
    root.addEventListener('input', onInput); root.addEventListener('change', function (e) { onInput(e); onChange(e); }); root.addEventListener('click', onClick);
  }
  function open() {
    D = {}; KEYS.forEach(function (k) { D[k] = clone(window.SITE[k] === undefined ? (k === 'projects' || k === 'slides' ? [] : {}) : window.SITE[k]); });
    D.reviews.items = D.reviews.items || []; D.appearance = D.appearance || {}; D.announce = D.announce || {}; D.contact.socials = D.contact.socials || {};
    if (!root) build();
    root.hidden = false; document.body.style.overflow = 'hidden'; render();
  }
  function close() { if (root) root.hidden = true; document.body.style.overflow = ''; history.replaceState(null, '', location.pathname + location.search); if (dirty) location.reload(); }
  window.PKAdmin = { open: open };
  open();
})();
