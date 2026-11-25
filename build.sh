#!/usr/bin/env bash
# Static build: web/ + data/rules.json -> dist/, stamped with a realm-sigil version.
# dist/ works on any static host for the typed-item path; the photo path needs server.mjs.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir dist
cp web/* dist/ && cp data/rules.json dist/rules.json
SIGIL="${REALM_SIGIL:-$HOME/Projects/realm-sigil}/static/build.sh"
if [ -x "$SIGIL" ]; then
  "$SIGIL" --name can-i-recycle-this-here --description "Can I Recycle This Here?" \
    --realm creature --repo https://github.com/jphein/can-i-recycle-this-here --html index.html --dir dist
else
  echo "realm-sigil not found at $SIGIL; built without a version stamp" >&2
fi
