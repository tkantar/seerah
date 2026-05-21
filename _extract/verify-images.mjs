import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "slides.json"), "utf8"));
const publicDir = join(__dirname, "..", "public");

const missing = new Set();
for (const p of data.pages) {
  for (const s of p.sections) {
    for (const img of s.images) {
      const full = join(publicDir, img);
      if (!existsSync(full)) missing.add(img);
    }
  }
}

if (missing.size === 0) console.log("All referenced images exist in public/.");
else {
  console.log(`Missing ${missing.size} image(s):`);
  for (const m of missing) console.log("  " + m);
}
