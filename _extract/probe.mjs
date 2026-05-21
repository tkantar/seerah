// Probe a few pages to verify the new block structure.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "slides.json"), "utf8"));

// Pages with table (was originally slide 89, 271)
const tablePages = data.pages.filter((p) =>
  p.sections.some((s) => s.blocks.some((b) => b.type === "table"))
);
console.log(`Pages with tables: ${tablePages.length}`);
for (const p of tablePages.slice(0, 2)) {
  console.log(`\n# ${p.title} (page ${p.index})`);
  for (const s of p.sections) {
    for (const b of s.blocks) {
      if (b.type === "table") {
        console.log(`  TABLE (${b.rows.length}×${b.rows[0]?.length || 0})`);
        for (const row of b.rows) console.log(`    | ${row.join(" | ")}`);
      }
    }
  }
}

// One bullet-heavy page
const aqabaPage = data.pages.find((p) => p.title.toLowerCase().includes("erster treueschwur"));
if (aqabaPage) {
  console.log(`\n# ${aqabaPage.title}`);
  for (const s of aqabaPage.sections) {
    console.log(`  -- section slide ${s.slideIndex}, subtitle="${s.subtitle}"`);
    for (const b of s.blocks) {
      if (b.type === "paragraph") {
        const t = b.runs.map((r) => r.text).join("");
        console.log(`    P[lvl=${b.level}${b.isArabic ? " AR" : ""}]: ${t.slice(0, 70)}${t.length > 70 ? "…" : ""}`);
      } else if (b.type === "bullet") {
        const t = b.runs.map((r) => r.text).join("");
        console.log(`    B[lvl=${b.level}${b.isArabic ? " AR" : ""}]: ${t.slice(0, 70)}${t.length > 70 ? "…" : ""}`);
      } else if (b.type === "table") {
        console.log(`    TABLE ${b.rows.length}×${b.rows[0]?.length || 0}`);
      }
    }
  }
}
