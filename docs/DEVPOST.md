# Devpost project page — draft 1, ready to paste

Fields follow the submission requirements as the contest brief records them from the rules page (public repo,
2–3 min video, written description, Theme paragraph). Track: **Theme — Rethinking Waste**.

## Project name (≤ 60)
Can I Recycle This Here?

## Tagline
Point your phone at it, get your county's actual rule, with the line it came from.

## Links
- Code: https://github.com/jphein/can-i-recycle-this-here
- Try it (typed items): https://jphein.github.io/can-i-recycle-this-here/
- Video: TODO (YouTube or Vimeo link once uploaded)

## Built with
javascript · html · css · node.js · github-pages · openai-compatible-vision-api (TODO: name the model once the photo path is live)

---

## What it does
You're at the bins holding a greasy pizza box, a dead vape or a handful of AA batteries, and search
results give you rules for somewhere else. Can I Recycle This Here? gives you the rule for western
Nevada County, California. Take a photo or type the item. The answer is one of five: blue cart,
green cart, trash, a named drop-off with its address and hours, or "not sure, call the hauler".
Under every answer is the exact sentence from the county's or the hauler's own page, a link to it,
and the date it was read. When no local rule covers the item, it says so and shows the hauler's
public phone number. It never guesses. It runs in a phone browser, with no account and no
tracking, and can read any answer aloud.

## How I built it
- The model only names the item. A lookup maps that name to a row in a rules table built by hand
  from five public pages (Nevada County Solid Waste's Recycling Guide and Transfer Stations pages,
  WM's 2026 Grass Valley calendar, the McCourtney Road Transfer Station brochure, CalRecycle's
  "Waste Banned from the Trash"). Each of the 38 rows keeps its source, read date and a
  word-for-word quote.
- A test re-reads the cited pages and fails if any quote no longer appears, so a changed rule
  can't go stale silently.
- Safety rules in the lookup: items the pages don't settle always answer "not sure"; between two
  equal matches the safer one wins ("can of paint" goes to hazardous waste); a bare word like "bag"
  or "box" only counts when nothing else in the name is unfamiliar.
- Measured on 100 typed items: 91% of coverable items answered from the right cited rule, all 20
  uncovered items answered "not sure", zero sent to a wrong cart. The test suite fails if any item
  ever lands in a wrong cart.
- Plain HTML, CSS and JavaScript, no dependencies, no build step. A small Node server keeps the
  model key off the phone; the public demo is static and runs typed-only.

## Challenges I ran into
My first version answered "juice box" with the blue cart, because it matched the word "box". The
100-item test later caught "dog food bag" and "wax paper" the same way. Rather than patch those
three items, I changed the rule: a bare container word only counts when everything else in the name
is familiar. That made five answers say "not sure" instead of being right, which is the trade I
want: a miss is safe, a wrong cart isn't.

## Accomplishments I'm proud of
Every answer can be checked by the person reading it, and the tests prove every quote still
matches its page.

## What I learned
The hard part of recycling help isn't recognizing the object. It's knowing the local rule, and
knowing when to say "I don't know".

## What's next
- Run the photo path on real items and publish the hit rate, misses included.
- Add east Nevada County (a different hauler) as a second rules table.
- A weekly job that re-reads the cited pages and flags any rule that changed.
- Spanish.
- Offer the table to the county and the hauler; they own the rules.

## Theme: the waste problem and how success is measured
In western Nevada County the right answer depends on local details that generic advice gets wrong.
Pizza boxes and paper towels go in the green cart. Plastic bags are not accepted in the recycling
cart at all. Batteries go in a zip bag on top of the cart or to one of eight drop-offs. A vape or
earbuds go to the transfer station whole. Guessing contaminates the blue cart (the hauler's own
calendar warns of surcharges) and puts batteries and electronics where, in the county's words,
they "can cause fires and injury to waste workers". The county reports 48.87% of its waste was
recycled rather than landfilled from September 2025 to August 2026. Success is measured four
ways: (1) the share of checks answered from a cited local rule, counted on the phone only (91% on
our 100-item test set; target 80%); (2) zero answers sending an item to a cart its cited page
excludes (0 of 100 today, enforced by the tests); (3) avoided contamination per 100 checks, meaning
items that don't belong in the blue cart that got a cited destination instead; (4) over time,
movement in the county's 48.87% diversion figure and the hauler's contamination tags on a pilot
route, if the county or WM will share them.

---
This is a student project, not an official county or WM service.
