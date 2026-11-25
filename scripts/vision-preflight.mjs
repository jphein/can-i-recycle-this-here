#!/usr/bin/env node
// Preflight for the vision endpoint: lists the models the key can see and marks the ones that
// accept images. Prints model ids, modalities and prices only; never the key or raw responses.
//   VISION_API_KEY=$(bw get password "<vault item name>") node scripts/vision-preflight.mjs
const base = (process.env.VISION_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/+$/, "");
const key = process.env.VISION_API_KEY;
if (!key) { console.error("VISION_API_KEY is not set"); process.exit(2); }
console.log(`base: ${base}   key length: ${key.length}`);

const r = await fetch(`${base}/models?verbose=true`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
console.log(`GET /models -> ${r.status}`);
if (!r.ok) process.exit(r.status === 401 || r.status === 403 ? 4 : 5);
const data = (await r.json()).data || [];
const scrub = (s) => String(s).split(key).join("[key]");
let vision = 0;
for (const m of data) {
  const arch = m.architecture || {};
  const mod = [arch.modality, ...(arch.input_modalities || [])].filter(Boolean).join(",");
  const looksVision = /image/i.test(mod) || /(^|[-/_])(vl|vision|llava|pixtral)|gemma-3|qwen2\.5-vl/i.test(m.id);
  if (!looksVision) continue;
  vision++;
  const p = m.pricing || {};
  console.log(scrub(`vision  ${m.id}  modality=${mod || "?"}  in=${p.prompt ?? "?"} out=${p.completion ?? "?"} image=${p.image ?? "?"}`));
}
console.log(`${data.length} models, ${vision} that take images`);
