#!/usr/bin/env bash
# Re-fetch the public pages the rules table cites into scratch/sources (gitignored), as plain text.
# The test "every quote appears verbatim in its cited page snapshot" reads these files, so a page
# that changed its wording turns the suite red instead of leaving a stale rule in the app.
set -euo pipefail
cd "$(dirname "$0")/.."
out=scratch/sources; mkdir -p "$out"
UA="Mozilla/5.0 (X11; Linux x86_64) can-i-recycle-this-here/0.1"
get() { curl -fsSL -A "$UA" -m 60 -o "$out/$1" "$2"; }
html2txt() { python3 -I -c '
import re, html, sys
s = open(sys.argv[1], encoding="utf-8", errors="replace").read()
s = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", s)
s = html.unescape(re.sub(r"(?s)<[^>]+>", "\n", s))
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(l.strip() for l in s.splitlines() if l.strip()))
' "$out/$1" "$out/$2"; }

get county-4267.html https://www.nevadacountyca.gov/4267/Recycling-Guide
html2txt county-4267.html county-4267.html.txt
get county-3412.html https://www.nevadacountyca.gov/3412/Transfer-Stations
html2txt county-3412.html county-3412.html.txt
get calrecycle_ca_gov_homehazwaste_info_ https://calrecycle.ca.gov/homehazwaste/info/
html2txt calrecycle_ca_gov_homehazwaste_info_ calrecycle_ca_gov_homehazwaste_info_.txt
get gv-2026-cal.pdf https://www.wm.com/content/dam/wm/local-pages/california/grass-valley/documents/2026GrassValleyCalendarOW.pdf
pdftotext "$out/gv-2026-cal.pdf" "$out/gv-2026-cal.plain.txt"
get mrts-2026-27.pdf https://www.wm.com/content/dam/wm/local-pages/california/nevada-county/residential/McCourtney-Road-Transfer-Station-Brochure-2026-2027.pdf
pdftotext "$out/mrts-2026-27.pdf" "$out/mrts-2026-27.plain.txt"
echo "fetched $(ls "$out" | wc -l) files into $out on $(date +%F)"
