// Show stats about the rich data: how many tables, bullets, bold runs, etc.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "slides.json"), "utf8"));

let paragraphs = 0;
let bullets = 0;
let bulletsByLvl = {};
let tables = 0;
let boldRuns = 0;
let italicRuns = 0;
let linebreaks = 0;
let arabicParas = 0;

for (const p of data.pages) {
  for (const s of p.sections) {
    for (const b of s.blocks) {
      if (b.type === "paragraph") {
        paragraphs++;
        if (b.isArabic) arabicParas++;
        for (const r of b.runs) {
          if (r.bold) boldRuns++;
          if (r.italic) italicRuns++;
          if (r.lineBreak) linebreaks++;
        }
      } else if (b.type === "bullet") {
        bullets++;
        bulletsByLvl[b.level] = (bulletsByLvl[b.level] || 0) + 1;
        for (const r of b.runs) {
          if (r.bold) boldRuns++;
          if (r.italic) italicRuns++;
          if (r.lineBreak) linebreaks++;
        }
      } else if (b.type === "table") {
        tables++;
      }
    }
  }
}

console.log({ paragraphs, bullets, bulletsByLvl, tables, boldRuns, italicRuns, linebreaks, arabicParas });
