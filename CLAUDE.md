# can-i-recycle-this-here

Arbiter Hacks V1 entry (theme: Rethinking Waste). Photo or typed item -> Western Nevada County's
cited disposal rule. Brief and status: `~/Projects/money/scratch/contests/arbiter-hacks-v1/`.

## Stack

Stack: plain HTML + CSS custom properties + vanilla JS (ES modules), data in one JSON file, `build.sh`
to `dist/` — static site, STACK-CHOICES §6. Reason: the whole product is one page and one lookup
table; no build step keeps the judged repo readable and lets the same `web/lookup.js` run in the
browser and under `node --test`.

Plus `server.mjs`: zero-dependency Node `http` — exists only because the vision key must not reach
the browser. Node rather than Go because it shares the test runner and the lookup module; it is a
demo-lifetime process, not a long-running service on familiar.

Tests: `node --test` (built in). No framework, no dependencies, no `node_modules`.

## Rules that matter here

- **The model never decides.** It returns labels; `web/lookup.js` maps a label to a row in
  `data/rules.json`. Unknown or low confidence -> `ask` with WM's public number.
- **Never invent a rule.** Every row's `quote` is verbatim from the page in `source`. A page that
  cannot be fetched gets `"status": "unverified"`; nothing is written from memory. `how` may only
  restate what the cited pages say.
- **The quote check is the instrument**: `scripts/fetch-sources.sh` then `npm test`. Snapshots live
  in gitignored `scratch/sources/`; without them that one test is skipped, not passed.
- An item that a generic alias would mis-match and the pages do not settle goes in
  `unresolved.phrases`, not into a guessed row.
- Keys: `VISION_*` from the vault into the process environment only. No `.env`, nothing in the repo.
- Web: SVG favicon, dark + light through `prefers-color-scheme`, realm-sigil stamp from `build.sh`.
- Phone first: check at 390 px wide before anything else.

## Commands

    npm test                    # 14 tests, no network, no model calls
    scripts/vision-preflight.mjs  # image-capable models the key can see
    scripts/photo-test.mjs      # real model, spends tokens: only after the credit preflight is GO
    scripts/screenshots.mjs     # headless Chromium at 390/1024, light + dark -> scratch/shots
    npm start                   # http://localhost:8787
    scripts/fetch-sources.sh    # refresh page snapshots, then npm test
    ./build.sh                  # dist/ with realm-sigil version.json

## Git

Feature branch + PR + self-merge once the GitHub remote exists (pushed public only when the README
is clean and gitleaks is green). This directory is under Syncthing: branch work happens in a clone,
never by `git checkout` here.
