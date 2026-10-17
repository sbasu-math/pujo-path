# Pujo Path · পুজো পথ — Kolkata Durga Puja 2026

A live, installable (PWA) guide for pandal hopping in Kolkata. It has no build step: just static files.

## Run locally
```bash
python3 -m http.server 8770 --directory pujo-path
```
Open http://localhost:8770. Geolocation needs `localhost` or HTTPS.
To try it from outside Kolkata, add `?at=22.5180,88.3530` to the URL to simulate a location.

## Share it
Deploy the folder to any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, Vercel).
Live location only works over HTTPS.

## Features & data sources
| Feature | Source | Live? |
|---|---|---|
| 58 pandals, 7 circuits, 56 Metro stations | `js/data.js`, geocoded from OpenStreetMap | static, verified Oct 2026 |
| Your location, heading, live re-routing | Browser Geolocation API | ✅ |
| Walk / cab / cycle directions, nearest puja by real walking time, circuit optimiser | OSRM (routing.openstreetmap.de) | ✅ |
| Food stops, hospitals, police, pharmacies, toilets | OpenStreetMap Overpass, with Nominatim as fallback | ✅ |
| Weather and hourly rain chance | Open-Meteo | ✅ |
| Live traffic flow and real road closures | TomTom Traffic API (paste a free key in the Traffic tab) | ✅ with key |
| Puja advisory zones | Recurring Kolkata Police restriction pattern | advisory |
| Crowd levels | Time-of-day × puja day × pandal popularity heuristic | estimate |

## Before wider release, verify
- Pandals marked `approx` in `data.js` (about 14). They show an on-screen warning.
- 2026 themes. These come from pre-Puja press and some sources disagree.
- The Lalbazar control-room number and the 2026 Metro timings.
- Public Overpass servers are often overloaded during Pujo. For heavy traffic, self-host Overpass or proxy it.
