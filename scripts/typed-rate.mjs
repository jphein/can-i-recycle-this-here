#!/usr/bin/env node
// Cited-answer rate on the 100-item typed set (no model, no network).
//   cited        answered from the expected cited rule
//   ask-correct  an unknown item answered "ask"
//   ask-instead  a rule was expected, the app said "ask" (safe, but a miss)
//   wrong        answered from a rule other than the expected one, or a rule where "ask" was expected
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildIndex, lookup } from "../web/lookup.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function evaluate() {
  const index = buildIndex(JSON.parse(readFileSync(join(root, "data/rules.json"), "utf8")));
  const set = JSON.parse(readFileSync(join(root, "tests/typed-set.json"), "utf8")).items;
  const rows = set.map((t) => {
    const r = lookup(index, t.label);
    const got = r.found ? r.rule.id : "ask";
    const outcome = got === t.expect ? (got === "ask" ? "ask-correct" : "cited") : got === "ask" ? "ask-instead" : "wrong";
    return { ...t, got, outcome };
  });
  const n = (o) => rows.filter((r) => r.outcome === o).length;
  const kinds = {};
  for (const r of rows) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  return {
    rows, kinds, total: rows.length,
    expectRule: rows.filter((r) => r.expect !== "ask").length,
    cited: n("cited"), askCorrect: n("ask-correct"), askInstead: n("ask-instead"), wrong: n("wrong"),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const e = evaluate();
  for (const r of e.rows) {
    if (r.outcome === "ask-instead" || r.outcome === "wrong") console.log(`${r.outcome.padEnd(11)} ${r.kind.padEnd(11)} "${r.label}": expected ${r.expect}, got ${r.got}`);
  }
  console.log(`kinds: ${JSON.stringify(e.kinds)}`);
  console.log(
    `${e.total} items: ${e.cited}/${e.expectRule} answered from the expected cited rule (${((100 * e.cited) / e.expectRule).toFixed(0)}%); ` +
      `${e.askCorrect}/${e.total - e.expectRule} unknowns answered ask; ${e.askInstead} said ask instead of a rule; ${e.wrong} wrong`,
  );
}
