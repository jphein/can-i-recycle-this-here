#!/usr/bin/env python3
"""Fetch public-domain / CC0 sample photos from Wikimedia Commons into tests/fixtures.

Writes one JPEG per item plus manifest.json (file, expected rule id, title, license, source page).
Only CC0 and public-domain files are taken. Run with: python3 -I scripts/get-fixtures.py
"""
import json
import pathlib
import sys
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "can-i-recycle-this-here/0.1 (hackathon test fixtures)"
OUT = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures"
ITEMS = [  # (file stem, expected rule id, search terms)
    ("pizza-box", "pizza-box", "pizza box"),
    ("aa-battery", "household-battery", "AA battery"),
    ("glass-jar", "glass-bottle", "glass jar empty"),
    ("aluminum-can", "metal-can", "aluminum beverage can"),
    ("plastic-bottle", "plastic-container", "plastic water bottle"),
    ("laptop", "e-waste", "laptop computer"),
    ("paint-can", "paint", "paint can"),
    ("cardboard-box", "cardboard", "cardboard box"),
    ("plastic-bag", "plastic-bag", "plastic shopping bag"),
    ("propane-tank", "propane", "propane tank"),
]
OK = ("cc0", "public domain", "pd")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def candidates(term):
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
        "gsrsearch": f"{term} filetype:bitmap", "gsrlimit": 40, "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime", "iiurlwidth": 800,
    })
    pages = json.loads(get(f"{API}?{q}")).get("query", {}).get("pages", {})
    for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        lic = (ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value") or "").lower()
        if ii.get("mime") == "image/jpeg" and any(k in lic for k in OK) and ii.get("thumburl"):
            yield p["title"], lic, ii["thumburl"], ii.get("descriptionurl", "")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pick = {a.split("=")[0]: int(a.split("=")[1]) for a in sys.argv[1:]}  # e.g. laptop=2 to take the 3rd hit
    manifest = []
    for stem, rule, term in ITEMS:
        hits = list(candidates(term))
        if not hits:
            print(f"MISS {stem}: no CC0/PD jpeg for '{term}'")
            continue
        title, lic, thumb, page = hits[min(pick.get(stem, 0), len(hits) - 1)]
        (OUT / f"{stem}.jpg").write_bytes(get(thumb))
        manifest.append({"file": f"{stem}.jpg", "expect": rule, "title": title, "license": lic, "source": page})
        print(f"ok   {stem}: {title} [{lic}] ({len(hits)} candidates)")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
