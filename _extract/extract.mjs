// Extract structured content per slide using regex on the slide XML.
// Captures:
//   - shapes in document order (text shapes + tables)
//   - per-paragraph: indentation level, whether it has a bullet
//   - per-run: text, bold, italic, font size, soft line breaks
//   - tables as rows of cells, each cell carrying its own paragraphs
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

function parseRun(rInner) {
  // <a:rPr ...attrs.../> or <a:rPr ...attrs...>...</a:rPr>
  const rPrMatch = /<a:rPr\b([^>]*?)\/>|<a:rPr\b([^>]*?)>/.exec(rInner);
  let bold = false;
  let italic = false;
  let size = null;
  if (rPrMatch) {
    const attrs = rPrMatch[1] || rPrMatch[2] || "";
    if (/\bb="1"/.test(attrs)) bold = true;
    if (/\bi="1"/.test(attrs)) italic = true;
    const szM = /\bsz="(\d+)"/.exec(attrs);
    if (szM) size = parseInt(szM[1], 10);
  }
  let text = "";
  const textRe = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g;
  let tm;
  while ((tm = textRe.exec(rInner)) !== null) text += decodeXmlEntities(tm[1]);
  return { text, bold, italic, size };
}

function parseParagraph(pInner) {
  // Paragraph properties: <a:pPr lvl="N" ...> may be self-closing or have children
  // (e.g. <a:buNone/>, <a:buChar/>, <a:buAutoNum/>).
  let level = 0;
  let bullet = "default"; // "default" | "none"
  const pPrM = /<a:pPr\b([^>]*?)\/>|<a:pPr\b([^>]*)>([\s\S]*?)<\/a:pPr>/.exec(pInner);
  if (pPrM) {
    const attrs = pPrM[1] || pPrM[2] || "";
    const inner = pPrM[3] || "";
    const lvlM = /\blvl="(\d+)"/.exec(attrs);
    if (lvlM) level = parseInt(lvlM[1], 10);
    if (/<a:buNone\b/.test(inner)) bullet = "none";
  }

  // Walk runs (<a:r>) and breaks (<a:br/>) in document order.
  const runs = [];
  const tokenRe = /<a:r\b[^>]*>([\s\S]*?)<\/a:r>|<a:br\b[^>]*\/?>/g;
  let t;
  while ((t = tokenRe.exec(pInner)) !== null) {
    if (t[0].startsWith("<a:br")) {
      runs.push({ text: "", bold: false, italic: false, size: null, lineBreak: true });
      continue;
    }
    const run = parseRun(t[1]);
    if (run.text.length > 0) runs.push({ ...run, lineBreak: false });
  }
  return { level, bullet, runs };
}

function parseParagraphsInside(xml) {
  // Find all <a:p>...</a:p> blocks at any depth. They don't nest in OOXML.
  const out = [];
  const re = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(parseParagraph(m[1]));
  return out;
}

function parseTable(tblXml) {
  const rows = [];
  const trRe = /<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g;
  let trM;
  while ((trM = trRe.exec(tblXml)) !== null) {
    const cells = [];
    const tcRe = /<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g;
    let tcM;
    while ((tcM = tcRe.exec(trM[1])) !== null) {
      cells.push({ paragraphs: parseParagraphsInside(tcM[1]) });
    }
    rows.push(cells);
  }
  return rows;
}

function parseSlide(xml) {
  const shapes = [];
  // Find top-level blocks: <p:sp> (text shape) and <p:graphicFrame> (tables/charts).
  // Neither nests, so non-greedy regex is safe.
  const blockRe = /<p:sp\b[\s\S]*?<\/p:sp>|<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g;
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[0];
    if (block.startsWith("<p:sp")) {
      const isTitle = /<p:ph[^/>]*type="title"/.test(block);
      const paragraphs = parseParagraphsInside(block);
      if (paragraphs.length === 0) continue;
      shapes.push({ type: "text", isTitle, paragraphs });
    } else {
      const tblM = /<a:tbl\b[\s\S]*?<\/a:tbl>/.exec(block);
      if (tblM) shapes.push({ type: "table", rows: parseTable(tblM[0]) });
    }
  }
  return shapes;
}

const out = [];
for (const fn of files) {
  const n = parseInt(fn.match(/\d+/)[0], 10);
  const xml = readFileSync(join(slidesDir, fn), "utf8");
  out.push({ index: n, shapes: parseSlide(xml) });
}
writeFileSync(outPath, JSON.stringify(out, null, 1), "utf8");
console.log(`wrote ${outPath} with ${out.length} slides`);
