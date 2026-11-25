#!/usr/bin/env python3
"""Fetch public-domain / CC0 sample photos from Wikimedia Commons into tests/fixtures.

Writes one JPEG per item, manifest.json (file, expected rule id, title, licence, source page) and
a README.md with the licence line per file. Only CC0 and public-domain files are taken.

    python3 -I scripts/get-fixtures.py              # fetch all
    python3 -I scripts/get-fixtures.py laptop       # refetch only the named stems
    python3 -I scripts/get-fixtures.py --list "paint tin"   # show candidate titles for a search
"""
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "can-i-recycle-this-here/0.1 (hackathon test fixtures)"
OUT = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures"
ITEMS = [  # (file stem, expected rule id, search terms, index of the hit to take: chosen by eye)
    ("pizza-box", "pizza-box", "pizza box", 0),
    ("aa-battery", "household-battery", "AA battery", 0),
    ("glass-jar", "glass-bottle", "glass jar empty", 0),
    ("aluminum-can", "metal-can", "aluminum beverage can", 0),
    ("plastic-bottle", "plastic-container", "plastic bottle", 1),
    ("laptop", "e-waste", "laptop", 0),
    ("paint-can", "paint", "paint tin", 2),
    ("cardboard-box", "cardboard", "corrugated box", 1),
    ("plastic-bag", "plastic-bag", "plastic shopping bag", 0),
    ("propane-tank", "propane", "propane cylinder", 0),
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
    out = []
    for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        lic = (ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value") or "").lower()
        if ii.get("mime") == "image/jpeg" and any(k in lic for k in OK) and ii.get("thumburl"):
            out.append((p["title"], lic, ii["thumburl"], ii.get("descriptionurl", "")))
    return out


def main():
    args = sys.argv[1:]
    if args and args[0] == "--list":
        for term in args[1:]:
            print("==", term)
            for i, (title, lic, _thumb, _page) in enumerate(candidates(term)):
                print(i, lic, title[:110])
            time.sleep(3)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(args)  # optional: stems to (re)fetch; the rest keep their manifest rows
    mpath = OUT / "manifest.json"
    old = {m["file"]: m for m in json.loads(mpath.read_text())} if mpath.exists() else {}
    manifest = []
    for stem, rule, term, idx in ITEMS:
        if only and stem not in only and f"{stem}.jpg" in old:
            manifest.append(old[f"{stem}.jpg"])
            continue
        time.sleep(3)  # Commons rate-limits bursts
        hits = candidates(term)
        if not hits:
            print(f"MISS {stem}: no CC0/PD jpeg for '{term}'")
            continue
        title, lic, thumb, page = hits[min(idx, len(hits) - 1)]
        time.sleep(2)
        (OUT / f"{stem}.jpg").write_bytes(get(thumb))
        manifest.append({"file": f"{stem}.jpg", "expect": rule, "title": title, "license": lic, "source": page})
        print(f"ok   {stem}: {title} [{lic}]")
    mpath.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    lines = ["# Test photos", "",
             "Sample photos for `scripts/photo-test.mjs`, from Wikimedia Commons. Only CC0 and public-domain files.", "",
             "| file | expected rule | licence | source |", "|---|---|---|---|"]
    lines += [f"| {m['file']} | {m['expect']} | {m['license']} | [{m['title'].removeprefix('File:')}]({m['source']}) |" for m in manifest]
    (OUT / "README.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
