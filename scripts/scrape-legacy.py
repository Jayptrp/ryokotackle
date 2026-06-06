#!/usr/bin/env python3
"""
Archive the legacy ReadyPlanet site's product media before ReadyPlanet is cancelled.

Source of truth: the live legacy sitemap (https://www.ryokotackle.com/sitemap.xml).
For every product page (.html leaf) it captures, in document order:
  - all product images (the page's dominant /images/column_<id>/ folder:
    photos, color variants, spec images, posters/ads)
  - embedded YouTube videos (ignores the Facebook page plugins)
  - a rough description text dump + the raw HTML (for later cleanup)

Output (gitignored):  scrape-output/<slug>/
    images/NN_<file>     meta.json     page.html
  plus scrape-output/_manifest.csv

Usage:
  python scripts/scrape-legacy.py                 # full run
  python scripts/scrape-legacy.py --limit 3       # quick test
  python scripts/scrape-legacy.py --filter fortius
Stdlib only — no pip installs.
"""
import argparse, csv, json, os, re, sys, time, urllib.parse, urllib.request
from collections import Counter

BASE = "https://www.ryokotackle.com"
SITEMAP = f"{BASE}/sitemap.xml"
UA = {"User-Agent": "Mozilla/5.0 (archive; owner-operated)"}

# .html leaf pages that are NOT products
BLOCKLIST = {
    "clip.html", "gallery.html", "contact-payment.html", "tester.html",
    "blank-baygame.html", "ryoko-blank-test-2009-korea.html",
    "part-diagrams-reel.html", "สภาพอากาศปัจจุบัน.html",
}

def fetch(url, tries=3, timeout=40):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return urllib.request.urlopen(req, timeout=timeout).read()
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last

def to_fetch_url(u):
    """Swap dead trytackle.com host -> ryokotackle.com; the path bytes are cp874,
    but the server wants UTF-8 percent-encoding (cp874 -> unicode -> utf-8)."""
    u = re.sub(r"https?://www\.trytackle\.com", BASE, u)
    sp = urllib.parse.urlsplit(u)
    try:
        uni = sp.path.encode("latin-1").decode("cp874")
    except Exception:
        uni = sp.path
    path = urllib.parse.quote(uni.encode("utf-8"), safe="/%-._~")
    return urllib.parse.urlunsplit((sp.scheme, sp.netloc, path, sp.query, ""))

def slugify(name):
    name = re.sub(r"\.html?$", "", name, flags=re.I)
    name = name.lower()
    name = re.sub(r"[^a-z0-9ก-๛]+", "-", name)
    return re.sub(r"^-+|-+$", "", name) or "product"

def strip_text(body):
    b = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", body)
    b = re.sub(r"(?is)<iframe.*?</iframe>", " ", b)
    b = re.sub(r"(?is)<[^>]+>", " ", b)
    b = re.sub(r"&nbsp;", " ", b)
    b = re.sub(r"[ \t\xa0]+", " ", b)
    b = re.sub(r"\s*\n\s*", "\n", b)
    return b.strip()

def extract(body):
    """body is the raw page decoded as latin-1 (byte-preserving)."""
    # Products use one of two folder schemes: images/column_<id>/ or images/sub_<id>/
    cols = re.findall(r"images/((?:column|sub)_\d+)", body)
    dom = Counter(cols).most_common(1)[0][0] if cols else None

    images = []
    if dom:
        seen = set()
        # allow ( ) in filenames (e.g. Silver(1).jpg); stop only at quotes/space/<>
        pat = re.compile(r"images/%s/[^\"'\s<>]+?\.(?:jpg|jpeg|png|gif)" % re.escape(dom), re.I)
        for m in pat.finditer(body):
            rel = m.group(0)
            if rel not in seen:
                seen.add(rel)
                images.append(f"{BASE}/{rel}")

    videos = []
    seenv = set()
    for vid in re.findall(r"youtube\.com/embed/([A-Za-z0-9_-]{6,})", body) \
            + re.findall(r"youtube\.com/watch\?v=([A-Za-z0-9_-]{6,})", body) \
            + re.findall(r"youtu\.be/([A-Za-z0-9_-]{6,})", body):
        if vid not in seenv:
            seenv.add(vid)
            videos.append({"provider": "youtube", "id": vid,
                           "url": f"https://www.youtube.com/watch?v={vid}"})

    mt = re.search(r"(?is)<title>(.*?)</title>", body)
    try:
        title = mt.group(1).encode("latin-1").decode("cp874").strip() if mt else ""
    except Exception:
        title = mt.group(1).strip() if mt else ""

    return dom, images, videos, title

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--filter", default="")
    ap.add_argument("--out", default="scrape-output")
    ap.add_argument("--delay", type=float, default=0.6)
    args = ap.parse_args()

    raw = fetch(SITEMAP).decode("latin-1")
    locs = re.findall(r"<loc>(.*?)</loc>", raw)
    products = []
    for u in locs:
        if not u.lower().endswith(".html"):
            continue
        base = os.path.basename(urllib.parse.urlsplit(u).path)
        try:
            base_cp = base.encode("latin-1").decode("cp874")
        except Exception:
            base_cp = base
        if base_cp.lower() in BLOCKLIST or base.lower() in BLOCKLIST:
            continue
        products.append((u, base))

    if args.filter:
        products = [p for p in products if args.filter.lower() in p[0].lower()]
    if args.limit:
        products = products[: args.limit]

    os.makedirs(args.out, exist_ok=True)
    manifest_path = os.path.join(args.out, "_manifest.csv")
    rows = []
    print(f"scraping {len(products)} product pages -> {args.out}/")

    for i, (loc, base) in enumerate(products, 1):
        slug = slugify(base)
        furl = to_fetch_url(loc)
        try:
            body = fetch(furl).decode("latin-1")
        except Exception as e:
            print(f"[{i}/{len(products)}] FAIL {slug}: {e}")
            rows.append({"legacy_url": loc, "slug": slug, "title": "", "column": "",
                         "n_images": 0, "n_videos": 0, "videos": "", "status": "fetch-failed"})
            continue

        dom, images, videos, title = extract(body)
        d = os.path.join(args.out, slug)
        imgdir = os.path.join(d, "images")
        os.makedirs(imgdir, exist_ok=True)

        saved = []
        for n, iu in enumerate(images, 1):
            fn = os.path.basename(urllib.parse.urlsplit(iu).path)
            fn = re.sub(r"[^A-Za-z0-9._-]+", "_", fn)
            out = os.path.join(imgdir, f"{n:02d}_{fn}")
            try:
                data = fetch(to_fetch_url(iu), tries=2)
                with open(out, "wb") as fh:
                    fh.write(data)
                saved.append({"order": n, "file": f"images/{n:02d}_{fn}", "src": iu})
            except Exception as e:
                saved.append({"order": n, "file": None, "src": iu, "error": str(e)})
            time.sleep(0.15)

        meta = {"source_url": loc, "fetch_url": furl, "slug": slug, "title": title,
                "column_id": dom, "images": saved, "videos": videos,
                "description_text": strip_text(body)}
        with open(os.path.join(d, "meta.json"), "w", encoding="utf-8") as fh:
            json.dump(meta, fh, ensure_ascii=False, indent=2)
        with open(os.path.join(d, "page.html"), "wb") as fh:
            fh.write(body.encode("latin-1"))

        rows.append({"legacy_url": loc, "slug": slug, "title": title, "column": dom or "",
                     "n_images": len([s for s in saved if s["file"]]),
                     "n_videos": len(videos),
                     "videos": " ".join(v["id"] for v in videos), "status": "ok"})
        print(f"[{i}/{len(products)}] {slug}: {rows[-1]['n_images']} imgs, {len(videos)} vids")
        time.sleep(args.delay)

    with open(manifest_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["legacy_url", "slug", "title", "column",
                                           "n_images", "n_videos", "videos", "status"])
        w.writeheader()
        w.writerows(rows)

    ok = sum(1 for r in rows if r["status"] == "ok")
    imgs = sum(r["n_images"] for r in rows)
    vids = sum(r["n_videos"] for r in rows)
    print(f"\nDone: {ok}/{len(rows)} pages, {imgs} images, {vids} videos. Manifest: {manifest_path}")

if __name__ == "__main__":
    main()
