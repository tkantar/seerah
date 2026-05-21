// Print page list for inspection.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "slides.json"), "utf8"));

console.log("CHAPTERS:");
for (const c of data.chapters) {
  console.log(`  ${c.slug.padEnd(22)} | pages ${c.startPage}-${c.endPage} (${c.pageCount}) | slides ${c.startSlide}-${c.endSlide} | ${c.title}`);
}

console.log("\nPAGES:");
for (const p of data.pages) {
  const subs = p.sections.length > 1 ? ` [${p.sections.length} sections]` : "";
  console.log(`  ${String(p.index).padStart(3, "0")} | ${p.chapter.padEnd(22)} | ${p.title}${subs}`);
}
