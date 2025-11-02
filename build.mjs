// build.mjs — LEB Online Bible (client-rendered, license-safe)
// Publishes a single-page app to /dist that fetches LEB content at runtime via Biblia API.
// No bulk text is stored. Exits 0 on success.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST = path.join(__dirname, "dist");
const API_KEY = process.env.BIBLIA_KEY || "YOUR_BIBLIA_API_KEY";

// ——— helpers
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const write = (p, s) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, s);
};

// ——— clean & scaffold
fs.rmSync(DIST, { recursive: true, force: true });
ensureDir(DIST);

// ——— app HTML (inline CSS/JS for simplicity)
const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>LEB Online Bible — Living Word Bibles</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="biblia-key" content="${API_KEY}">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root { --maxw: 820px; }
  body { margin:0; font-family:'EB Garamond',serif; color:#111; line-height:1.55; }
  .wrap { max-width:var(--maxw); margin:32px auto; padding:16px; }
  .head { display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:10px; text-align:center; }
  .head img { height:40px; width:auto; }
  .title { font-size:18px; letter-spacing:.02em; opacity:.85; }
  .bar { display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin:12px 0 18px; }
  .ref { font-size:16px; }
  .actions { display:flex; gap:8px; flex-wrap:wrap; }
  .btn, .input { font-size:14px; border:1px solid #e3e3e3; border-radius:12px; padding:8px 12px; background:#fff; }
  .btn { cursor:pointer; }
  .btn:focus-visible, .input:focus-visible { outline:2px solid #7aa7ff; outline-offset:2px; }
  .content { font-size:20px; min-height:140px; }
  .footer { font-size:12px; opacity:.8; margin-top:18px; }
  a { color:inherit; text-decoration:underline; }
  @media (hover:hover){ .btn:hover { background:#f8f8f8 } }
</style>
</head>
<body>
  <div class="wrap">
    <header class="head">
      <img id="logo" alt="Living Word Bibles" />
      <div class="title">The Holy Bible — Lexham English Bible (LEB)</div>
    </header>

    <section class="bar">
      <div class="ref"><strong id="curRef"></strong></div>
      <div class="actions">
        <input id="jump" class="input" placeholder="Go to (e.g., John 3:16)" />
        <button id="go" class="btn">Go</button>
        <button id="prev" class="btn" title="Previous verse">←</button>
        <button id="next" class="btn" title="Next verse">→</button>
        <button id="copy" class="btn">Copy</button>
        <button id="share" class="btn">Share</button>
      </div>
    </section>

    <main id="html" class="content" aria-live="polite">Loading…</main>

    <footer class="footer">
      Scripture quotations marked <span>LEB</span> are from the
      <a href="https://lexhamenglishbible.com" target="_blank" rel="noopener">Lexham English Bible</a>.
      Copyright © 2012 Logos Bible Software. “Lexham” is a registered trademark of Logos Bible Software.
      In electronic use, link “LEB”/“Lexham English Bible” to the LEB site, and
      <a href="https://www.logos.com" target="_blank" rel="noopener">Logos Bible Software</a> accordingly.
      Powered by the <a href="https://bibliaapi.com/docs/" target="_blank" rel="noopener">Biblia API</a>.
    </footer>
  </div>

<script type="module">
  // ——— Config
  const API_KEY = document.querySelector('meta[name="biblia-key"]').content;
  const LOGO_URL = "https://static1.squarespace.com/static/68d6b7d6d21f02432fd7397b/t/690209b3567af44aabfbdaca/1761741235124/LivingWordBibles01.png";
  const DEFAULT_REF = "John 1:1";
  const BOOKS = [
    "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Songs","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
  ];

  // ——— Elements
  const $ = (s) => document.querySelector(s);
  const htmlBox = $("#html");
  const curRef = $("#curRef");
  const input = $("#jump");
  const goBtn = $("#go");
  const prevBtn = $("#prev");
  const nextBtn = $("#next");
  const copyBtn = $("#copy");
  const shareBtn = $("#share");
  $("#logo").src = LOGO_URL;

  // ——— Routing
  function pathToRef() {
    // Support /john/3/16/, ?ref=, and #ref=
    const u = new URL(location.href);
    const qRef = u.searchParams.get("ref");
    if (qRef) return decodeURIComponent(qRef);
    const h = (location.hash || "").replace(/^#ref=/i, "");
    if (h) return decodeURIComponent(h);
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length >= 3) {
      const [bookSlug, chap, verse] = parts;
      const book = slugToBook(bookSlug) || bookSlug;
      if (Number(chap) && Number(verse)) return book + " " + chap + ":" + verse;
    }
    return DEFAULT_REF;
  }

  function refToPath(ref) {
    const m = ref.match(/^\\s*([1-3]?\\s?[A-Za-z .]+)\\s+(\\d+):(\\d+)\\s*$/);
    if (!m) return "/";
    const book = m[1].trim();
    const chap = m[2];
    const verse = m[3];
    const slug = book.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-\$/g,"");
    return "/" + slug + "/" + chap + "/" + verse + "/";
  }

  function slugToBook(slug) {
    const clean = slug.replace(/-/g," ").trim();
    // rough matcher by prefix ignoring case/spaces
    const target = clean.toLowerCase();
    return BOOKS.find(b => b.toLowerCase().replace(/\\s+/g," ").startsWith(target));
  }

  // ——— Fetch & render
  async function fetchPassageHTML(ref) {
    if (!API_KEY || API_KEY === "YOUR_BIBLIA_API_KEY") {
      return "<p><strong>Missing Biblia API key.</strong> Set BIBLIA_KEY in your build environment.</p>";
    }
    const url = "https://api.biblia.com/v1/bible/content/LEB.html"
      + "?style=fullyFormatted&redLetter=true&passage=" + encodeURIComponent(ref)
      + "&key=" + encodeURIComponent(API_KEY);
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const html = await res.text();
    return html;
  }

  async function render(ref) {
    curRef.textContent = ref;
    input.value = ref;
    htmlBox.innerHTML = "Loading…";
    try {
      const html = await fetchPassageHTML(ref);
      htmlBox.innerHTML = html;
      const p = refToPath(ref);
      if (location.pathname !== p) history.replaceState(null, "", p);
      // also expose #ref= for easy copy/paste
      history.replaceState(null, "", p + "#ref=" + encodeURIComponent(ref));
      document.title = ref + " — LEB Online Bible";
    } catch (e) {
      console.error(e);
      htmlBox.innerHTML = "<p>Sorry—couldn’t load that passage. Check the reference and try again.</p>";
    }
  }

  // ——— Navigation (guess-and-check; avoids bundling verse counts)
  function parseRef(ref) {
    const m = ref.match(/^\\s*([1-3]?\\s?[A-Za-z .]+)\\s+(\\d+):(\\d+)\\s*$/);
    if (!m) return null;
    return { book: m[1].trim(), chap: parseInt(m[2],10), verse: parseInt(m[3],10) };
  }

  function canonIndex(book) {
    const idx = BOOKS.findIndex(b => b.toLowerCase() === book.toLowerCase());
    return idx >= 0 ? idx : BOOKS.findIndex(b => b.toLowerCase().startsWith(book.toLowerCase()));
  }

  async function step(ref, delta) {
    const p = parseRef(ref);
    if (!p) return ref;
    const tryRefs = [];
    // primary guess: +/- 1 verse
    tryRefs.push(\`\${p.book} \${p.chap}:\${p.verse + delta}\`);
    // fallback within chapter (start/end)
    if (delta > 0) tryRefs.push(\`\${p.book} \${p.chap}:\${p.verse + 2}\`);
    else tryRefs.push(\`\${p.book} \${p.chap}:\${Math.max(1, p.verse - 2)}\`);
    // cross chapter
    if (delta > 0) {
      tryRefs.push(\`\${p.book} \${p.chap + 1}:1\`);
    } else {
      tryRefs.push(\`\${p.book} \${Math.max(1, p.chap - 1)}:1\`);
    }
    // cross book
    const bi = canonIndex(p.book);
    if (bi >= 0) {
      const nb = BOOKS[bi + (delta > 0 ? 1 : -1)];
      if (nb) tryRefs.push(\`\${nb} 1:1\`);
    }
    // probe the API until one works
    for (const r of tryRefs) {
      try {
        const h = await fetchPassageHTML(r);
        if (h && h.trim()) return r;
      } catch(_) {}
    }
    return ref; // give up
  }

  // ——— Wire up UI
  function currentRef() { return curRef.textContent || DEFAULT_REF; }

  goBtn.addEventListener("click", () => render(input.value.trim() || DEFAULT_REF));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") render(input.value.trim() || DEFAULT_REF); });

  prevBtn.addEventListener("click", async () => { render(await step(currentRef(), -1)); });
  nextBtn.addEventListener("click", async () => { render(await step(currentRef(), +1)); });

  copyBtn.addEventListener("click", async () => {
    const text = \`\${currentRef()}\\n\\n\${htmlBox.innerText}\\n\\n(LEB — Lexham English Bible) https://lexhamenglishbible.com\`;
    try { await navigator.clipboard.writeText(text); copyBtn.textContent = "Copied"; setTimeout(()=>copyBtn.textContent="Copy",1200); } catch {}
  });

  shareBtn.addEventListener("click", async () => {
    const url = location.href;
    const title = currentRef() + " — LEB";
    const text = title + "\\n" + url;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch {}
    } else {
      const u = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
      window.open(u, "_blank","noopener");
    }
  });

  window.addEventListener("popstate", () => render(pathToRef()));
  // initial render
  render(pathToRef());
</script>
</body>
</html>`;

write(path.join(DIST, "index.html"), HTML);
// 404 fallback (GitHub Pages style), reuse same app so deep links resolve.
write(path.join(DIST, "404.html"), HTML);

// Minimal robots.txt (you can adjust later)
write(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n`);

// Friendly build note
write(path.join(DIST, "README_BUILD.txt"),
`LEB Online Bible — build output
- This app fetches LEB text on the client from the Biblia API.
- No LEB text is stored in this repository or in /dist.
- API key placeholder was: ${API_KEY === "YOUR_BIBLIA_API_KEY" ? "MISSING — set BIBLIA_KEY!" : "OK"}
`);

console.log("[LEB] Build complete ✓  dist/ created with index.html, 404.html, robots.txt");
process.exit(0);
