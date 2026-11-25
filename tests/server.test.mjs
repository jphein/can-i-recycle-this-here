import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { server, parseGuesses, identify } from "../server.mjs";

delete process.env.VISION_API_KEY;
delete process.env.VISION_BASE_URL;

test("the vision request is OpenAI-shaped and carries the key only as a Bearer header", async () => {
  let seen = null;
  const fake = createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(body) };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: '{"guesses":[{"label":"AA battery","material":"battery","confidence":0.88}]}' } }] }));
  });
  await new Promise((r) => fake.listen(0, "127.0.0.1", r));
  try {
    const env = { VISION_API_KEY: "test-key-not-real", VISION_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1/`, VISION_MODEL: "some/vision-model" };
    const img = "data:image/jpeg;base64,AAAA";
    const out = await identify(img, env);
    assert.equal(out.status, 200);
    assert.deepEqual(out.body.guesses, [{ label: "AA battery", material: "battery", confidence: 0.88 }]);
    assert.equal(seen.url, "/v1/chat/completions");
    assert.equal(seen.auth, "Bearer test-key-not-real");
    assert.equal(seen.body.model, "some/vision-model");
    assert.equal(seen.body.messages[0].content.find((p) => p.type === "image_url").image_url.url, img);
    assert.ok(!JSON.stringify(seen.body).includes("test-key-not-real"), "key never in the body");
    assert.equal((await identify("http://example.com/x.jpg", env)).status, 400);
  } finally {
    fake.close();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

test("serves the page, the module, the favicon and the rules", async () => {
  for (const [path, type] of [["/", "text/html"], ["/app.js", "text/javascript"], ["/lookup.js", "text/javascript"], ["/style.css", "text/css"], ["/favicon.svg", "image/svg+xml"], ["/rules.json", "application/json"]]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200, path);
    assert.ok(r.headers.get("content-type").startsWith(type), path);
  }
  const rules = await (await fetch(base + "/rules.json")).json();
  assert.ok(rules.rules.length > 30);
});

test("no path escapes web/", async () => {
  for (const path of ["/../server.mjs", "/..%2Fserver.mjs", "/%2e%2e/package.json", "/../data/rules.json", "/nope.html"]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 404, path);
  }
});

test("without a key the vision endpoint answers 503 so the page falls back to typing", async () => {
  const r = await fetch(base + "/api/identify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: "data:image/jpeg;base64,AAAA" }) });
  assert.equal(r.status, 503);
  assert.equal((await fetch(base + "/api/identify", { method: "POST", body: "not json" })).status, 400);
});

test("model text is parsed to at most three clean guesses, never a verdict", () => {
  assert.deepEqual(parseGuesses('```json\n{"guesses":[{"label":" pizza box ","material":"cardboard","confidence":0.9}]}\n```'), [{ label: "pizza box", material: "cardboard", confidence: 0.9 }]);
  assert.deepEqual(parseGuesses("I think it is a box"), []);
  assert.deepEqual(parseGuesses('{"guesses":"x"}'), []);
  assert.equal(parseGuesses('{"guesses":[{"label":"a","confidence":7},{"label":""},{"label":"b"},{"label":"c"},{"label":"d"}]}').length, 3);
  assert.equal(parseGuesses('{"guesses":[{"label":"a","confidence":7}]}')[0].confidence, 1);
});
