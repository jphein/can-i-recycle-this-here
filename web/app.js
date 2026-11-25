import { buildIndex, lookup, lookupGuesses, verdictText } from "./lookup.js";

const $ = (id) => document.getElementById(id);
const CHIPS = ["pizza box", "AA batteries", "paint", "plastic bag", "laptop", "glass jar", "vape", "propane tank"];
let index = null;

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : String(k));
  return n;
}

function tel(phone) {
  return "tel:+1" + phone.replace(/\D/g, "").slice(-10);
}

function spokenText(r) {
  const v = verdictText(r.verdict).title;
  const parts = [r.found ? `${r.rule.item}. ${v}.` : `${v}.`];
  if (r.found) parts.push(r.rule.how);
  if (r.site) parts.push(`${r.site.name}. ${r.site.address || ""}`);
  if (!r.found) parts.push(`Call ${r.ask.name} at ${r.ask.phone}.`);
  return parts.join(" ");
}

function render(r) {
  const box = $("answer");
  const v = verdictText(r.verdict);
  box.className = `answer tone-${v.tone}`;
  box.replaceChildren();

  const subtitle = r.found
    ? `${r.rule.item}${r.guess ? ` (photo looked like: ${r.guess.label})` : ""}`
    : r.label
      ? `We don't have a cited local rule for "${r.label}".`
      : "We couldn't tell what that is.";
  box.append(el("div", { class: "verdict" }, el("h2", {}, v.title), el("p", {}, subtitle)));

  const body = el("div", { class: "body" });
  if (r.found) body.append(el("p", { class: "how" }, r.rule.how));
  const reminder = index.doc.reminders && index.doc.reminders[r.verdict];
  if (r.found && reminder) body.append(el("p", { class: "reminder" }, reminder.text));
  if (r.site) {
    body.append(el("div", { class: "site" },
      el("strong", {}, r.site.name),
      ...(r.site.address ? r.site.address.split("; ").map((line) => el("p", {}, line)) : []),
      r.site.hours && el("p", {}, r.site.hours),
      r.site.note && el("p", {}, r.site.note),
      r.site.phone && el("p", {}, el("a", { href: tel(r.site.phone) }, r.site.phone)),
    ));
  }
  if (!r.found) {
    body.append(el("p", { class: "how" }, "Please don't guess: a wrong item can spoil a whole truck of recycling. Ask the hauler:"));
    body.append(el("a", { class: "call", href: tel(r.ask.phone) }, `Call WM ${r.ask.phone}`));
    body.append(el("p", {}, r.ask.hours), el("p", {}, r.ask.also));
  }
  if (r.source) {
    body.append(el("div", { class: "source" },
      el("blockquote", {}, `“${r.quote}”`),
      el("a", { href: r.source.url, target: "_blank", rel: "noopener" }, r.source.title),
      el("div", { class: "read" }, `Read ${r.source.read}${r.source.status === "unverified" ? " · unverified" : ""}`),
    ));
  }
  const actions = el("div", { class: "actions" });
  if ("speechSynthesis" in window) {
    actions.append(el("button", {
      class: "secondary", type: "button",
      onclick: () => { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(spokenText(r))); },
    }, "Read aloud"));
  }
  actions.append(el("button", { class: "secondary", type: "button", onclick: reset }, "Check another"));
  body.append(actions);
  box.append(body);
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
  tally(r.found);
}

// The success measure, kept only on this phone: how many checks were answered from a cited rule.
function tally(cited) {
  let t = { cited: 0, ask: 0 };
  try { t = { ...t, ...JSON.parse(localStorage.getItem("tally") || "{}") }; } catch {}
  if (cited !== undefined) t[cited ? "cited" : "ask"]++;
  try { localStorage.setItem("tally", JSON.stringify(t)); } catch {}
  const total = t.cited + t.ask;
  $("tally").textContent = total ? `On this phone: ${t.cited} of ${total} checks answered from a cited local rule.` : "";
}

function reset() {
  $("answer").hidden = true;
  $("item").value = "";
  $("preview").hidden = true;
  $("photo-status").textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function check(label) {
  if (!index) return;
  render(lookup(index, label));
}

// Shrink the photo before it leaves the phone: ~1024px JPEG is plenty to name an object.
async function shrink(file, max = 1024) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

async function onPhoto(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const status = $("photo-status");
  const preview = $("preview");
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  status.textContent = "Looking at your photo…";
  try {
    const image = await shrink(file);
    const res = await fetch("api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    if (res.status === 503 || res.status === 404 || res.status === 405) { // 405: a static host such as GitHub Pages
      status.textContent = "Photo naming isn't switched on here yet. Type what it is below.";
      $("item").focus();
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    status.textContent = "";
    render(lookupGuesses(index, data.guesses));
  } catch (err) {
    status.textContent = "Couldn't read the photo. Type what it is below.";
    $("item").focus();
  } finally {
    e.target.value = "";
  }
}

async function main() {
  const res = await fetch("rules.json");
  index = buildIndex(await res.json());
  $("type-form").onsubmit = (e) => { e.preventDefault(); check($("item").value); };
  $("photo").onchange = onPhoto;
  tally();
  $("chips").append(...CHIPS.map((c) => el("button", { type: "button", onclick: () => { $("item").value = c; check(c); } }, c)));
}

main().catch(() => {
  $("photo-status").textContent = "Couldn't load the rules. Call WM at 530-274-3090.";
});
