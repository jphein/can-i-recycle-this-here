# Can I Recycle This Here? — submission text (draft 1)

Arbiter Hacks V1 · Theme track: Rethinking Waste · solo student entry.
Draft written 2026-11-24. Lines marked TODO depend on work not finished yet; nothing below claims it.

## What it does

You are standing at the bins holding a greasy pizza box, a dead vape or a handful of AA batteries.
Search results give you advice for somewhere else. "Can I Recycle This Here?" gives you the rule
for *here*: western Nevada County, California.

Point your phone at the item, or type its name. The app answers with one of five things: blue
cart, green cart, trash cart, a named drop-off with its address and hours, or "not sure, call the
hauler". Under every answer is the exact sentence from the county's or the hauler's own page, a
link to that page, and the date it was read. If no local rule covers the item, the app says so and
shows the hauler's public phone number. It does not guess.

It runs in a phone browser. There is no account and no tracking. Text is large, the buttons are
big, and any answer can be read aloud.

## How I built it

- **The model names, the table decides.** A vision model only says what the object is ("pizza
  box"). A small lookup maps that name to a row in a rules table. The model is never asked where
  something goes, so it cannot invent a rule.
- **The rules table** has 38 rows, each read from a public page: Nevada County Solid Waste's
  Recycling Guide and Transfer Stations pages, WM's 2026 Grass Valley collection calendar, the
  McCourtney Road Transfer Station brochure, and CalRecycle's "Waste Banned from the Trash" page.
  Every row stores its source, the date read and a word-for-word quote.
- **A test checks every quote against the live page text.** If the county rewrites a rule, the test
  fails instead of the app quietly giving a stale answer.
- **Two safety choices in the lookup.** Items the local pages do not settle (juice boxes, foam,
  generic light bulbs) are listed explicitly and always answer "ask". When two rules match equally,
  the safer one wins, so "can of paint" goes to hazardous waste, not the blue cart. The first
  version sent "juice box" to the blue cart through the generic word "box"; a test caught it.
- **Stack:** plain HTML, CSS and JavaScript with no build step and no dependencies, so the same
  lookup file runs in the browser and in the tests. A small Node server (under 100 lines) exists only to keep the
  model key off the phone. 14 automated tests.
- TODO (vision): which model, and the hit rate on real photos. The request path is tested against a
  stand-in endpoint; it has not yet been run against a real model.

## What's next

- Run the photo path on real items and publish the hit rate, misses included.
- Add the east county (Truckee uses a different hauler) as a second rules table; the lookup does
  not change.
- A weekly job that re-reads the cited pages and opens an issue when a quote no longer matches.
- Spanish, since the county's own pages offer it.
- Offer the table to the county and the hauler to correct; they own the rules.

## Theme: the waste problem and how success is measured

**The problem.** In western Nevada County the right answer depends on local details that generic
advice gets wrong. Pizza boxes and paper towels go in the green cart, not the blue one. Plastic
bags are not accepted in the recycling cart at all. Household batteries go in a zip bag on top of
the cart or to one of eight drop-offs, never inside any cart. A vape or a pair of earbuds has to go
to the transfer station whole. Two things go wrong when people guess: the blue cart gets
contaminated with bags, food and liquids, which the hauler's own calendar warns can bring
surcharges, and batteries and electronics end up in carts, where the county's guide says they
"can cause fires and injury to waste workers". The county reports that 48.87% of its waste was
recycled rather than landfilled from September 2025 to August 2026.

**How success would be measured.**

1. *Cited-answer rate:* the share of checks answered from a cited local rule rather than "not
   sure". The app already counts this on the phone (and nowhere else). Target: 80% or more on a
   test set of 100 common household items.
2. *Wrong-cart answers:* on that same test set, zero items sent to a cart the cited page excludes.
   "Not sure" is an acceptable answer; a wrong cart is not.
3. *Avoided contamination per 100 checks:* how many checks were for an item that does not belong in
   the blue cart (bags, food-soiled paper, batteries, electronics) and got a different, cited
   destination.
4. *Longer term:* movement in the county's published diversion figure from its 48.87% baseline,
   and the hauler's contamination tags on a pilot route, if the county or WM would share them.

## Sources (all read 2026-11-24)

- https://www.nevadacountyca.gov/4267/Recycling-Guide
- https://www.nevadacountyca.gov/3412/Transfer-Stations
- https://www.nevadacountyca.gov/1447/Solid-Waste (the 48.87% figure)
- https://www.wm.com/content/dam/wm/local-pages/california/grass-valley/documents/2026GrassValleyCalendarOW.pdf
- https://www.wm.com/content/dam/wm/local-pages/california/nevada-county/residential/McCourtney-Road-Transfer-Station-Brochure-2026-2027.pdf
- https://calrecycle.ca.gov/homehazwaste/info/

This is a student project. It is not an official county or WM service.
