# Pick your own Munich

**#30DayMapChallenge 2026 · Day 23 · Taste**

**Where around Munich can you pick your own strawberries, cut your own flowers or grow your own vegetables, and when?**

👉 **Live map:** https://barisparlatangiller.github.io/30DMC26-D23-Taste-Munich-Pick-Your-Own/

- Pick-your-own fields, flower fields and pumpkin stands from farm websites and Munich city guides (2026 season), plus the city's Krautgärten (rented vegetable plots).
- OpenStreetMap: no feature in the region carries `pick_your_own=yes`; self-picking places are only found by their names. Farm shops (`shop=farm`) as context.
- Month filter: almost everything is open May–July; from November to March there is nothing to pick.

Data: © OpenStreetMap contributors (ODbL) · farm websites and city guides (see the map's sources) · geocoding: Nominatim · basemap © CARTO.
Pipeline: `data/places.csv` → `.github/workflows/fetch.yml` (`pipeline/geocode.py`) → `pipeline/build.py` → `docs/`.
