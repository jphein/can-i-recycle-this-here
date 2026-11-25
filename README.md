# Can I Recycle This Here?

Point a phone at an item and get **Western Nevada County's actual rule** for it: blue cart, green
cart, trash, or a named drop-off, with the exact line from the county's or the hauler's own page
and the date it was read. Not generic advice.

Built for Arbiter Hacks V1, theme track *Rethinking Waste*.

## How it decides

1. A vision model **names** the item in the photo (or you type it). The model never says where it goes.
2. `web/lookup.js` matches that name against `data/rules.json`, a table read from public pages:
   Nevada County Solid Waste's Recycling Guide and Transfer Stations pages, WM's 2026 Grass Valley
   collection calendar, the McCourtney Road Transfer Station brochure, and CalRecycle's
   "Waste Banned from the Trash" page.
3. The answer shows the verdict, what to do, the drop-off site if there is one, and the cited quote
   with its source link and read date.
4. No cited rule, or a low-confidence photo: **"Not sure"**, with WM's public customer service number.
   The app never invents a rule.

Two guards keep it honest:

- Common items the local pages do not settle (juice boxes, foam, generic light bulbs) are listed as
  `unresolved` and always answer "ask" rather than falling into a generic alias such as "box".
- When two rules match equally, the safer one wins: "can of paint" goes to hazardous-waste drop-off,
  not the blue cart.

## Run it

Needs Node 20 or newer. No dependencies to install.

```sh
npm start            # http://localhost:8787, typed-item path works straight away
npm test             # rules lookup and server tests
```

The photo path needs a vision model behind an OpenAI-compatible chat-completions endpoint, given
to the server through its environment only (never a file):

```sh
VISION_ENDPOINT=... VISION_MODEL=... VISION_API_KEY=... npm start
```

Without those the page says photo naming is off and asks you to type the item. The photo is
shrunk on the phone, forwarded to the model, and never stored or logged.

`./build.sh` writes a static copy to `dist/` (typed-item path only).

## The rules table

`data/rules.json` has one row per item class:

| field | meaning |
|---|---|
| `item`, `aliases` | what people call it |
| `material` | what it is made of |
| `verdict` | `curbside-recycle`, `curbside-organics`, `curbside-trash`, `drop-off:<site>` or `ask` |
| `how` | one plain sentence |
| `source` | key into `sources` (title, URL, date read, `verified` or `unverified`) |
| `quote` | the rule line, verbatim from that page |

`scripts/fetch-sources.sh` re-downloads the cited pages as text into `scratch/sources/`. With those
present, `npm test` checks that **every quote still appears word for word in its page**, so a page
that changes turns the suite red instead of leaving a stale rule in the app.

## Scope and limits

- Covers WM curbside service in western Nevada County (Grass Valley, Nevada City, unincorporated
  county). Truckee and the east county use a different hauler and are not covered.
- Rules were read on 2026-11-24. Fees and hours change; the source link is on every answer.
- This is not an official county or WM service.

## License

MIT
