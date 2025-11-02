// build.mjs — LEB Online Bible (verse-per-page)
// Domain: https://leb.livingwordbibles.com
// "The Holy Bible" button → https://www.livingwordbibles.com/read-the-bible-online/leb
// Fonts: EB Garamond; Share order: Facebook → Instagram → X → LinkedIn → Email → Copy
// Footer: LEB credit line (no quotes) with required hyperlinks.
// AdSense: Auto ads in <head> (ca-pub-5303063222439969)
// New: Centered LWB logo; Search bar with datalist + verse parser; emits meta.json; build guard for < 30k verses.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- CONFIG ----------
const SITE_ORIGIN = "https://leb.livingwordbibles.com";
const OUTPUT_DIR = path.join(__dirname, "dist");
const INPUT_JSON = path.join(__dirname, "EntireBible-LEB.json");
const HOLY_BIBLE_URL = "https://www.livingwordbibles.com/read-the-bible-online/leb";
const ADSENSE_CLIENT = "ca-pub-5303063222439969";
const LOGO_URL =
  "https://static1.squarespace.com/static/68d6b7d6d21f02432fd7397b/t/690209b3567af44aabfbdaca/1761741235124/LivingWordBibles01.png";

// ---------- HELPERS ----------
const shareUrls = (url, title) => ({
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  instagram: `https://www.instagram.com/living.word.bibles/`,
  x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
});

const icons = {
  logo: `<img src="${LOGO_URL}" alt="Living Word Bibles" style="height:30px;vertical-align:middle">`,
  facebook: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.3V12h2.3V9.7c0-2.2 1.3-3.4 3.3-3.4.96 0 1.96.17 1.96.17v2.16h-1.1c-1.08 0-1.42.67-1.42 1.36V12h2.42l-.39 2.9h-2.03v7A10 10 0 0 0 22 12z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5-2.75a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 3h4.7l5.3 7.3L18.3 3H21l-7.4 9.9L21 21h-4.7l-5.5-7.6L7 21H3l7.8-10.4z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 8.98h4v12H3zM9 8.98h3.83v1.64h.05c.53-.95 1.83-1.96 3.77-1.96 4.03 0 4.78 2.65 4.78 6.1v6.22h-4v-5.52c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.43-2.12 2.92v5.62H9z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>`,
  dice: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" ry="4"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="8" cy="16" r="1.5"/></svg>`
};

// HTML template (now includes centered logo + search form)
const htmlTemplate = ({ book, chapter, verse, text, prevUrl, nextUrl, canonical, datalistOptions, booksInject }) => {
  const title = `LEB — ${book} ${chapter}:${verse} | The Holy Bible (Living Word Bibles)`;
  const share = shareUrls(canonical, `${book} ${chapter}:${verse} (LEB)`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <link rel="canonical" href="${canonical}">
  <!-- EB Garamond -->
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- AdSense Auto ads -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
  <!-- Open Graph -->
  <meta property="og:title" content="${book} ${chapter}:${verse} (LEB)"><meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}"><meta property="og:site_name" content="Living Word Bibles">
  <meta property="og:description" content="Lexham English Bible — ${book} ${chapter}:${verse}">
  <style>
    :root { --ink:#111; --muted:#666; --bg:#fff; --accent:#0e5cff; }
    * { box-sizing: border-box }
    body { margin:0; font-family: 'EB Garamond', serif; color:var(--ink); background:var(--bg); line-height:1.5; }
    header { display:grid; grid-template-columns: 1fr auto 1fr; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid #eee; }
    .left, .center, .right { display:flex; align-items:center; gap:12px; }
    .center { justify-content:center; }
    .right { justify-content:flex-end; flex-wrap:wrap; gap:10px; }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; text-decoration:none; border:1px solid #ddd; color:var(--ink); background:#fff; cursor:pointer }
    .btn:hover { background:#f9f9f9 }
    .brand a { color:var(--ink); text-decoration:none; font-weight:600; letter-spacing:.2px; }
    main { max-width:820px; margin:24px auto; padding:0 20px; }
    h1 { margin:8px 0 6px; font-size:28px; font-weight:600; }
    .verse { font-size:22px; margin:10px 0 18px; }
    .nav { display:flex; gap:12px; margin:22px 0; }
    .nav a, .nav button { flex:1; text-align:center; padding:12px 14px; border:1px solid #ddd; border-radius:12px; text-decoration:none; color:var(--ink); background:#fff; cursor:pointer }
    .nav a:hover, .nav button:hover { background:#f9f9f9 }
    .share { display:flex; gap:10px; align-items:center; margin:22px 0 30px; flex-wrap:wrap; }
    .share a, .share button { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:999px; border:1px solid #ddd; background:#fff; color:#111; text-decoration:none; cursor:pointer }
    .share a:hover, .share button:hover { background:#f7f7f7 }
    footer { margin:40px auto; padding:20px; color:var(--muted); font-size:14px; border-top:1px solid #eee; max-width:820px; }
    .footlinks a { color:var(--muted); text-decoration:underline; }
    /* Search bar */
    form[role="search"] { display:flex; align-items:center; gap:8px; }
    input[type="search"] { font-family: inherit; font-size:16px; padding:10px 12px; border:1px solid #ddd; border-radius:12px; min-width:220px; }
    .searchBtn { padding:10px 12px; border:1px solid #ddd; border-radius:12px; background:#fff; cursor:pointer; }
  </style>
</head>
<body>
  <header>
    <div class="left">
      <a class="btn" href="${HOLY_BIBLE_URL}" title="Back to The Holy Bible">← The Holy Bible</a>
    </div>

    <div class="center brand">
      <a href="${SITE_ORIGIN}/" aria-label="Lexham English Bible">${icons.logo}</a>
    </div>

    <div class="right">
      <form id="searchForm" role="search" aria-label="Search for a verse">
        <input id="q" name="q" type="search" placeholder="Search: John 3:16" list="booklist" autocomplete="off" aria-label="Verse search">
        <button class="searchBtn" type="submit">Go</button>
        <datalist id="booklist">
          ${datalistOptions}
        </datalist>
      </form>
      <button id="randomBtn" class="btn" title="Random verse">${icons.dice}<span>Random</span></button>
    </div>
  </header>

  <main>
    <h1>${book} ${chapter}:${verse}</h1>
    <div class="verse">${text}</div>

    <div class="nav">
      <a href="${prevUrl}" rel="prev">← Previous</a>
      <button id="randomBtn2" type="button">${icons.dice}<span style="margin-left:6px">Random</span></button>
      <a href="${nextUrl}" rel="next">Next →</a>
    </div>

    <div class="share">
      <a href="${share.facebook}" target="_blank" rel="noopener" aria-label="Share on Facebook">${icons.facebook}<span>Facebook</span></a>
      <a href="${share.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icons.instagram}<span>Instagram</span></a>
      <a href="${share.x}" target="_blank" rel="noopener" aria-label="Share on X">${icons.x}<span>X</span></a>
      <a href="${share.linkedin}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${icons.linkedin}<span>LinkedIn</span></a>
      <a href="${share.email}" aria-label="Share via Email">${icons.email}<span>Email</span></a>
      <button id="copyLink" type="button" aria-label="Copy link">${icons.copy}<span>Copy</span></button>
      <button id="nativeShare" type="button" aria-label="Share"><span>Share</span></button>
    </div>
  </main>

  <footer>
    <div class="footlinks">
      Presented by <a href="https://www.livingwordbibles.com" target="_blank" rel="noopener">Living Word Bibles</a> Under License From
      <a href="https://lexhamenglishbible.com" target="_blank" rel="noopener">Lexham English Bible (LEB)</a> |
      Copyright © 2013 <a href="https://lexhampress.com" target="_blank" rel="noopener">Lexham Press</a> |
      Lexham Press is a registered trademark of Faithlife Corporation.
    </div>
  </footer>

  <script>
    // Inject list of books (name + slug) for search:
    const BOOKS = ${booksInject};

    // Copy link
    document.getElementById('copyLink').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('${canonical}'); alert('Link copied'); }
      catch { prompt('Copy this URL:', '${canonical}'); }
    });

    // Native share (mobile) → fallback to Instagram profile on desktop
    document.getElementById('nativeShare').addEventListener('click', async () => {
      const data = { title: '${book} ${chapter}:${verse} (LEB)', url: '${canonical}' };
      if (navigator.share) { try { await navigator.share(data); } catch (e) {} }
      else { window.open('${share.instagram}', '_blank'); }
    });

    // Random verse (uses index.json)
    async function goRandom() {
      try {
        const res = await fetch('/index.json', { cache: 'no-store' });
        const data = await res.json();
        const list = data.verses || [];
        if (!list.length) return;
        const pick = list[Math.floor(Math.random() * list.length)];
        window.location.href = pick;
      } catch (e) { window.location.href = '${nextUrl}'; }
    }
    document.getElementById('randomBtn').addEventListener('click', goRandom);
    document.getElementById('randomBtn2').addEventListener('click', goRandom);

    // ---- Search handling ----
    const $form = document.getElementById('searchForm');
    const $q = document.getElementById('q');

    const normalize = s => (s||"").toLowerCase().replace(/[^a-z0-9]/g,'');
    function parseQuery(q){
      // Accept patterns like "John 3:16", "1 John 1:9", "Gen 1:1", "john 3"
      const m = q.trim().match(/^([1-3]?\\s*[A-Za-z .'-]+)\\s+(\\d+)(?::(\\d+))?$/);
      if(!m) return null;
      const bookRaw = m[1], c = parseInt(m[2],10), v = m[3] ? parseInt(m[3],10) : 1;
      const target = normalize(bookRaw);
      // exact, startsWith, contains
      let book = BOOKS.find(b => normalize(b.name) === target)
             || BOOKS.find(b => normalize(b.name).startsWith(target))
             || BOOKS.find(b => target.startsWith(normalize(b.name)));
      if(!book) return null;
      return { slug: book.slug, c, v };
    }

    let META = null;
    async function ensureMeta(){
      if (META) return META;
      try {
        const res = await fetch('/meta.json', { cache: 'force-cache' });
        META = await res.json();
      } catch {}
      return META;
    }

    async function clampAndGo(ref){
      const meta = await ensureMeta();
      let { slug, c, v } = ref;
      if (meta && meta.books) {
        const b = meta.books.find(x => x.slug === slug);
        if (b) {
          const maxC = b.chapters.length;
          if (c < 1) c = 1; if (c > maxC) c = maxC;
          const maxV = b.chapters[c-1] || 1;
          if (v < 1) v = 1; if (v > maxV) v = maxV;
        }
      }
      window.location.href = \`/\${slug}/\${c}/\${v}/\`;
    }

    $form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ref = parseQuery($q.value);
      if (!ref) { $q.focus(); $q.select(); return; }
      clampAndGo(ref);
    });
  </script>
</body>
</html>`;
};

// ---------- BUILD ----------
const raw = fs.readFileSync(INPUT_JSON, "utf8");
const data = JSON.parse(raw);

// EXPECTED JSON SHAPE:
// { books: [ { name:"Genesis", slug:"genesis", chapters: [ [ { v:1, t:"..." }, ... ], ... ] }, ... ] }
if (!data.books || !Array.isArray(data.books) || data.books.length === 0) {
  console.error("❌ INPUT ERROR: EntireBible-LEB.json must have { books: [...] } with chapters and verse objects { v, t }.");
  process.exit(1);
}

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Build flat index + datalist options + meta
const books = data.books;
const indexOf = [];
const meta = { books: [] };
let datalistOptions = "";
const booksInject = JSON.stringify(books.map(b => ({ name: b.name, slug: b.slug })));

for (const b of books) {
  if (!b.name || !b.slug || !Array.isArray(b.chapters)) {
    console.error(`❌ Bad book entry. Expected { name, slug, chapters[] } — got: ${JSON.stringify(b).slice(0,200)}…`);
    process.exit(1);
  }
  datalistOptions += `<option value="${b.name}"></option>`;
  const chapterVerseCounts = [];
  for (let cIdx = 0; cIdx < b.chapters.length; cIdx++) {
    const chapter = b.chapters[cIdx];
    if (!Array.isArray(chapter)) {
      console.error(`❌ Bad chapter array in ${b.name} ch ${cIdx+1}.`);
      process.exit(1);
    }
    chapterVerseCounts.push(chapter.length);
    for (let vIdx = 0; vIdx < chapter.length; vIdx++) {
      const v = chapter[vIdx];
      if (typeof v?.v !== "number" || typeof v?.t !== "string") {
        console.error(`❌ Bad verse object in ${b.name} ${cIdx+1}:${vIdx+1}. Expected { v:number, t:string } got ${JSON.stringify(v)}`);
        process.exit(1);
      }
      indexOf.push({ book: b.name, bslug: b.slug, c: cIdx + 1, v: v.v, text: v.t });
    }
  }
  meta.books.push({ name: b.name, slug: b.slug, chapters: chapterVerseCounts });
}

// Guard: require near-full canon (~31,102 verses)
if (indexOf.length < 30000) {
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify({ verses: indexOf.map(it => `/${it.bslug}/${it.c}/${it.v}/`) }), "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "meta.json"), JSON.stringify(meta), "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "health.html"), `<!doctype html><meta charset="utf-8"><title>LEB Health</title>
    <h1>LEB Health</h1><p>Total verses built: ${indexOf.length} (expected about 31,102).</p>
    <p>Fix your source file (EntireBible-LEB.json) and rebuild.</p>`, "utf8");
  console.error(`❌ Built only ${indexOf.length} verses. Expected ~31,102. Aborting deploy.`);
  process.exit(1);
}

// Emit every verse page
function canonicalUrl(it){ return `${SITE_ORIGIN}/${it.bslug}/${it.c}/${it.v}/`; }

for (let i = 0; i < indexOf.length; i++) {
  const it = indexOf[i];
  const prev = indexOf[i - 1] ?? indexOf[i];
  const next = indexOf[i + 1] ?? indexOf[i];
  const dir = path.join(OUTPUT_DIR, it.bslug, String(it.c), String(it.v));
  fs.mkdirSync(dir, { recursive: true });
  const html = htmlTemplate({
    book: it.book,
    chapter: it.c,
    verse: it.v,
    text: it.text,
    prevUrl: `/${prev.bslug}/${prev.c}/${prev.v}/`,
    nextUrl: `/${next.bslug}/${next.c}/${next.v}/`,
    canonical: canonicalUrl(it),
    datalistOptions,
    booksInject
  });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
}

// index.json for Random & meta.json for Search validation
const manifest = indexOf.map((it) => `/${it.bslug}/${it.c}/${it.v}/`);
fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify({ verses: manifest }), "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "meta.json"), JSON.stringify(meta), "utf8");

// Root redirect to Genesis 1:1
const first = indexOf[0];
fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"),
  `<!doctype html><meta http-equiv="refresh" content="0; url=/${first.bslug}/${first.c}/${first.v}/">`,
  "utf8");

// /random redirect helper
fs.mkdirSync(path.join(OUTPUT_DIR, "random"), { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, "random", "index.html"),
  `<!doctype html><title>Random Verse</title><script>
    (async()=>{try{const r=await fetch('/index.json');const d=await r.json();
    const list=d.verses||[]; if(!list.length) location.href='/';
    else location.href=list[Math.floor(Math.random()*list.length)];}catch(e){location.href='/';}})();
  </script>`, "utf8");

// CNAME for custom domain
fs.writeFileSync(path.join(OUTPUT_DIR, "CNAME"), "leb.livingwordbibles.com", "utf8");

console.log(`✅ Built ${indexOf.length} verse pages to /dist (plus index.json, meta.json & /random).`);
