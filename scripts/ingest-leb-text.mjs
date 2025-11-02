// scripts/ingest-leb-text.mjs
// Usage: node scripts/ingest-leb-text.mjs data/leb.txt data/leb.json
import fs from "fs";
import path from "path";

// Expected input format (one per line):
// Genesis 1:1<TAB>In the beginning God created...
// Genesis 1:2<TAB>Now the earth was...
// ...
const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node scripts/ingest-leb-text.mjs data/leb.txt data/leb.json");
  process.exit(1);
}

const CANON = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Songs",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah",
  "Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
  "2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

const bookIndex = Object.fromEntries(CANON.map((b,i)=>[b,i]));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const books = CANON.map(name => ({ name, abbr: name, slug: slug(name), chapters: [] }));

const raw = fs.readFileSync(inPath,"utf8").split(/\r?\n/);
for (const line of raw) {
  if (!line.trim()) continue;
  const [ref, textRaw] = line.split("\t");
  if (!ref || !textRaw) continue;
  const m = ref.match(/^(\d?\s?[A-Za-z .]+)\s+(\d+):(\d+)$/);
  if (!m) { console.error("Skip bad ref:", ref); continue; }
  const book = m[1].replace(/\s+/g," ").trim();
  const chap = +m[2], verse = +m[3];
  const bi = bookIndex[book];
  if (bi == null) { console.error("Unknown book:", book); continue; }
  const text = textRaw.trim();
  const B = books[bi];
  while (B.chapters.length < chap) B.chapters.push([]);
  const C = B.chapters[chap-1];
  while (C.length < verse) C.push("");
  C[verse-1] = text;
}

const out = {
  translation: "LEB",
  source: "Lexham Press",
  license: {
    short: "Free to distribute with attribution; annual reporting if used with a commercial product or >1,000 verses.",
    links: {
      leb: "https://lexhamenglishbible.com",
      logos: "https://www.logos.com"
    }
  },
  books
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.log("Wrote", outPath);
