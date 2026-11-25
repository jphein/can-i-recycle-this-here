// Tiny zero-dependency server: serves web/ and data/rules.json, and proxies the photo to a vision
// model so the API key never reaches the browser. The model only NAMES the item; web/lookup.js
// decides the verdict from the cited rules table.
//
// Env (read from the process only; never written to a file):
//   PORT                 default 8787
//   VISION_BASE_URL      OpenAI-compatible API base, default https://api.tokenfactory.nebius.com/v1
//   VISION_MODEL         image-capable model id, default Qwen/Qwen3.8-27B (see scripts/vision-preflight.mjs)
//   VISION_API_KEY       key; without it /api/identify answers 503 and the app uses typed input
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const WEB = join(ROOT, "web");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };
const MAX_BODY = 4 * 1024 * 1024;

const PROMPT = `Name the single main object in this photo the way a person would say it when asking how to throw it away (e.g. "pizza box", "AA battery", "paint can", "plastic water bottle"). Reply with JSON only: {"guesses":[{"label":"...","material":"...","confidence":0.0}]} with up to 3 guesses, most likely first. Do not say where it goes.`;

export function parseGuesses(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const g = JSON.parse(m[0]).guesses;
    if (!Array.isArray(g)) return [];
    return g
      .filter((x) => x && typeof x.label === "string" && x.label.trim())
      .slice(0, 3)
      .map((x) => ({ label: x.label.trim().slice(0, 80), material: String(x.material || "").slice(0, 40), confidence: Math.max(0, Math.min(1, Number(x.confidence) || 0)) }));
  } catch {
    return [];
  }
}

export async function identify(image, env = process.env) {
  const VISION_API_KEY = env.VISION_API_KEY;
  const base = (env.VISION_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/+$/, "");
  const VISION_MODEL = env.VISION_MODEL || "Qwen/Qwen3.8-27B";
  if (!VISION_API_KEY) return { status: 503, body: { error: "vision not configured" } };
  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return { status: 400, body: { error: "expected a data:image URL" } };
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VISION_API_KEY}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 200,
      temperature: 0,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: image } }] }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) return { status: 502, body: { error: `vision upstream ${r.status}` } };
  const j = await r.json();
  return { status: 200, body: { guesses: parseGuesses(j?.choices?.[0]?.message?.content) } };
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

export const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "POST" && url.pathname === "/api/identify") {
      let size = 0;
      const chunks = [];
      for await (const c of req) {
        size += c.length;
        if (size > MAX_BODY) return send(res, 413, { error: "photo too large" });
        chunks.push(c);
      }
      let image;
      try { image = JSON.parse(Buffer.concat(chunks).toString("utf8")).image; } catch { return send(res, 400, { error: "bad json" }); }
      const out = await identify(image); // the photo is forwarded, never stored or logged
      return send(res, out.status, out.body);
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "method" });
    if (url.pathname === "/rules.json") return send(res, 200, await readFile(join(ROOT, "data/rules.json")), TYPES[".json"]);
    const rel = normalize(decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(WEB, rel);
    if (!file.startsWith(WEB + "/")) return send(res, 404, { error: "not found" });
    const type = TYPES[extname(file)];
    if (!type) return send(res, 404, { error: "not found" });
    return send(res, 200, await readFile(file), type);
  } catch (e) {
    return send(res, e && e.code === "ENOENT" ? 404 : 500, { error: e && e.code === "ENOENT" ? "not found" : "server error" });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787;
  server.listen(port, () => console.log(`can-i-recycle-this-here on http://localhost:${port} (vision ${process.env.VISION_API_KEY ? "on" : "off"})`));
}
