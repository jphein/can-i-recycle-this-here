#!/usr/bin/env node
// The photo test: every image in tests/fixtures/manifest.json goes through the real vision call
// and then the rules lookup; prints hit/miss per photo. Spends model tokens, so it never runs in
// `npm test`. Prints labels and rule ids only; never the key.
//   VISION_API_KEY=$(bw get password "<vault item name>") node scripts/photo-test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { identify } from "../server.mjs";
import { buildIndex, lookupGuesses } from "../web/lookup.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.VISION_API_KEY) { console.error("VISION_API_KEY is not set; nothing was called."); process.exit(2); }
const index = buildIndex(JSON.parse(readFileSync(join(root, "data/rules.json"), "utf8")));
const manifest = JSON.parse(readFileSync(join(root, "tests/fixtures/manifest.json"), "utf8"));

let hits = 0;
for (const f of manifest) {
  const b64 = readFileSync(join(root, "tests/fixtures", f.file)).toString("base64");
  const out = await identify(`data:image/jpeg;base64,${b64}`);
  if (out.status !== 200) { console.log(`ERROR ${f.file}: ${out.status} ${out.body.error}`); continue; }
  const r = lookupGuesses(index, out.body.guesses);
  const got = r.found ? r.rule.id : "ask";
  const ok = got === f.expect;
  hits += ok ? 1 : 0;
  const labels = out.body.guesses.map((g) => `${g.label} (${g.confidence})`).join("; ");
  console.log(`${ok ? "HIT " : "MISS"} ${f.file}: expected ${f.expect}, got ${got} | model said: ${labels || "nothing"}`);
}
console.log(`${hits}/${manifest.length} photos answered from the expected cited rule`);
