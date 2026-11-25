// Rules lookup: a label (typed by a person or named by a vision model) -> one cited rule.
// The model never decides a verdict; this table does. Unknown -> "ask" with the hauler's number.
// Shared by the browser (web/app.js) and the tests (tests/lookup.test.mjs). No dependencies.

const IRREGULAR = { leaves: "leaf", knives: "knife" };

function singular(word) {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && /(xes|ches|shes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

export function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

function containsPhrase(hay, needle) {
  if (!needle.length || needle.length > hay.length) return false;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

// Safety-first tie-break between equal-length matches ("can of paint" hits both "can" and "paint"):
// the answer whose mistake costs least wins. Wrongly sending paint to hazardous-waste drop-off is
// harmless; wrongly sending it to the blue cart contaminates the load and can start a fire.
const SEVERITY = (verdict) =>
  verdict === null ? 6 // unresolved: never guess
  : verdict === "drop-off:mrts-hhw" ? 5
  : verdict.startsWith("drop-off:") ? 4
  : verdict === "ask" ? 3
  : verdict === "curbside-trash" ? 2
  : verdict === "curbside-organics" ? 1
  : 0;

// Build once per rules document: every alias (and the item name) as a token phrase, plus the
// "unresolved" phrases that must answer "ask" instead of falling into a generic alias.
export function buildIndex(doc) {
  const entries = [];
  for (const rule of doc.rules) {
    const phrases = new Set([rule.item, ...(rule.aliases || [])]);
    for (const p of phrases) {
      const t = tokens(p);
      if (t.length) entries.push({ rule, phrase: p, toks: t, sev: SEVERITY(rule.verdict) });
    }
  }
  for (const p of (doc.unresolved && doc.unresolved.phrases) || []) {
    const t = tokens(p);
    if (t.length) entries.push({ rule: null, phrase: p, toks: t, sev: SEVERITY(null) });
  }
  // Longest phrase first ("pizza box" over "box"), then the safer verdict.
  entries.sort((a, b) => b.toks.length - a.toks.length || b.sev - a.sev);
  return { doc, entries };
}

// Returns { found, rule, matched, verdict, site, source, quote, ask }.
export function lookup(index, label) {
  const { doc } = index;
  const q = tokens(label);
  let hit = null;
  if (q.length) {
    for (const e of index.entries) {
      if (containsPhrase(q, e.toks)) { hit = e; break; }
    }
  }
  if (!hit || !hit.rule) {
    return {
      found: false,
      label: String(label || ""),
      matched: hit ? hit.phrase : null,
      verdict: "ask",
      rule: null,
      ask: doc.ask,
      source: doc.sources[doc.ask.source] || null,
      quote: doc.ask.quote,
    };
  }
  const rule = hit.rule;
  const siteId = rule.verdict.startsWith("drop-off:") ? rule.verdict.slice("drop-off:".length) : null;
  return {
    found: true,
    label: String(label),
    matched: hit.phrase,
    verdict: rule.verdict,
    rule,
    site: siteId ? doc.sites[siteId] || null : null,
    source: doc.sources[rule.source] || null,
    quote: rule.quote,
    ask: doc.ask,
  };
}

// Try a vision model's guesses in order of confidence; first cited rule wins, else "ask".
export function lookupGuesses(index, guesses, minConfidence = 0.5) {
  for (const g of guesses || []) {
    if ((g.confidence ?? 1) < minConfidence) continue;
    const r = lookup(index, g.label);
    if (r.found) return { ...r, guess: g };
  }
  const best = (guesses || [])[0];
  return { ...lookup(index, ""), label: best ? best.label : "", guess: best || null };
}

export const VERDICT_TEXT = {
  "curbside-recycle": { title: "Blue cart: recycle it", tone: "recycle" },
  "curbside-organics": { title: "Green cart: organics", tone: "organics" },
  "curbside-trash": { title: "Trash cart", tone: "trash" },
  ask: { title: "Not sure: ask before you toss it", tone: "ask" },
};

export function verdictText(verdict) {
  if (verdict && verdict.startsWith("drop-off:")) return { title: "Take it to a drop-off", tone: "dropoff" };
  return VERDICT_TEXT[verdict] || VERDICT_TEXT.ask;
}
