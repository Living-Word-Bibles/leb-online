// build.mjs — LEB Online Bible (static exporter, verse-per-page)
// Input:  data/leb.json (created by scripts/ingest-leb-text.mjs)
// Output: dist/ with /book/chap/verse/ pages + index.html + 404.html + robots.txt + LICENSE-LEB.txt

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.join(__dirname, "dist");
const DATA = path.join(__dirname, "data", "leb.json");

// ---- helpers
const ensureDir = p => fs.mkdirSync(p, { recursive: true });
const write = (p,s) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, s); };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

if (!fs.existsSync(DATA)) {
  console.error("Missing data/leb.json. Run: node scripts/ingest-leb-text.mjs data/leb.txt data/leb.json");
  process.exit(1);
}
const LEB = JSON.parse(fs.readFileSync(DATA,"utf8"));

// ---- clean
fs.rmSync(DIST, { recursive: true, force: true });
ensureDir(DIST);

// ---- shared assets (inline CSS for speed)
const CSS = `
:root{--maxw:820px}
*{box-sizing:border-box}
body{margin:0;font-family:'EB Garamond',serif;color:#111;line-height:1.55;background:#fff}
.wrap{max-width:var(--maxw);margin:32px auto;padding:16px}
.head{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:10px;text-align:center}
.head img{height:40px;width:auto}
.title{font-size:18px;letter-spacing:.02em;opacity:.85}
.bar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:12px 0 18px}
.ref{font-size:16px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn,.input{font-size:14px;border:1px solid #e3e3e3;border-radius:12px;padding:8px 12px;background:#fff}
.btn{cursor:pointer}
.btn:focus-visible,.input:focus-visible{outline:2px solid #7aa7ff;outline-offset:2px}
.content{font-size:20px;min-height:120px}
.footer{font-size:12px;opacity:.8;margin-top:18px}
a{color:inherit;text-decoration:underline}
@media (hover:hover){.btn:hover{background:#f8f8f8}}
`;

const HEAD = (title) => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head><body><div class="wrap">
<header class="head">
  <img src="https://static1.squarespace.com/static/68d6b7d6d21f02432fd7397b/t/690209b3567af44aabfbdaca/1761741235124/LivingWordBibles01.png" alt="Living Word Bibles">
  <div class="title">The Holy Bible — Lexham English Bible (LEB)</div>
</header>`;

const FOOT = `
<footer class="footer">
  Scripture quotations marked <span>LEB</span> are from the
  <a href="https://lexhamenglishbible.com" target="_blank" rel="noopener">Lexham English Bible</a>.
  Copyright © Lexham Press / Logos Bible Software (as indicated).
  In electronic use, link “LEB”/“Lexham English Bible” to the LEB site, and
  <a href="https://www.logos.com" target="_blank" rel="noopener">Logos Bible Software</a> accordingly.
</footer>
</div></body></html>`;

// ---- build canon index (prev/next across entire Bible)
const canon = []; // {bookI, chapI, verseI, book, chap, verse, path}
for (let bi=0; bi<LEB.books.length; bi++) {
  const B = LEB.books[bi];
  for (let ci=0; ci<B.chapters.length; ci++) {
    const C = B.chapters[ci];
    for (let vi=0; vi<C.length; vi++) {
      const book = B.name;
      const chap = ci+1;
      const verse = vi+1;
      const p = `/${slug(B.name)}/${chap}/${verse}/`;
      canon.push({ bookI:bi, chapI:ci, verseI:vi, book, chap, verse, path:p });
    }
  }
}

// ---- page template
function pageHTML(ref, text, prevPath, nextPath) {
  return `${HEAD(`${ref} — LEB Online Bible`)}
<section class="bar">
  <div class="ref"><strong>${ref}</strong></div>
  <div class="actions">
    <form action="/" method="get" onsubmit="event.preventDefault();var v=document.getElementById('jump').value.trim();if(v){window.location.href='/'+'#ref='+encodeURIComponent(v);window.location.reload();}">
      <input id="jump" class="input" placeholder="Go to (e.g., John 3:16)">
      <button class="btn">Go</button>
    </form>
    ${prevPath?`<a class="btn" href="${prevPath}" rel="prev" title="Previous verse">←</a>`:""}
    ${nextPath?`<a class="btn" href="${nextPath}" rel="next" title="Next verse">→</a>`:""}
    <button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${ref}\\n\\n'+document.getElementById('v').innerText+'\\n\\n(LEB — Lexham English Bible) https://lexhamenglishbible.com')">Copy</button>
    <button class="btn" onclick="(navigator.share?navigator.share({title:'${ref} — LEB',text:'${ref}',url:location.href}):window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank','noopener'))">Share</button>
  </div>
</section>
<main class="content" id="v">${text}</main>
${FOOT}`;
}

// ---- write every verse page
for (let i=0;i<canon.length;i++){
  const cur = canon[i];
  const prev = canon[i-1];
  const next = canon[i+1];
  const B = LEB.books[cur.bookI];
  const text = (B.chapters[cur.chapI][cur.verseI] || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const ref = `${cur.book} ${cur.chap}:${cur.verse}`;
  write(path.join(DIST, cur.path, "index.html"), pageHTML(ref, text, prev?.path || "", next?.path || ""));
}

// ---- index.html (redirect to John 1:1 and hash jump support)
const indexHTML = `${HEAD("LEB Online Bible — Living Word Bibles")}
<p style="margin:0 0 12px">Welcome to the LEB Online Bible.</p>
<script>
  (function(){
    const h=(location.hash||"").replace(/^#ref=/,"");
    if(h){ location.replace("/"+h.toLowerCase().replace(/\\s+/g,"-").replace(/[^a-z0-9%-]+/g,"-").replace(/(^-|-$)/g,"")+"/"); }
    else{ location.replace("/john/1/1/"); }
  })();
</script>
<noscript><p>Please enable JavaScript, or visit <a href="/john/1/1/">John 1:1</a>.</p></noscript>
${FOOT}`;
write(path.join(DIST, "index.html"), indexHTML);

// ---- 404.html (GH Pages fallback)
write(path.join(DIST, "404.html"), indexHTML);

// ---- robots & license drop
write(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n`);
write(path.join(DIST, "LICENSE-LEB.txt"), `Lexham English Bible (LEB) — License Snapshot
- You can give away the Lexham English Bible, but you can't sell it on its own.
- If the LEB comprises less than 25% of a larger work, you may sell that work.
- If you give away the LEB for use with a commercial product, or sell a work containing more than 1,000 verses, you must annually report units sold/distributed/downloaded.
- Always attribute the LEB and, for electronic use, link “LEB”/“Lexham English Bible” to https://lexhamenglishbible.com and “Logos Bible Software” to https://www.logos.com
(Consult Lexham Press for the current official text.)
`);

console.log("[LEB static] Build complete ✓  dist/ with verse pages.");
