// Extract text per slide using regex on the slide XML
// (no DOM parser needed — schemas in pptx slide XML are regular enough for this).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const slidesDir = join(__dirname, "unpacked", "ppt", "slides");
const outPath = join(__dirname, "slides.json");

const files = readdirSync(slidesDir)
  .filter((f) => /^slide\d+\.xml$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseSlide(xml) {
  const paragraphs = [];
  // each <a:p> ... </a:p> block is a paragraph
  const pRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let m;
  while ((m = pRe.exec(xml)) !== null) {
    const pInner = m[1];
    const runs = [];
    // Walk through runs <a:r> ... </a:r> AND breaks <a:br/>
    const tokenRe = /<a:r\b[^>]*>([\s\S]*?)<\/a:r>|<a:br\s*\/>/g;
    let t;
    while ((t = tokenRe.exec(pInner)) !== null) {
      if (t[0].startsWith("<a:br")) {
        runs.push({ text: "\n", bold: false, size: null });
        continue;
      }
      const rInner = t[1];
      const rPrMatch = /<a:rPr\b([^>]*)\/?>/.exec(rInner);
      let bold = false;
      let size = null;
      if (rPrMatch) {
        const attrs = rPrMatch[1];
        if (/\bb="1"/.test(attrs)) bold = true;
        const szM = /\bsz="(\d+)"/.exec(attrs);
        if (szM) size = parseInt(szM[1], 10);
      }
      const textRe = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g;
      let textMatch;
      let combined = "";
      while ((textMatch = textRe.exec(rInner)) !== null) {
        combined += decodeXmlEntities(textMatch[1]);
      }
      if (combined.length > 0) runs.push({ text: combined, bold, size });
    }
    if (runs.length > 0) paragraphs.push(runs);
  }
  return paragraphs;
}

const out = [];
for (const fn of files) {
  const n = parseInt(fn.match(/\d+/)[0], 10);
  const xml = readFileSync(join(slidesDir, fn), "utf8");
  out.push({ index: n, paragraphs: parseSlide(xml) });
}
writeFileSync(outPath, JSON.stringify(out, null, 1), "utf8");
console.log(`wrote ${outPath} with ${out.length} slides`);
