// Build the final dataset that the React app consumes.
// Reads:
//   - _extract/slides.json (structured shapes per slide, from extract.mjs)
//   - _extract/unpacked/ppt/slides/_rels/*.xml.rels (image references)
// Writes:
//   - src/data/slides.json with { chapters, pages }.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const slidesRaw = JSON.parse(readFileSync(join(__dirname, "slides.json"), "utf8"));
const relsDir = join(__dirname, "unpacked", "ppt", "slides", "_rels");

// Chapter definitions: { title, slug, startSlide }. End slide = next chapter's start - 1.
const chapters = [
  { title: "Einführung",                       slug: "einfuehrung",        startSlide: 1   },
  { title: "Warum Seerah?",                    slug: "warum-seerah",       startSlide: 3   },
  { title: "Quellen der Seerah",               slug: "quellen",            startSlide: 8   },
  { title: "Namen & Besonderheiten",           slug: "namen-khasaais",     startSlide: 10  },
  { title: "Abstammung & Welt vor dem Islam",  slug: "welt-vor-islam",     startSlide: 16  },
  { title: "Abdulmuttalib & Vorgeschichte",    slug: "abdulmuttalib",      startSlide: 22  },
  { title: "Geburt & Kindheit",                slug: "geburt-kindheit",    startSlide: 30  },
  { title: "Jugend des Propheten",             slug: "jugend",             startSlide: 40  },
  { title: "Ehe mit Khadija & Kaaba",          slug: "khadija-kaaba",      startSlide: 47  },
  { title: "Aussehen & Charakter (Shamail)",   slug: "shamail",            startSlide: 62  },
  { title: "Rückzug & erste Offenbarung",      slug: "erste-offenbarung",  startSlide: 68  },
  { title: "Die ersten Muslime",               slug: "erste-muslime",      startSlide: 93  },
  { title: "Stufen der Da‘wa",                 slug: "dawa-stufen",        startSlide: 103 },
  { title: "Öffentliche Da‘wa",                slug: "oeffentliche-dawa",  startSlide: 106 },
  { title: "Widerstand der Quraisch",          slug: "widerstand-quraisch",startSlide: 119 },
  { title: "Walid bin Mughira & Strategien",   slug: "walid-mughira",      startSlide: 129 },
  { title: "Kompromissversuche",               slug: "kompromisse",        startSlide: 141 },
  { title: "Unterdrückung der Sahaba",         slug: "unterdrueckung",     startSlide: 161 },
  { title: "Angriffe auf den Propheten",       slug: "angriffe-prophet",   startSlide: 177 },
  { title: "Hijra nach Abessinien",            slug: "abessinien",         startSlide: 189 },
  { title: "Hamzah & Umar nehmen Islam an",    slug: "hamzah-umar",        startSlide: 215 },
  { title: "Boykott der Banu Hashim",          slug: "boykott",            startSlide: 230 },
  { title: "Jahr der Trauer",                  slug: "jahr-der-trauer",    startSlide: 237 },
  { title: "Reise nach Taif",                  slug: "taif",               startSlide: 244 },
  { title: "Isra & Mi‘raj",                    slug: "isra-miraj",         startSlide: 261 },
  { title: "Nach Mi‘raj – Suche nach Helfern", slug: "nach-miraj",         startSlide: 310 },
  { title: "Yathrib & Aqaba",                  slug: "aqaba-yathrib",      startSlide: 320 },
  { title: "Die Hijra nach Madina",            slug: "hijra-madina",       startSlide: 353 },
  { title: "Auswanderung des Propheten",       slug: "auswanderung-prophet",startSlide: 370 },
  { title: "Ankunft in Quba",                  slug: "ankunft-quba",       startSlide: 389 },
  { title: "Einzug in Madina",                 slug: "einzug-madina",      startSlide: 408 },
];

// Build slide -> image mapping from the .rels files.
const slideImages = {};
for (const file of readdirSync(relsDir)) {
  const m = /^slide(\d+)\.xml\.rels$/.exec(file);
  if (!m) continue;
  const idx = parseInt(m[1], 10);
  const xml = readFileSync(join(relsDir, file), "utf8");
  const imgs = [...xml.matchAll(/media\/(image[0-9]+\.[a-z]+)/g)].map((x) => `images/${x[1]}`);
  if (imgs.length > 0) slideImages[idx] = [...new Set(imgs)];
}

// ── Convert a shape's paragraphs to a flat block list ─────────────────────

const ARABIC_RE = /[؀-ۿ]/g;

function paragraphText(p) {
  return p.runs.map((r) => r.text).join("");
}

function isArabicParagraph(p) {
  const text = paragraphText(p);
  if (!text.trim()) return false;
  const arabicChars = (text.match(ARABIC_RE) || []).length;
  return arabicChars > 0 && arabicChars / text.length > 0.4;
}

// Strip the deprecated `size` field from runs (we don't use it for rendering).
function cleanRuns(runs) {
  return runs.map((r) => {
    const out = { text: r.text };
    if (r.bold) out.bold = true;
    if (r.italic) out.italic = true;
    if (r.lineBreak) out.lineBreak = true;
    return out;
  });
}

function paragraphToBlock(p) {
  // Empty paragraph → skip upstream.
  const isArabic = isArabicParagraph(p);
  // Bullet vs paragraph:
  //   - level 0 with default bullet  → paragraph (top-level slide content)
  //   - level ≥ 1 with default bullet → bullet item at that level
  //   - bullet "none"                  → always a plain paragraph
  const isBullet = p.bullet !== "none" && p.level >= 1;
  return {
    type: isBullet ? "bullet" : "paragraph",
    level: p.level,
    isArabic,
    runs: cleanRuns(p.runs),
  };
}

function tableToBlock(rows) {
  // Convert each cell's paragraphs to plain text (table cells rarely have
  // multi-paragraph rich content in this deck; this keeps the data model
  // small for the renderer).
  const cleanRows = rows.map((row) =>
    row.map((cell) => {
      const lines = cell.paragraphs.map(paragraphText).filter((s) => s.trim().length > 0);
      return lines.join("\n");
    })
  );
  return { type: "table", rows: cleanRows };
}

function shapeToBlocks(shape) {
  if (shape.type === "table") return [tableToBlock(shape.rows)];
  const out = [];
  for (const p of shape.paragraphs) {
    if (!paragraphText(p).trim()) continue;
    out.push(paragraphToBlock(p));
  }
  return out;
}

// ── Step 1: build slide records with title + body blocks ───────────────────

function chapterFor(slideIndex) {
  let current = chapters[0];
  for (const c of chapters) {
    if (slideIndex >= c.startSlide) current = c;
  }
  return current.slug;
}

const slides = slidesRaw.map((s) => {
  // The title is the concatenation of all paragraphs in the title shape.
  // Body is everything else, in document order.
  let title = "";
  const bodyBlocks = [];
  let consumedTitle = false;

  for (const shape of s.shapes) {
    if (shape.type === "text" && shape.isTitle && !consumedTitle) {
      title = shape.paragraphs.map(paragraphText).join(" ").trim();
      consumedTitle = true;
      continue;
    }
    for (const b of shapeToBlocks(shape)) bodyBlocks.push(b);
  }

  // Fall back: first paragraph block as title if no title shape was found.
  if (!title) {
    const idx = bodyBlocks.findIndex((b) => b.type === "paragraph" && b.runs.length > 0);
    if (idx >= 0) {
      title = bodyBlocks[idx].runs.map((r) => r.text).join("");
      bodyBlocks.splice(idx, 1);
    } else {
      title = `Folie ${s.index}`;
    }
  }

  return {
    index: s.index,
    title,
    blocks: bodyBlocks,
    images: slideImages[s.index] || [],
    chapter: chapterFor(s.index),
  };
});

// ── Step 2: parse each title into { base, seq, subtitle } ──────────────────

function parseTitle(title) {
  let m = /^(.*?)\s*\((\d+)\)\s*[–\-]\s*(.+)$/.exec(title);
  if (m) return { base: m[1].trim(), seq: +m[2], subtitle: m[3].trim() };
  m = /^(.*?)\s*\((\d+)\)\s+(.+)$/.exec(title);
  if (m) return { base: m[1].trim(), seq: +m[2], subtitle: m[3].trim() };
  m = /^(.*?)\s*\((\d+)\)(.*)$/.exec(title);
  if (m) return { base: m[1].trim(), seq: +m[2], subtitle: m[3].trim() };
  return { base: title.trim(), seq: null, subtitle: "" };
}

function normalizeBase(base) {
  return base
    .replace(/\s*\(?\b(r\.?a\.?|s\.?a\.?w\.?|a\.?s\.?|saws?|ra|as)\)?\.?$/i, "")
    .trim();
}

const parsed = slides.map((s) => ({ slide: s, ...parseTitle(s.title) }));

// ── Step 3: merge consecutive slides with same base + chapter into pages ───

function startNewPage(p) {
  return {
    base: p.base,
    chapter: p.slide.chapter,
    sections: [
      {
        slideIndex: p.slide.index,
        subtitle: p.subtitle,
        blocks: p.slide.blocks,
        images: p.slide.images,
      },
    ],
  };
}

function pushSection(page, p) {
  page.sections.push({
    slideIndex: p.slide.index,
    subtitle: p.subtitle,
    blocks: p.slide.blocks,
    images: p.slide.images,
  });
}

const pagesRaw = [];
for (const p of parsed) {
  const cur = pagesRaw[pagesRaw.length - 1];
  if (
    cur &&
    cur.chapter === p.slide.chapter &&
    p.base.length > 0 &&
    normalizeBase(cur.base) === normalizeBase(p.base)
  ) {
    pushSection(cur, p);
  } else {
    pagesRaw.push(startNewPage(p));
  }
}

// ── Step 4: second-pass prefix merge (handles "Geschichten vom Miraj…") ────

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

function refinePrefix(cp, a, b) {
  if (!cp) return "";
  if (cp.length === a.length || cp.length === b.length) return cp.trim();
  const endsInLetter = /\w$/.test(cp);
  const nextA = a.charAt(cp.length);
  const nextB = b.charAt(cp.length);
  const cutsMidWord = endsInLetter && /\w/.test(nextA) && /\w/.test(nextB);
  if (!cutsMidWord) return cp.trim();
  const lastSpace = cp.lastIndexOf(" ");
  if (lastSpace < 0) return "";
  const trailingWordLen = cp.length - lastSpace - 1;
  if (trailingWordLen >= 4) return cp.trim();
  return cp.slice(0, lastSpace).trimEnd();
}

const pages = [];
let i = 0;
while (i < pagesRaw.length) {
  const p = pagesRaw[i];
  let j = i;
  let sharedPrefix = p.base;
  while (
    j + 1 < pagesRaw.length &&
    pagesRaw[j + 1].chapter === p.chapter &&
    pagesRaw[j + 1].sections.length === 1 &&
    p.sections.length === 1
  ) {
    const next = pagesRaw[j + 1];
    const cp = refinePrefix(commonPrefix(sharedPrefix, next.base), sharedPrefix, next.base);
    const wordCount = cp.split(/\s+/).filter(Boolean).length;
    if (cp.length >= 14 && wordCount >= 3) {
      sharedPrefix = cp;
      j++;
    } else break;
  }

  if (j > i) {
    const merged = { base: sharedPrefix, chapter: p.chapter, sections: [] };
    for (let k = i; k <= j; k++) {
      const orig = pagesRaw[k];
      const onlySection = orig.sections[0];
      let leftover = orig.base.slice(sharedPrefix.length).trim();
      leftover = leftover.replace(/^[\s\-–:·•]+/, "").trim();
      merged.sections.push({
        slideIndex: onlySection.slideIndex,
        subtitle: leftover || onlySection.subtitle,
        blocks: onlySection.blocks,
        images: onlySection.images,
      });
    }
    pages.push(merged);
    i = j + 1;
  } else {
    pages.push(p);
    i++;
  }
}

// ── Step 5: finalize pages ─────────────────────────────────────────────────

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const slugCounts = new Map();
const pagesOut = pages.map((p, idx) => {
  const baseSlug = slugify(p.base) || `page-${idx + 1}`;
  const n = (slugCounts.get(baseSlug) || 0) + 1;
  slugCounts.set(baseSlug, n);
  const slug = n === 1 ? baseSlug : `${baseSlug}-${n}`;
  return {
    index: idx + 1,
    title: p.base,
    slug,
    chapter: p.chapter,
    sections: p.sections,
    firstSlide: p.sections[0].slideIndex,
    lastSlide: p.sections[p.sections.length - 1].slideIndex,
  };
});

const chaptersOut = chapters.map((c, i) => {
  const next = chapters[i + 1];
  const endSlide = next ? next.startSlide - 1 : slides[slides.length - 1].index;
  const chapterPages = pagesOut.filter((p) => p.chapter === c.slug);
  return {
    slug: c.slug,
    title: c.title,
    startSlide: c.startSlide,
    endSlide,
    startPage: chapterPages.length ? chapterPages[0].index : null,
    endPage: chapterPages.length ? chapterPages[chapterPages.length - 1].index : null,
    pageCount: chapterPages.length,
    slideCount: endSlide - c.startSlide + 1,
  };
});

const dataDir = join(root, "src", "data");
mkdirSync(dataDir, { recursive: true });
const payload = { chapters: chaptersOut, pages: pagesOut };
writeFileSync(join(dataDir, "slides.json"), JSON.stringify(payload), "utf8");
console.log(
  `wrote src/data/slides.json: ${pagesOut.length} pages from ${slides.length} slides, ${chaptersOut.length} chapters`
);
