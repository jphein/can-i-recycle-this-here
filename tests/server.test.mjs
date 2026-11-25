import { test, after } from "node:test";
import assert from "node:assert/strict";
import { server, parseGuesses } from "../server.mjs";

delete process.env.VISION_API_KEY;
delete process.env.VISION_ENDPOINT;
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
