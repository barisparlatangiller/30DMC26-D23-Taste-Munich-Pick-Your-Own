"""
Day 23 · Taste · Munich pick-your-own: merge the researched places with OpenStreetMap → docs/data/.
  · researched fields (data/places.csv, geocoded in Actions): farm, crops, months, link, how exactly we know the location
  · OSM features whose NAME says you can pick/cut yourself (no feature in the region carries the pick_your_own tag);
    dropped when a researched place of the same kind lies within 400 m
  · OSM farm shops and vending huts (shop=farm) as context: buy at the farm, not pick
  python pipeline/build.py
"""
import json, re, math, csv
from pathlib import Path

B, W = Path("build"), Path("docs/data"); W.mkdir(parents=True, exist_ok=True)
KIND = {"pick": "berries", "flowers": "flowers", "pumpkin": "pumpkins", "plot": "plots"}
SEASON = {"berries": [5, 6, 7, 8, 9], "flowers": [4, 5, 6, 7, 8, 9, 10], "pumpkins": [9, 10], "plots": [5, 6, 7, 8, 9, 10, 11], "apples": [9, 10]}
RX = re.compile(r"selbst\s*pfl|selber\s*pfl|selbstpfl|selbsternte|selber\s*schneid|selbst\s*schneid|zum\s*selbst|erdbeerfeld|blumenfeld|apfelfeld|beerenfeld|kürbisfeld", re.I)


def hav(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dl = math.radians(b[1] - a[1])
    return 2 * 6371000 * math.asin(math.sqrt(math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def months(s):
    a, b = [int(x) for x in s.split("-")]
    return list(range(a, b + 1))


def main():
    P = json.load(open(B / "places_geocoded.json"))
    out = []
    for r in P:
        if r["lat"] is None:
            print("no location:", r["id"]); continue
        crops = r["crops"].split(";")
        k = KIND[r["kind"]]
        out.append({"id": r["id"], "name": r["label"], "op": r["operator"], "kind": k, "crops": crops, "m": months(r["months"]),
                    "lat": round(float(r["lat"]), 5), "lon": round(float(r["lon"]), 5), "where": r["town"],
                    "prec": r["geocoded"], "url": r["url"] or None, "src": "research", "ref": r["source"]})
    osm = json.load(open(B / "osm_farms.json"))["elements"]
    shops, extra = [], 0
    for e in osm:
        t = e.get("tags", {}); nm = t.get("name", "")
        lat = e.get("lat") or e.get("center", {}).get("lat"); lon = e.get("lon") or e.get("center", {}).get("lon")
        if lat is None:
            continue
        osmid = f'{e["type"]}/{e["id"]}'
        if RX.search(nm) or t.get("pick_your_own") == "yes":
            low = nm.lower()
            k = "flowers" if "blume" in low else "pumpkins" if "kürbis" in low else "berries"
            crops = ["flowers"] if k == "flowers" else ["pumpkin"] if k == "pumpkins" else (["apple"] if "apfel" in low else ["strawberry"] if "erdbeer" in low else ["berries"])
            if any(o["kind"] == k and hav((o["lat"], o["lon"]), (lat, lon)) < 400 for o in out):
                continue
            m = SEASON["apples"] if crops == ["apple"] else ([5, 6, 7] if crops == ["strawberry"] else SEASON[k])
            out.append({"id": "osm_" + osmid.replace("/", "_"), "name": nm, "op": t.get("operator") or t.get("brand") or "", "kind": k, "crops": crops, "m": m,
                        "lat": round(lat, 5), "lon": round(lon, 5), "where": t.get("addr:city") or t.get("addr:suburb") or "", "prec": "osm",
                        "url": t.get("website") or t.get("contact:website"), "src": "osm", "ref": f"OpenStreetMap {osmid}"})
            extra += 1
        elif t.get("shop") == "farm":
            shops.append({"n": nm or "Hofladen", "lat": round(lat, 5), "lon": round(lon, 5), "osm": osmid,
                          "sb": int(bool(re.search(r"selbstbedien|automat|hütte|hittn|kasse des vertrauens", nm, re.I) or t.get("self_service") == "yes"))})
    json.dump(out, open(W / "places.json", "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(shops, open(W / "farmshops.json", "w"), ensure_ascii=False, separators=(",", ":"))
    b = json.load(open(B / "muenchen_boundary.geojson"))
    json.dump(b, open(W / "muenchen.geojson", "w"), separators=(",", ":"))
    cnt = {k: sum(1 for o in out if o["kind"] == k) for k in SEASON if k != "apples"}
    bymonth = {m: sum(1 for o in out if m in o["m"] and o["kind"] != "plots") for m in range(1, 13)}
    inside = 0
    st = {"n": len(out), "kinds": cnt, "from_research": len(out) - extra, "from_osm_names": extra, "farmshops": len(shops),
          "selfservice": sum(s["sb"] for s in shops), "osm_pick_your_own_tag": sum(1 for e in osm if "pick_your_own" in e.get("tags", {})),
          "open_by_month": bymonth}
    json.dump(st, open(W / "stats.json", "w"), indent=1)
    print(json.dumps(st, indent=1))
    with open(W / "places.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["name", "operator", "kind", "crops", "months", "lat", "lon", "location_precision", "website", "source"])
        for o in out:
            w.writerow([o["name"], o["op"], o["kind"], ";".join(o["crops"]), f'{o["m"][0]}-{o["m"][-1]}', o["lat"], o["lon"], o["prec"], o["url"] or "", o["ref"]])


if __name__ == "__main__":
    main()
