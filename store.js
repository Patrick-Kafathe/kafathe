/* Shared storage for the public site and the admin panel.
   Projects and settings are saved in this browser by the admin panel.
   If nothing is saved, the site falls back to data/site.json (exported from the admin panel). */
(function () {
  var PK = 'pk_projects_v1', SK = 'pk_settings_v1';
  var CATEGORIES = ['Web Development', 'Software', 'Database', 'Photography', 'Graphic Design'];

  var DEFAULTS = {
    announce: { enabled: false, text: 'Now booking projects for the new year — let\'s talk.', link: '#contact', tone: 'green' },
    hero: {
      eyebrow: 'AVAILABLE FOR SELECT PROJECTS', available: true, hello: "Hello, I'm", name: 'Patrick Kafathe',
      roles: ['Software Engineer', 'Database Administrator', 'Web Developer', 'Photographer', 'Graphic Designer'],
      intro: 'I build reliable software, structure data that works, design clean websites and capture visuals that tell a story — helping businesses and people in Kenya and beyond stand out and grow with technology.',
      cta1: 'Explore my work', cta2: 'Get in touch',
      meta: 'Based in Nairobi, Kenya  •  Technology · Design · Problem-solving'
    },
    about: {
      lead: "I'm a Software Engineer, Database Administrator, Web Developer, Photographer and Graphic Designer who turns ideas into reliable systems and visuals people enjoy using.",
      body: "I build and improve websites and software, organise and maintain the data behind them, and design the visuals that carry a brand — from logos and print material to portraits and event photography.\n\nI take time to understand each client's goals, then turn them into clear, polished work delivered on time. I'm based in Nairobi, Kenya, and open to professional opportunities, collaborations and meaningful projects.",
      philosophy: "great engineering and great design aren't separate things. A system should be dependable underneath and effortless on the surface — and every project, big or small, is a chance to sharpen both."
    },
    services: [
      { title: 'Website design & development', desc: 'Fast, responsive websites that present your services and build trust.' },
      { title: 'Software & system development', desc: 'Custom tools, dashboards and systems that streamline your operations.' },
      { title: 'Database setup & administration', desc: 'Schema design, optimisation, backups and secure access for your data.' },
      { title: 'IT systems support', desc: 'Setup, networking, troubleshooting and dependable day-to-day support.' },
      { title: 'Photography', desc: 'Portraits, events and products captured with care and edited cleanly.' },
      { title: 'Graphic design & branding', desc: 'Logos, brand identities, flyers, social graphics and print layouts.' }
    ],
    contact: {
      email: 'patrickkafathe@gmail.com', email2: 'sales@mktechnologies.co.ke', whatsapp: '254725481338', phone: '+254 725 481 338', location: 'Nairobi, Kenya',
      socials: { linkedin: '', github: '', instagram: '', facebook: '', tiktok: '', x: '', youtube: '' }
    },
    reviews: { enabled: true, api: 'api/reviews.php', items: [] },
    prices: { label: 'Check website prices', file: 'assets/docs/MK-Technologies-Website-Packages.pdf' },
    wa: {
      enabled: true, name: 'Patrick', popup: true,
      prefill: "Hello Patrick! I found your portfolio and I have an idea in mind. Let's build it.",
      bubbles: [
        "Psst… got an idea in mind? Let's build it 🚀",
        "Your idea called. It wants a website 📞",
        "Websites, databases, photos… I don't bite, I just build 😄",
        "Coffee ☕ + your idea = a great project. Chat me!",
        "Don't let that idea gather dust — say hi on WhatsApp 💡"
      ]
    },
    appearance: { accent: '#12883a', profile: '' },
    seo: { title: 'Patrick Kafathe | Professional Portfolio', description: 'Patrick Kafathe — Software Engineer, Database Administrator, Web Developer, Photographer and Graphic Designer based in Nairobi, Kenya.' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    if (over === undefined || over === null) return clone(base);
    if (Array.isArray(base) || typeof base !== 'object') return typeof over === typeof base || Array.isArray(base) && Array.isArray(over) ? clone(over) : clone(base);
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = merge(base[k], over[k]); });
    return out;
  }
  function read(key) { try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return { ok: true }; }
    catch (e) { return { ok: false, error: 'Browser storage is full. Remove some images or export your data and clear old projects.' }; }
  }

  window.PKStore = {
    categories: CATEGORIES,
    defaults: function () { return clone(DEFAULTS); },
    merge: function (s) { return merge(DEFAULTS, s || {}); },
    loadAll: function (base) {
      var lp = read(PK), ls = read(SK);
      function done(rp, rs) {
        return { projects: Array.isArray(lp) ? lp : (Array.isArray(rp) ? rp : []), settings: merge(DEFAULTS, ls || rs || {}) };
      }
      if (lp && ls) return Promise.resolve(done());
      return fetch((base || '') + 'data/site.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (d) { d = d || {}; return done(d.projects, d.settings); })
        .catch(function () { return done(); });
    },
    saveProjects: function (list) { return write(PK, list); },
    saveSettings: function (s) { return write(SK, s); },
    usageKB: function () { try { return Math.round(((localStorage.getItem(PK) || '').length + (localStorage.getItem(SK) || '').length) / 1024); } catch (e) { return 0; } },
    uid: function () { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  };
})();
