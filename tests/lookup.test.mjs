import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildIndex, lookup, lookupGuesses, tokens, verdictText } from "../web/lookup.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = JSON.parse(readFileSync(join(root, "data/rules.json"), "utf8"));
const index = buildIndex(doc);
const VERDICT = /^(curbside-recycle|curbside-organics|curbside-trash|ask|drop-off:[a-z0-9-]+)$/;

test("every rule row is complete and cites a known source", () => {
  const ids = new Set();
  for (const r of doc.rules) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    for (const k of ["item", "material", "verdict", "how", "source", "quote"]) {
      assert.ok(typeof r[k] === "string" && r[k].trim(), `${r.id}: missing ${k}`);
    }
    assert.match(r.verdict, VERDICT, `${r.id}: bad verdict ${r.verdict}`);
    const src = doc.sources[r.source];
    assert.ok(src, `${r.id}: unknown source ${r.source}`);
    assert.match(src.url, /^https:\/\//);
    assert.match(src.read, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(["verified", "unverified"].includes(src.status));
    if (r.verdict.startsWith("drop-off:")) {
      const site = r.verdict.slice(9);
      assert.ok(doc.sites[site], `${r.id}: unknown site ${site}`);
      assert.ok(doc.sources[doc.sites[site].source], `site ${site}: unknown source`);
    }
  }
});

test("every rule row resolves to itself by its item name and every alias", () => {
  for (const r of doc.rules) {
    for (const phrase of [r.item, ...r.aliases]) {
      const got = lookup(index, phrase);
      assert.equal(got.found, true, `"${phrase}" did not resolve`);
      assert.equal(got.rule.id, r.id, `"${phrase}" resolved to ${got.rule.id}, expected ${r.id}`);
      assert.equal(got.verdict, r.verdict);
      assert.equal(got.quote, r.quote);
      assert.ok(got.source.url);
    }
  }
});

test("no alias appears in two rows", () => {
  const seen = new Map();
  for (const r of doc.rules) {
    for (const a of r.aliases) {
      const key = tokens(a).join(" ");
      assert.ok(!seen.has(key) || seen.get(key) === r.id, `alias "${a}" in ${seen.get(key)} and ${r.id}`);
      seen.set(key, r.id);
    }
  }
});

test("unknown items fall through to ask with the hauler's public number", () => {
  for (const label of ["", "   ", "styrofoam cooler", "juice box", "qwertyuiop", null, undefined]) {
    const got = lookup(index, label);
    assert.equal(got.found, false, `"${label}" should be unknown`);
    assert.equal(got.verdict, "ask");
    assert.equal(got.rule, null);
    assert.equal(got.ask.phone, "530-274-3090");
    assert.ok(got.source.url, "the ask number is itself cited");
  }
});

test("longest phrase wins in sentences and plurals", () => {
  const cases = {
    "an empty paint can": "paint",
    "a soda can": "metal-can",
    "greasy pizza box from last night": "pizza-box",
    "Amazon shipping box": "cardboard",
    "old car batteries": "large-battery",
    "AA batteries": "household-battery",
    "used paper towels": "paper-towel",
    "Leaves and pine needles": "yard-waste",
    "two old tires": "tire",
    "compostable bag": "compostable-bag",
    "spray paint": "aerosol",
    "can of paint": "paint",
    "glass jar of pasta sauce": "glass-bottle",
  };
  for (const [label, id] of Object.entries(cases)) {
    assert.equal(lookup(index, label).rule?.id, id, label);
  }
});

test("unresolved phrases beat generic aliases and answer ask", () => {
  for (const label of ["juice box", "milk carton", "styrofoam cup", "broken glass", "old light bulb"]) {
    const got = lookup(index, label);
    assert.equal(got.found, false, label);
    assert.equal(got.verdict, "ask", label);
  }
  for (const p of doc.unresolved.phrases) assert.equal(lookup(index, p).verdict, "ask", p);
});

test("100-item typed set: zero wrong answers, at least 70 of 80 cited, every unknown asks", async () => {
  const { evaluate } = await import("../scripts/typed-rate.mjs");
  const e = evaluate();
  assert.equal(e.total, 100);
  assert.equal(e.total - e.expectRule, 20, "20 unknowns");
  const wrong = e.rows.filter((r) => r.outcome === "wrong").map((r) => `${r.label} -> ${r.got}`);
  assert.deepEqual(wrong, [], "a wrong cart is never acceptable");
  assert.ok(e.cited >= 70, `cited ${e.cited}/80 fell below 70`);
  assert.equal(e.askCorrect, 20);
});

// The typed set records the verdict a reviewer expects for each item, separately from the table.
// Without it a flipped verdict in data/rules.json (food scraps to the blue cart) passed every test
// (CI positive control, PR #2, 2026-11-24).
test("typed set pins the expected verdict of every rule, and the table still agrees", () => {
  const set = JSON.parse(readFileSync(join(root, "tests/typed-set.json"), "utf8")).items;
  const covered = new Set(set.map((i) => i.expect));
  const missing = doc.rules.map((r) => r.id).filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], "every rule needs at least one typed item");
  const byId = Object.fromEntries(doc.rules.map((r) => [r.id, r.verdict]));
  for (const it of set) {
    assert.match(it.verdict || "", VERDICT, `${it.label}: no pinned verdict`);
    const tableVerdict = it.expect === "ask" ? "ask" : byId[it.expect];
    assert.equal(tableVerdict, it.verdict, `${it.label}: table says ${tableVerdict}, typed set pins ${it.verdict}`);
  }
});

test("model guesses: low confidence and unmatched labels never invent a rule", () => {
  assert.equal(lookupGuesses(index, [{ label: "laptop", confidence: 0.9 }]).rule.id, "e-waste");
  assert.equal(lookupGuesses(index, [{ label: "laptop", confidence: 0.2 }]).verdict, "ask");
  assert.equal(
    lookupGuesses(index, [{ label: "mystery object", confidence: 0.95 }, { label: "glass jar", confidence: 0.7 }]).rule.id,
    "glass-bottle",
  );
  assert.equal(lookupGuesses(index, []).verdict, "ask");
});

test("every verdict has display text", () => {
  for (const r of doc.rules) assert.ok(verdictText(r.verdict).title);
  assert.equal(verdictText("drop-off:mrts").tone, "dropoff");
});

// The anti-invention check: each quote must appear verbatim (whitespace-normalized) in the page
// snapshot it cites. Snapshots live in gitignored scratch/sources (fetched by scripts/fetch-sources.sh);
// skipped, not passed, when they are absent.
const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
const haveSnapshots = Object.values(doc.sources).every((s) => existsSync(join(root, s.snapshot)));
test("every quote appears verbatim in its cited page snapshot", { skip: !haveSnapshots && "no snapshots" }, () => {
  const text = {};
  for (const [id, s] of Object.entries(doc.sources)) text[id] = norm(readFileSync(join(root, s.snapshot), "utf8"));
  for (const r of doc.rules) assert.ok(text[r.source].includes(norm(r.quote)), `${r.id}: quote not found in ${r.source}`);
  assert.ok(text[doc.ask.source].includes(norm(doc.ask.quote)), "ask quote not found");
  for (const [k, m] of Object.entries(doc.reminders || {})) assert.ok(text[m.source].includes(norm(m.quote)), `reminder ${k}: quote not found`);
});
