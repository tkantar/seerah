// Build the final slide dataset that the React app consumes.
// Reads:
//   - _extract/slides.json (text per slide, from extract.mjs)
//   - _extract/unpacked/ppt/slides/_rels/*.xml.rels (image references)
// Writes:
//   - src/data/slides.json
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const slidesText = JSON.parse(readFileSync(join(__dirname, "slides.json"), "utf8"));
const relsDir = join(__dirname, "unpacked", "ppt", "slides", "_rels");

// Chapter definitions: { title, slug, startSlide }. End slide = next chapter's start - 1.
const chapters = [
  { title: "Einführung",                     slug: "einfuehrung",        startSlide: 1 },
  { title: "Warum Seerah?",                  slug: "warum-seerah",       startSlide: 3 },
  { title: "Quellen der Seerah",             slug: "quellen",            startSlide: 8 },
  { title: "Namen & Besonderheiten",         slug: "namen-khasaais",     startSlide: 10 },
  { title: "Abstammung & Welt vor dem Islam",slug: "welt-vor-islam",     startSlide: 16 },
  { title: "Abdulmuttalib & Vorgeschichte",  slug: "abdulmuttalib",      startSlide: 22 },
  { title: "Geburt & Kindheit",              slug: "geburt-kindheit",    startSlide: 30 },
  { title: "Jugend des Propheten",           slug: "jugend",             startSlide: 40 },
  { title: "Ehe mit Khadija & Kaaba",        slug: "khadija-kaaba",      startSlide: 47 },
  { title: "Aussehen & Charakter (Shamail)", slug: "shamail",            startSlide: 62 },
  { title: "Rückzug & erste Offenbarung",    slug: "erste-offenbarung",  startSlide: 68 },
  { title: "Die ersten Muslime",             slug: "erste-muslime",      startSlide: 93 },
  { title: "Stufen der Da‘wa",               slug: "dawa-stufen",        startSlide: 103 },
  { title: "Öffentliche Da‘wa",              slug: "oeffentliche-dawa",  startSlide: 106 },
  { title: "Widerstand der Quraisch",        slug: "widerstand-quraisch",startSlide: 119 },
  { title: "Walid bin Mughira & Strategien", slug: "walid-mughira",      startSlide: 129 },
  { title: "Kompromissversuche",             slug: "kompromisse",        startSlide: 141 },
  { title: "Unterdrückung der Sahaba",       slug: "unterdrueckung",     startSlide: 161 },
  { title: "Angriffe auf den Propheten",     slug: "angriffe-prophet",   startSlide: 177 },
  { title: "Hijra nach Abessinien",          slug: "abessinien",         startSlide: 189 },
  { title: "Hamzah & Umar nehmen Islam an",  slug: "hamzah-umar",        startSlide: 215 },
  { title: "Boykott der Banu Hashim",        slug: "boykott",            startSlide: 230 },
  { title: "Jahr der Trauer",                slug: "jahr-der-trauer",    startSlide: 237 },
  { title: "Reise nach Taif",                slug: "taif",               startSlide: 244 },
  { title: "Isra & Mi‘raj",                  slug: "isra-miraj",         startSlide: 261 },
];

// Build slide -> image mapping from the .rels files.
const slideImages = {}; // slideIndex -> ["images/imageN.ext", ...]
for (const file of readdirSync(relsDir)) {
  const m = /^slide(\d+)\.xml\.rels$/.exec(file);
  if (!m) continue;
  const idx = parseInt(m[1], 10);
  const xml = readFileSync(join(relsDir, file), "utf8");
  const imgs = [...xml.matchAll(/media\/(image[0-9]+\.[a-z]+)/g)].map((x) => `images/${x[1]}`);
  if (imgs.length > 0) slideImages[idx] = [...new Set(imgs)];
}

// Compose final slide structure: { index, title, body: [{type, text, bold, isArabic}], images, chapterSlug }
function classifyParagraph(runs) {
  const text = runs.map((r) => r.text).join("");
  // arabic block detected if >= 40% chars in arabic range
  const arabicChars = (text.match(/[؀-ۿ]/g) || []).length;
  const isArabic = arabicChars > 0 && arabicChars / text.length > 0.4;
  return { runs, text, isArabic };
}

// Find which chapter a slide belongs to
function chapterFor(slideIndex) {
  let current = chapters[0];
  for (const c of chapters) {
    if (slideIndex >= c.startSlide) current = c;
  }
  return current.slug;
}

const slides = slidesText.map((s) => {
  const paragraphs = s.paragraphs.map(classifyParagraph).filter((p) => p.text.trim());
  // First non-empty paragraph is title; rest is body.
  const [first, ...rest] = paragraphs;
  const title = first ? first.text.trim() : `Folie ${s.index}`;
  const body = rest.map((p) => ({
    text: p.text,
    runs: p.runs,
    isArabic: p.isArabic,
  }));
  return {
    index: s.index,
    title,
    body,
    images: slideImages[s.index] || [],
    chapter: chapterFor(s.index),
  };
});

// Build chapters with their slide ranges
const chaptersOut = chapters.map((c, i) => {
  const end = i + 1 < chapters.length ? chapters[i + 1].startSlide - 1 : slides[slides.length - 1].index;
  return {
    slug: c.slug,
    title: c.title,
    startSlide: c.startSlide,
    endSlide: end,
    slideCount: end - c.startSlide + 1,
  };
});

const dataDir = join(root, "src", "data");
mkdirSync(dataDir, { recursive: true });
const payload = { chapters: chaptersOut, slides };
writeFileSync(join(dataDir, "slides.json"), JSON.stringify(payload), "utf8");
console.log(`wrote src/data/slides.json: ${slides.length} slides, ${chaptersOut.length} chapters`);
