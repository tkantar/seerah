// Probe specific page to inspect runs structure (including line breaks).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "slides.json"), "utf8"));

const page = data.pages.find((p) => p.title.toLowerCase().includes("erster treueschwur"));
if (!page) {
  console.log("not found");
  process.exit();
}

// Show full runs for each block in section with slide 331
for (const sec of page.sections) {
  if (sec.slideIndex !== 331) continue;
  console.log(`section slide ${sec.slideIndex}`);
  for (const b of sec.blocks) {
    console.log(`  [${b.type} lvl=${b.level}]`);
    for (const r of b.runs) {
      if (r.lineBreak) console.log("    <br>");
      else console.log(`    "${r.text.slice(0, 60)}${r.text.length > 60 ? "…" : ""}"  bold=${!!r.bold} italic=${!!r.italic}`);
    }
  }
}
