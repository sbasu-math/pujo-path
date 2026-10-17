/* ============================================================
   Pujo Path — live data services (all free / open endpoints)
   • Routing:   OSRM via routing.openstreetmap.de (foot / car / bike)
   • POIs:      OpenStreetMap Overpass API (restaurants, hospitals, metro…)
   • Search:    Nominatim
   • Weather:   Open-Meteo
   • Traffic:   TomTom Traffic Flow + Incidents (optional free key)
   ============================================================ */
(function () {
  const S = (window.SVC = {});

  /* ---------- geo helpers ---------- */
  S.dist = function (a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  S.fmtDist = (m) => (m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(m < 10000 ? 1 : 0) + " km");
  S.fmtDur = function (s) {
    const m = Math.round(s / 60);
    if (m < 60) return Math.max(1, m) + " min";
    return Math.floor(m / 60) + " h " + (m % 60 ? (m % 60) + " m" : "");
  };
  S.walkSecs = (m) => (m * 1.3) / 1.25; // street-factor 1.3, crowd walking pace 1.25 m/s

  /* ---------- tiny cache (session + optional local) ---------- */
  function cacheGet(key, ttl, local) {
    try {
      const st = local ? localStorage : sessionStorage;
      const v = JSON.parse(st.getItem("pp:" + key) || "null");
      if (v && Date.now() - v.t < ttl) return v.d;
    } catch (e) {}
    return null;
  }
  function cacheSet(key, d, local) {
    try { (local ? localStorage : sessionStorage).setItem("pp:" + key, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
  }

  async function fetchJSON(url, opts = {}, timeout = 15000) {
    const ctl = new AbortController();
    const id = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(id); }
  }

  /* ---------- Overpass ---------- */
  const OVERPASS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  S.overpass = async function (q, key, ttl = 15 * 60e3, local = false) {
    const hit = key && cacheGet(key, ttl, local);
    if (hit) return hit;
    let lastErr;
    const t0 = Date.now();
    for (const ep of OVERPASS) {
      if (Date.now() - t0 > 14000) break; // keep the UI snappy; caller falls back
      try {
        const d = await fetchJSON(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 9000);
        const els = (d.elements || []).map((e) => ({
          id: e.type + "/" + e.id,
          ll: e.lat != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null,
          tags: e.tags || {}
        })).filter((e) => e.ll);
        if (key && els.length) cacheSet(key, els, local);
        return els;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("Overpass unavailable");
  };

  /* Fallback POI source: Nominatim structured amenity search (also OSM data).
     Sequential, ~1 req/s, per Nominatim usage policy. */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  S.nominatimPOI = async function (ll, radius, amenities, key) {
    const hit = key && cacheGet(key, 15 * 60e3);
    if (hit) return hit;
    const dLat = radius / 111320, dLng = radius / (111320 * Math.cos(ll[0] * Math.PI / 180));
    const vb = [ll[1] - dLng, ll[0] + dLat, ll[1] + dLng, ll[0] - dLat].map((v) => v.toFixed(5)).join(",");
    const out = [], seen = new Set();
    for (let i = 0; i < amenities.length; i++) {
      if (i) await sleep(1100);
      try {
        const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ amenity: amenities[i], format: "jsonv2", limit: "40", viewbox: vb, bounded: "1", extratags: "1", "accept-language": "en" });
        const d = await fetchJSON(url, {}, 10000);
        d.forEach((e) => {
          const id = e.osm_type + "/" + e.osm_id;
          if (seen.has(id)) return; seen.add(id);
          const tags = Object.assign({ name: e.name }, e.extratags || {});
          tags[e.category === "shop" ? "shop" : "amenity"] = e.type;
          out.push({ id, ll: [+e.lat, +e.lon], tags });
        });
      } catch (e) {}
    }
    if (key && out.length) cacheSet(key, out);
    return out;
  };

  /* Start Overpass; if it hasn't answered in `wait` ms (public servers are often
     saturated during Pujo), start the Nominatim fallback too and take whichever lands first. */
  function withFallback(primary, fallback, wait = 4500) {
    return new Promise((resolve, reject) => {
      let done = false, fbStarted = false, fails = 0;
      const ok = (v) => { if (!done && v && v.length) { done = true; resolve(v); } else fail(); };
      const fail = () => { if (++fails >= 2 && !done) reject(new Error("POI sources unavailable")); else startFb(); };
      const startFb = () => { if (fbStarted || done) return; fbStarted = true; fallback().then(ok, fail); };
      primary().then(ok, fail);
      setTimeout(startFb, wait);
    });
  }

  const k = (ll) => ll[0].toFixed(3) + "," + ll[1].toFixed(3);

  S.food = function (ll, radius = 900) {
    const a = `(around:${radius},${ll[0]},${ll[1]})`;
    const q = `[out:json][timeout:25];(
      nwr["amenity"~"^(restaurant|fast_food|cafe|food_court|ice_cream)$"]${a};
      nwr["shop"~"^(confectionery|sweets|pastry|bakery)$"]${a};
    );out center tags 150;`;
    return withFallback(() => S.overpass(q, "food:" + k(ll) + ":" + radius),
      () => S.nominatimPOI(ll, radius, ["restaurant", "fast_food", "cafe", "sweet shop"], "nfood:" + k(ll)));
  };

  S.emergencyPOIs = function (ll, radius = 3500) {
    const a = `(around:${radius},${ll[0]},${ll[1]})`;
    const q = `[out:json][timeout:25];(
      nwr["amenity"="hospital"]${a};
      nwr["amenity"="police"]${a};
      nwr["amenity"="pharmacy"](around:1200,${ll[0]},${ll[1]});
      nwr["amenity"="clinic"](around:1500,${ll[0]},${ll[1]});
      nwr["amenity"="toilets"](around:1000,${ll[0]},${ll[1]});
      nwr["amenity"="atm"](around:800,${ll[0]},${ll[1]});
      nwr["amenity"="drinking_water"](around:800,${ll[0]},${ll[1]});
    );out center tags 200;`;
    return withFallback(() => S.overpass(q, "sos:" + k(ll)),
      () => S.nominatimPOI(ll, radius, ["hospital", "police", "pharmacy", "toilets"], "nsos:" + k(ll)));
  };

  S.metroStations = function () {
    const bb = "22.40,88.22,22.72,88.56";
    const q = `[out:json][timeout:30];(
      node["railway"="station"]["station"="subway"](${bb});
      node["railway"="station"]["network"~"Metro",i](${bb});
      node["public_transport"="station"]["subway"="yes"](${bb});
    );out body;`;
    return S.overpass(q, "metro:v2", 7 * 864e5, true);
  };

  /* ---------- OSRM ---------- */
  const OSRM = (p) => `https://routing.openstreetmap.de/routed-${p}`;
  const coordStr = (pts) => pts.map((p) => p[1].toFixed(6) + "," + p[0].toFixed(6)).join(";");

  S.route = async function (profile, pts) {
    const url = `${OSRM(profile)}/route/v1/driving/${coordStr(pts)}?overview=full&geometries=geojson&steps=true&alternatives=false`;
    const d = await fetchJSON(url, {}, 20000);
    if (d.code !== "Ok" || !d.routes.length) throw new Error(d.message || "No route");
    return d.routes[0];
  };

  S.trip = async function (profile, pts) {
    const url = `${OSRM(profile)}/trip/v1/driving/${coordStr(pts)}?source=first&roundtrip=false&destination=any&overview=full&geometries=geojson&steps=true`;
    const d = await fetchJSON(url, {}, 25000);
    if (d.code !== "Ok") throw new Error(d.message || "No trip");
    return d;
  };

  S.table = async function (profile, from, tos) {
    const pts = [from].concat(tos);
    const dest = tos.map((_, i) => i + 1).join(";");
    const url = `${OSRM(profile)}/table/v1/driving/${coordStr(pts)}?sources=0&destinations=${dest}&annotations=duration,distance`;
    const d = await fetchJSON(url, {}, 15000);
    if (d.code !== "Ok") throw new Error("table failed");
    return { durations: d.durations[0], distances: d.distances ? d.distances[0] : null };
  };

  const ARROWS = { left: "⬅️", right: "➡️", "sharp left": "↩️", "sharp right": "↪️", "slight left": "↖️", "slight right": "↗️", straight: "⬆️", uturn: "🔄" };
  S.stepText = function (st) {
    const m = st.maneuver || {}, mod = m.modifier || "", road = st.name ? ` onto <b>${st.name}</b>` : "";
    const on = st.name ? ` on <b>${st.name}</b>` : "";
    let txt, ic = ARROWS[mod] || "⬆️";
    switch (m.type) {
      case "depart": txt = `Head ${m.bearing_after != null ? compass(m.bearing_after) : ""}${on}`; ic = "🚶"; break;
      case "arrive": txt = "Arrive at your destination" + (mod && mod !== "straight" ? `, on the ${mod}` : ""); ic = "🛕"; break;
      case "turn": case "end of road": txt = `Turn ${mod}${road}`; break;
      case "continue": case "new name": txt = `Continue ${mod && mod !== "straight" ? mod : "straight"}${on}`; break;
      case "roundabout": case "rotary": txt = `At the roundabout take exit ${m.exit || ""}${road}`; ic = "🔁"; break;
      case "fork": txt = `Keep ${mod}${road}`; break;
      case "merge": txt = `Merge ${mod}${road}`; break;
      case "on ramp": txt = `Take the ramp${road}`; break;
      case "off ramp": txt = `Take the exit${road}`; break;
      default: txt = `${cap(m.type || "Continue")} ${mod}${road}`;
    }
    return { txt, ic };
  };
  function compass(b) { return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(b / 45) % 8]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- Nominatim search ---------- */
  S.search = async function (q) {
    const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
      q, format: "json", limit: "6", viewbox: "88.22,22.72,88.56,22.40", bounded: "1", "accept-language": "en"
    });
    return fetchJSON(url, { headers: { Accept: "application/json" } }, 10000);
  };
  S.reverse = async function (ll) {
    const key = "rev:" + k(ll);
    const hit = cacheGet(key, 10 * 60e3);
    if (hit) return hit;
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat=${ll[0]}&lon=${ll[1]}&accept-language=en`;
    const d = await fetchJSON(url, {}, 10000);
    const a = d.address || {};
    const out = a.neighbourhood || a.suburb || a.quarter || a.road || a.city_district || a.city || "your location";
    cacheSet(key, out);
    return out;
  };

  /* ---------- Weather (Open-Meteo) ---------- */
  S.weather = async function (ll) {
    const url = "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
      latitude: ll[0].toFixed(3), longitude: ll[1].toFixed(3),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "sunrise,sunset,precipitation_probability_max",
      timezone: "Asia/Kolkata", forecast_days: "2"
    });
    return fetchJSON(url, {}, 12000);
  };
  S.wmo = function (c, day = 1) {
    if (c === 0) return [day ? "☀️" : "🌙", "Clear"];
    if (c <= 2) return [day ? "🌤️" : "☁️", "Partly cloudy"];
    if (c === 3) return ["☁️", "Overcast"];
    if (c <= 48) return ["🌫️", "Hazy / fog"];
    if (c <= 57) return ["🌦️", "Drizzle"];
    if (c <= 67) return ["🌧️", "Rain"];
    if (c <= 77) return ["🌨️", "Snow"];
    if (c <= 82) return ["🌧️", "Rain showers"];
    return ["⛈️", "Thunderstorm"];
  };

  /* ---------- TomTom (optional key) ---------- */
  S.tomtomKey = () => { try { return localStorage.getItem("pp:tomtom") || ""; } catch (e) { return ""; } };
  S.setTomtomKey = (v) => { try { v ? localStorage.setItem("pp:tomtom", v) : localStorage.removeItem("pp:tomtom"); } catch (e) {} };
  S.tomtomFlowUrl = (key) => `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}&tileSize=256`;
  S.incidents = async function (key) {
    const fields = "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,roadNumbers}}}";
    const url = "https://api.tomtom.com/traffic/services/5/incidentDetails?" + new URLSearchParams({
      key, bbox: "88.22,22.40,88.56,22.72", fields, language: "en-GB", timeValidityFilter: "present"
    });
    const d = await fetchJSON(url, {}, 15000);
    return d.incidents || [];
  };
  S.INCIDENT_CAT = { 0: "Unknown", 1: "Accident", 2: "Fog", 3: "Dangerous conditions", 4: "Rain", 5: "Ice", 6: "Jam", 7: "Lane closed", 8: "Road closed", 9: "Road works", 10: "Wind", 11: "Flooding", 14: "Broken-down vehicle" };

  /* ---------- Crowd estimate (heuristic, clearly labelled) ----------
     Based on the well-known Kolkata pattern: crowds swell after sunset,
     peak 8 pm–1 am, stay high till ~3 am on Saptami–Navami, and are lowest
     between 6 am and noon. Scaled by pandal tier and puja day. */
  S.ist = (d = new Date()) => new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
  S.crowd = function (tier, date = new Date()) {
    date = S.ist(date);
    const h = date.getHours() + date.getMinutes() / 60;
    const curve = [0.55, 0.5, 0.42, 0.3, 0.18, 0.12, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3, 0.35, 0.38, 0.4, 0.45, 0.52, 0.62, 0.78, 0.9, 1, 1, 0.95, 0.78];
    const i = Math.floor(h) % 24, f = h - Math.floor(h);
    let v = curve[i] * (1 - f) + curve[(i + 1) % 24] * f;
    const iso = isoDate(date);
    const day = (PUJO.DAYS.find((d) => d.date === iso) || {}).key;
    const dayMul = { shashthi: 0.75, saptami: 1, ashtami: 1.1, navami: 1.05, dashami: 0.6 }[day] || 0.45;
    v = v * dayMul * (0.55 + tier * 0.17);
    return Math.max(0, Math.min(1, v));
  };
  S.crowdLabel = (v) => (v < 0.35 ? ["Light", "crowd-low"] : v < 0.65 ? ["Busy", "crowd-med"] : ["Packed", "crowd-high"]);
  function isoDate(d) { // d is already IST-shifted wall-clock
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  S.isoDate = isoDate;
})();
