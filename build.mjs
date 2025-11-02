// build.mjs — LEB Online Bible (verse-per-page)
// Domain: https://leb.livingwordbibles.com
// "The Holy Bible" button → https://www.livingwordbibles.com/read-the-bible-online/leb
// Fonts: EB Garamond; Share order: Facebook → Instagram → X → LinkedIn → Email → Copy
// Footer includes the exact LEB credit line with required links (verbatim, hyperlinked).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- CONFIG ----------
const SITE_ORIGIN = "https://leb.livingwordbibles.com";
const OUTPUT_DIR = path.join(__dirname, "dist");
const INPUT_JSON = path.join(__dirname, "EntireBible-LEB.json"); // See format note below
const HOLY_BIBLE_URL = "https://www.livingwordbibles.com/read-the-bible-online/leb";

// Social share targets (desktop-safe)
const shareUrls = (url, title) => ({
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  instagram: `https://www.instagram.com/living.word.bibles/`, // desktop opens profile; mobile uses Web Share API below
  x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
});

// Minimal inline SVG icons
const icons = {
  facebook: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.3V12h2.3V9.7c0-2.2 1.3-3.4 3.3-3.4.96 0 1.96.17 1.96.17v2.16h-1.1c-1.08 0-1.42.67-1.42 1.36V12h2.42l-.39 2.9h-2.03v7A10 10 0 0 0 22 12z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5-2.75a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 3h4.7l5.3 7.3L18.3 3H21l-7.4 9.9L21 21h-4.7l-5.5-7.6L7 21H3l7.8-10.4z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 8.98h4v12H3zM9 8.98h3.83v1.64h.05c.53-.95 1.83-1.96 3.77-1.96 4.03 0 4.78 2.65 4.78 6.1v6.22h-4v-5.52c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.43-2.12 2.92v5.62H9z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>`
};

// HTML shell
const htmlTemplate = ({ book, chapter, verse, text, prevUrl, nextUrl, canonical }) => {
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- Open Graph -->
  <meta property="og:title" content="${book} ${chapter}:${verse} (LEB)">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Living Word Bibles">
  <meta property="og:description" content="Lexham English Bible — ${book} ${chapter}:${verse}">
  <style>
    :root { --ink:#111; --muted:#666; --bg:#fff; --accent:#0e5cff; }
    * { box-sizing: border-box }
    body { margin:0; font-family: 'EB Garamond', serif; color:var(--ink); background:var(--bg); line-height:1.5; }
    header { display:flex; gap:12px; align-items:center; padding:18px 20px; border-bottom:1px solid #eee; }
    .brand { font-size:18px; font-weight:600; letter-spacing:.2px; }
    .brand a { color:var(--ink); text-decoration:none }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; text-decoration:none; border:1px solid #ddd; color:var(--ink); }
    .btn:hover { background:#f9f9f9 }
    main { max-width:820px; margin:24px auto; padding:0 20px; }
    h1 { margin:8px 0 6px; font-size:28px; font-weight:600; }
    .verse { font-size:22px; margin:10px 0 18px; }
    .nav { display:flex; justify-content:space-between; gap:12px; margin:22px 0; }
    .nav a { flex:1; text-align:center; padding:12px 14px; border:1px solid #ddd; border-radius:12px; text-decoration:none; color:var(--ink); }
    .nav a:hover { background:#f9f9f9 }
    .share { display:flex; gap:10px; align-items:center; margin:22px 0 30px; flex-wrap:wrap; }
    .share a, .share button { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:999px; border:1px solid #ddd; background:#fff; color:#111; text-decoration:none; cursor:pointer }
    .share a:hover, .share button:hover { background:#f7f7f7 }
    footer { margin:40px auto; padding:20px; color:var(--muted); font-size:14px; border-top:1px solid #eee; max-width:820px; }
    .footlinks a { color:var(--muted); text-decoration:underline; }
  </style>
</head>
<body>
  <header>
    <a class="btn" href="${HOLY_BIBLE_URL}" title="Back to The Holy Bible">← The Holy Bible</a>
    <div class="brand"><a href="${SITE_ORIGIN}/">Lexham English Bible (LEB)</a></div>
  </header>
  <main>
    <h1>${book} ${chapter}:${verse}</h1>
    <div class="verse">${text}</div>

    <div class="nav">
      <a href="${prevUrl}" rel="prev">← Previous</a>
      <a href="${nextUrl}" rel="next">Next →</a>
    </div>

    <div class="share">
      <a href="${share.facebook}" target="_blank" rel="noopener" aria-label="Share on Facebook">${icons.facebook}<span>Facebook</span></a>
      <a href="${share.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icons.instagram}<span>Instagram</span></a>
      <a href="${share.x}" target="_blank" rel="noopener" aria-label="Share on X">${icons.x}<span>X</span></a>
      <a href="${share.linkedin}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${icons.linkedin}<span>LinkedIn</span></a>
      <a href="${share.email}" aria-label="Share via Email">${icons.email}<span>Email</span></a>
      <button id="copyLink" type="button" aria-label="Copy link">${icons.copy}<span>Copy</span></button>
      <button id="nativeShare" type="button" aria-label="Share">${icons.share ?? icons.copy}<span>Share</span></button>
    </div>
  </main>

  <footer>
    <div class="footlinks">
      “Presented by <a href="https://www.livingwordbibles.com" target="_blank" rel="noopener">Living Word Bibles</a> Under License From
      <a href="https://lexhamenglishbible.com" target="_blank" rel="noopener">Lexham English Bible (LEB)</a> |
      Copyright © 2013 <a href="https://lexhampress.com" target="_blank" rel="noopener">Lexham Press</a> |
      Lexham Press is a registered trademark of Faithlife Corporation.”
    </div>
  </footer>

  <script>
    // Copy link
    document.getElementById('copyLink').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('${canonical}'); alert('Link copied'); }
      catch { prompt('Copy this URL:', '${canonical}'); }
    });

    // Native (mobile) share, falls back to opening IG profile when unsupported
    document.getElementById('nativeShare').addEventListener('click', async () => {
      const data = { title: '${book} ${chapter}:${verse} (LEB)', url: '${canonical}' };
      if (navigator.share) { try { await navigator.share(data); } catch (e) {} }
      else { window.open('${share.instagram}', '_blank'); }
    });
  </script>
</body>
</html>`;
};

// ---------- BUILD ----------
const data = JSON.parse(fs.readFileSync(INPUT_JSON, "utf8"));
// Expected JSON format:
// { books: [ { name:"Genesis", slug:"genesis", chapters: [ [ { v:1, t:"In the beginning..." }, ... ], ... ] }, ... ] }

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Make /[book]/[chapter]/[verse]/ pages
const books = data.books;
const indexOf = []; // flat list for prev/next

for (const b of books) {
  for (let cIdx = 0; cIdx < b.chapters.length; cIdx++) {
    const chapter = b.chapters[cIdx];
    for (let vIdx = 0; vIdx < chapter.length; vIdx++) {
      const verseObj = chapter[vIdx];
      indexOf.push({ book: b.name, bslug: b.slug, c: cIdx + 1, v: verseObj.v, text: verseObj.t });
    }
  }
}

function urlFor(item) {
  return `${SITE_ORIGIN}/${item.bslug}/${item.c}/${item.v}/`;
}

for (let i = 0; i < indexOf.length; i++) {
  const item = indexOf[i];
  const prevItem = indexOf[i - 1] ?? indexOf[i];
  const nextItem = indexOf[i + 1] ?? indexOf[i];
  const dir = path.join(OUTPUT_DIR, item.bslug, String(item.c), String(item.v));
  fs.mkdirSync(dir, { recursive: true });
  const html = htmlTemplate({
    book: item.book,
    chapter: item.c,
    verse: item.v,
    text: item.text,
    prevUrl: `/${prevItem.bslug}/${prevItem.c}/${prevItem.v}/`,
    nextUrl: `/${nextItem.bslug}/${nextItem.c}/${nextItem.v}/`,
    canonical: urlFor(item)
  });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
}

// Root landing (optional): redirect to Genesis 1:1
const first = indexOf[0];
fs.writeFileSync(
  path.join(OUTPUT_DIR, "index.html"),
  `<!doctype html><meta http-equiv="refresh" content="0; url=/${first.bslug}/${first.c}/${first.v}/">`,
  "utf8"
);

// CNAME for GitHub Pages custom domain
fs.writeFileSync(path.join(OUTPUT_DIR, "CNAME"), "leb.livingwordbibles.com", "utf8");

console.log(`Built ${indexOf.length} verse pages to /dist`);
