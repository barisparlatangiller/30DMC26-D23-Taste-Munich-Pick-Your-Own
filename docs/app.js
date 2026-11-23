/* Day 23 · Pick your own Munich */
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const K = {
  berries: { name: "Berries & fruit to pick", c: "#c8504e" },
  flowers: { name: "Flowers to cut", c: "#b0679f" },
  pumpkins: { name: "Pumpkins", c: "#d98b3a" },
  plots: { name: "Vegetable plots (Krautgärten)", c: "#5f8f4e" }
};
const CROP = { strawberry: "strawberries", raspberry: "raspberries", blueberry: "blueberries", currant: "currants", cherry: "cherries", vegetables: "vegetables",
  pumpkin: "pumpkins", "maize maze": "maize maze", apple: "apples", flowers: "flowers", berries: "berries" };
const MON = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PREC = { address: "at the address given by the source", crossing: "at the street corner given by the source", street: "on the street named by the source (the field lies along it)",
  locality: "in the village or district named by the source (exact field not published)", osm: "as mapped in OpenStreetMap" };
const S = { month: 0, kinds: { berries: 1, flowers: 1, pumpkins: 1, plots: 1 }, shops: 0, sel: null };
const NOW = new Date().getMonth() + 1;
let map, P, SH, ST;

function fc() {
  return { type: "FeatureCollection", features: P.map(p => ({ type: "Feature", id: p._i, geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    properties: { i: p._i, kind: p.kind, open: S.month === 0 || p.m.includes(S.month) ? 1 : 0, show: S.kinds[p.kind] ? 1 : 0, osm: p.src === "osm" ? 1 : 0 } })) };
}
function restyle() {
  if (!map.getSource("p")) return;
  map.getSource("p").setData(fc());
  map.setLayoutProperty("shops", "visibility", S.shops ? "visible" : "none");
  const n = P.filter(p => p.kind !== "plots" && S.kinds[p.kind] && (S.month === 0 || p.m.includes(S.month))).length;
  $("#mlabel").textContent = S.month ? `${MONL[S.month - 1]} · ${n} to pick` : "all year";
  $$("#cal button").forEach(b => b.classList.toggle("on", +b.dataset.m === S.month));
  $("#calnote").textContent = S.month && n === 0 ? "Nothing to pick this month. The season starts with tulips in April and strawberries in late May." : "Bars: places open in each month (vegetable plots not counted). Click a month to filter; click again for all year.";
}
function cal() {
  const c = m => P.filter(p => p.kind !== "plots" && p.m.includes(m)).length, mx = Math.max(...MON.map((_, i) => c(i + 1)));
  $("#cal").innerHTML = MON.map((l, i) => `<button data-m="${i + 1}" class="${i + 1 === NOW ? "now" : ""}" title="${MONL[i]}: ${c(i + 1)} places"><i style="height:${Math.max(2, c(i + 1) / mx * 62)}px"></i><span>${l}</span></button>`).join("");
  $$("#cal button").forEach(b => b.onclick = () => { S.month = S.month === +b.dataset.m ? 0 : +b.dataset.m; restyle(); });
}
function kinds() {
  $("#kinds").innerHTML = Object.entries(K).map(([k, v]) => `<label style="--c:${v.c}"><input type="checkbox" data-k="${k}" checked><i class="sw"></i>${v.name}<span class="n">${P.filter(p => p.kind === k).length}</span></label>`).join("");
  $$("#kinds input").forEach(c => c.onchange = () => { S.kinds[c.dataset.k] = c.checked ? 1 : 0; restyle(); });
  $("#shops").onchange = e => { S.shops = e.target.checked ? 1 : 0; restyle(); };
}
function kpis() {
  const pick = P.filter(p => p.kind !== "plots").length;
  $("#kpis").innerHTML = [
    [pick, "places to pick or cut yourself"], [P.filter(p => p.kind === "berries").length, "berry & fruit fields"],
    [P.filter(p => p.kind === "flowers").length, "flower fields"], [ST.osm_pick_your_own_tag, "OSM features tagged pick_your_own"],
    [`${ST.open_by_month[6]} → ${ST.open_by_month[11]}`, "open in June → open in November"], [SH.length, "farm shops in OSM (buy, don't pick)"]
  ].map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join("");
}
function legend() {
  $("#legend").innerHTML = `<div style="font-weight:600;margin-bottom:4px">Pick your own</div>` +
    Object.values(K).map(v => `<div style="display:flex;align-items:center;gap:7px;margin:2px 0"><i style="width:11px;height:11px;border-radius:50%;background:${v.c};display:inline-block"></i>${v.name}</div>`).join("") +
    `<div style="display:flex;align-items:center;gap:7px;margin:4px 0 0;color:#8a929c"><i style="width:11px;height:11px;border-radius:50%;border:2px solid #8a929c;display:inline-block;box-sizing:border-box"></i>found only by name in OpenStreetMap</div>` +
    `<div style="display:flex;align-items:center;gap:7px;margin:2px 0;color:#8a929c"><i style="width:14px;height:0;border-top:2px dashed #1f2328;display:inline-block"></i>City of Munich</div>`;
}
function card(i) {
  const p = P[i];
  if (!p) { $("#card").classList.add("hide"); return; }
  const k = K[p.kind];
  $("#card").innerHTML = `<button class="x" aria-label="close">×</button><h3>${p.name}</h3><div class="op">${p.op ? p.op + " · " : ""}${p.where || ""}</div>
    <div class="crops">${p.crops.map(c => `<b>${CROP[c] || c}</b>`).join("")}</div>
    <div class="months" style="--c:${k.c}">${MON.map((_, j) => `<span class="${p.m.includes(j + 1) ? "on" : ""}"></span>`).join("")}</div>
    <div class="ml">${MON.map(l => `<span>${l}</span>`).join("")}</div>
    <p class="fine" style="margin:8px 0 4px">Location: ${PREC[p.prec] || p.prec}.${p.kind === "plots" ? " Plots are rented for a season (May–Nov); bookings for 2027 close end of November." : " Fields move year to year: check the farm's website for today's open fields."}</p>
    ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> · ` : ""}<span class="fine">Source: ${p.ref}</span>`;
  $("#card").classList.remove("hide");
  $("#card .x").onclick = () => select(null);
}
function select(i) {
  if (S.sel != null) map.setFeatureState({ source: "p", id: S.sel }, { sel: false });
  S.sel = i; if (i != null) map.setFeatureState({ source: "p", id: i }, { sel: true });
  card(i);
}
async function init() {
  const j = u => fetch(u).then(r => r.json());
  [P, SH, ST] = await Promise.all([j("data/places.json"), j("data/farmshops.json"), j("data/stats.json")]);
  P.forEach((p, i) => p._i = i);
  map = new maplibregl.Map({ container: "map", style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", center: [11.53, 48.12], zoom: 9.3, attributionControl: { compact: true } });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  await new Promise(r => map.on("load", r));
  const sym = map.getStyle().layers.find(l => l.type === "symbol")?.id;
  map.addSource("city", { type: "geojson", data: "data/muenchen.geojson" });
  map.addLayer({ id: "city-f", type: "fill", source: "city", paint: { "fill-color": "#1f2328", "fill-opacity": 0.025 } }, sym);
  map.addLayer({ id: "city", type: "line", source: "city", paint: { "line-color": "#1f2328", "line-width": 1.6, "line-dasharray": [3, 2], "line-opacity": 0.55 } }, sym);
  map.addSource("shops", { type: "geojson", data: { type: "FeatureCollection", features: SH.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lon, s.lat] }, properties: { n: s.n, sb: s.sb } })) } });
  map.addLayer({ id: "shops", type: "circle", source: "shops", layout: { visibility: "none" }, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2, 14, 5], "circle-color": "#9aa0a6", "circle-opacity": 0.7, "circle-stroke-color": "#fff", "circle-stroke-width": 0.8 } });
  map.addSource("p", { type: "geojson", data: fc() });
  const col = ["match", ["get", "kind"], "berries", K.berries.c, "flowers", K.flowers.c, "pumpkins", K.pumpkins.c, K.plots.c];
  map.addLayer({ id: "halo", type: "circle", source: "p", filter: ["==", ["get", "show"], 1], paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 9, 14, 22], "circle-color": col, "circle-blur": 0.8,
    "circle-opacity": ["case", ["==", ["get", "open"], 1], 0.28, 0] } });
  map.addLayer({ id: "pts", type: "circle", source: "p", filter: ["==", ["get", "show"], 1], paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, ["case", ["boolean", ["feature-state", "sel"], false], 8, 4.5], 14, ["case", ["boolean", ["feature-state", "sel"], false], 13, 9]],
    "circle-color": ["case", ["==", ["get", "osm"], 1], "#ffffff", col], "circle-stroke-color": ["case", ["==", ["get", "osm"], 1], col, "#ffffff"],
    "circle-stroke-width": ["case", ["boolean", ["feature-state", "sel"], false], 3.5, ["==", ["get", "osm"], 1], 2.4, 1.4],
    "circle-opacity": ["case", ["==", ["get", "open"], 1], 1, 0.12], "circle-stroke-opacity": ["case", ["==", ["get", "open"], 1], 1, 0.15] } });
  const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
  map.on("mousemove", "pts", e => { map.getCanvas().style.cursor = "pointer"; const p = P[e.features[0].properties.i]; pop.setLngLat(e.lngLat).setHTML(`<b>${p.name}</b><br>${p.crops.map(c => CROP[c] || c).join(", ")}`).addTo(map); });
  map.on("mouseleave", "pts", () => { map.getCanvas().style.cursor = ""; pop.remove(); });
  map.on("click", "pts", e => select(e.features[0].properties.i));
  map.on("mousemove", "shops", e => { map.getCanvas().style.cursor = "pointer"; pop.setLngLat(e.lngLat).setHTML(`<b>${e.features[0].properties.n}</b><br>farm shop (OpenStreetMap)`).addTo(map); });
  map.on("mouseleave", "shops", () => { map.getCanvas().style.cursor = ""; pop.remove(); });
  map.fitBounds([[11.12, 47.93], [11.95, 48.27]], { padding: 30 });
  kpis(); cal(); kinds(); legend(); restyle();
  const qs = new URLSearchParams(location.search); if (qs.get("m")) { S.month = +qs.get("m"); restyle(); }
  window.APP = { S, restyle, select, map: () => map }; window.READY = true;
}
init();
