"""
Day 23 · Taste · Munich pick-your-own: geocode the researched places and pull OpenStreetMap features (runs in GitHub Actions).
  · address / street / locality → Nominatim (1 request per second, as its usage policy asks)
  · crossing of two streets → Overpass: the node shared by both named ways, within 4 km of the town
  · OSM: everything tagged pick_your_own=yes (or a self-picking hint) in the Munich region
  · the city boundary of München (Nominatim polygon)
  python pipeline/geocode.py data/places.csv out/
"""
import sys, csv, json, time, os
import requests

S = requests.Session(); S.headers["User-Agent"] = "30DayMapChallenge-Day23 (github.com/barisparlatangiller)"
NOM = "https://nominatim.openstreetmap.org/search"
OVP = "https://overpass-api.de/api/interpreter"
BBOX = (47.85, 11.0, 48.45, 12.15)


def nom(**p):
    time.sleep(1.1)
    p.update(format="jsonv2", limit=1, countrycodes="de")
    r = S.get(NOM, params=p, timeout=60)
    j = r.json() if r.ok else []
    return j[0] if j else None


def ovp(q):
    for k in range(3):
        r = S.post(OVP, data={"data": q}, timeout=300)
        if r.ok:
            return r.json()
        print("overpass", r.status_code, flush=True); time.sleep(20)
    return {"elements": []}


def main(src, out):
    os.makedirs(out, exist_ok=True)
    rows = list(csv.DictReader(open(src, encoding="utf-8")))
    res = []
    for r in rows:
        town = r["town"]; city = town.split("-")[0] if town.startswith("München") else town.split(" (")[0]
        FIX = {"Wagenhofen (Egenhofen)": "Wagenhofen, Egenhofen, Fürstenfeldbruck", "Frohnloh (Gauting)": "Frohnloh, Gauting, Starnberg"}
        t = (nom(q=FIX[town]) if town in FIX else None) or nom(q=f"{town.replace('München-', '')}, {'München' if town.startswith('München') else ''} Bayern") or nom(q=town)
        lat = lon = None; how = "none"
        if r["precision"] == "crossing" and t:
            q = f'[out:json][timeout:60];way(around:4000,{t["lat"]},{t["lon"]})["name"="{r["q1"]}"]->.a;way(around:4000,{t["lat"]},{t["lon"]})["name"="{r["q2"]}"]->.b;node(w.a)(w.b);out;'
            el = ovp(q).get("elements", [])
            if el:
                lat, lon, how = el[0]["lat"], el[0]["lon"], "crossing"
        if lat is None and r["precision"] in ("address", "street", "crossing"):
            g = nom(street=r["q1"], city=city if not town.startswith("München") else "München", country="Deutschland")
            if g is None and t:
                g = nom(q=f'{r["q1"]}, {town}')
            if g:
                lat, lon, how = float(g["lat"]), float(g["lon"]), ("address" if r["precision"] == "address" else "street")
        if lat is None and t:
            lat, lon, how = float(t["lat"]), float(t["lon"]), "locality"
        print(r["id"], how, lat, lon, flush=True)
        res.append({**r, "lat": lat, "lon": lon, "geocoded": how})
    json.dump(res, open(f"{out}/places_geocoded.json", "w"), ensure_ascii=False, indent=1)
    s, w, n, e = BBOX
    q = f"""[out:json][timeout:180];(
      nwr["pick_your_own"]({s},{w},{n},{e});
      nwr["produce"]["shop"="farm"]({s},{w},{n},{e});
      nwr["shop"="farm"]({s},{w},{n},{e});
      nwr["landuse"="orchard"]["access"~"yes|permissive"]({s},{w},{n},{e});
      nwr["name"~"[Ss]elbstpfl|[Ss]elbsternte|[Ss]elber schneiden|Blumen zum Selbst|Erdbeerfeld|Erdbeer",i]({s},{w},{n},{e});
    );out center tags;"""
    o = ovp(q)
    json.dump(o, open(f"{out}/osm_farms.json", "w"), ensure_ascii=False)
    print("osm elements", len(o.get("elements", [])))
    # light basemap for stills / film: motorways and main roads, rail, rivers and lakes, forests
    q = f"""[out:json][timeout:240];(
      way["highway"~"^(motorway|trunk|primary)$"]({s},{w},{n},{e});
      way["railway"="rail"]["service"!~"."]({s},{w},{n},{e});
      way["waterway"="river"]({s},{w},{n},{e});
      nwr["natural"="water"]["water"~"lake|reservoir"]({s},{w},{n},{e});
    );out geom;"""
    json.dump(ovp(q), open(f"{out}/basemap.json", "w"))
    b = S.get(NOM, params={"q": "München", "format": "geojson", "polygon_geojson": 1, "limit": 1, "featuretype": "city"}, timeout=60).json()
    json.dump(b, open(f"{out}/muenchen_boundary.geojson", "w"))
    print("boundary", b["features"][0]["geometry"]["type"] if b.get("features") else None)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
