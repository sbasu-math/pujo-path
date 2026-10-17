/* ============================================================
   Pujo Path — app
   ============================================================ */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PUJAS = PUJO.PUJAS, byId = Object.fromEntries(PUJAS.map((p) => [p.id, p]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pp:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("pp:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  const state = {
    me: null, acc: null, heading: null, outside: false, locDenied: false,
    visited: new Set(store.get("visited", [])),
    zone: "all", type: "all", profile: store.get("profile", "foot"),
    tab: "explore", prevTab: "explore",
    nav: null, foodAnchor: null, foodKind: "all", foodData: [],
    metro: [], weather: null, lastRevAt: null, selected: null
  };

  /* ================= Theme ================= */
  const root = document.documentElement;
  function isDark() {
    const t = root.getAttribute("data-theme");
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }
  const savedTheme = store.get("theme", null);
  if (savedTheme) root.setAttribute("data-theme", savedTheme);

  /* ================= Map ================= */
  const map = L.map("map", { zoomControl: false, minZoom: 11, maxBounds: L.latLngBounds(PUJO.BOUNDS).pad(0.3), worldCopyJump: false })
    .setView(PUJO.CENTER, 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, className: "base-tiles",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Routing <a href="https://routing.openstreetmap.de">FOSSGIS OSRM</a>'
  }).addTo(map);
  function applyTheme() {
    $("#btn-theme").textContent = isDark() ? "☀️" : "🌙";
    $('meta[name="theme-color"]').setAttribute("content", isDark() ? "#3a0607" : "#7a0f12");
  }
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  $("#btn-theme").onclick = () => { root.setAttribute("data-theme", isDark() ? "light" : "dark"); store.set("theme", root.getAttribute("data-theme")); applyTheme(); };

  map.on("zoomend", () => $("#map").classList.toggle("show-labels", map.getZoom() >= 16));

  /* ---------- Pandal markers ---------- */
  function pinSVG(color) {
    return `<svg viewBox="0 0 34 44" aria-hidden="true">
      <path d="M17 1C8.2 1 1 8 1 16.6 1 28 17 43 17 43s16-15 16-26.4C33 8 25.8 1 17 1z" fill="${color}" stroke="#f6d27a" stroke-width="2"/>
      <circle cx="17" cy="16.5" r="9.5" fill="#fff4dc"/>
      <path d="M17 9.5c2 2.6 2 6.4 0 9-2-2.6-2-6.4 0-9z" fill="#c1121f"/>
      <path d="M10.5 20.5q3.2-2.6 6.5 0M17 20.5q3.3-2.6 6.5 0" stroke="#2b1310" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    </svg>`;
  }
  const markers = {};
  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 46, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 16,
    iconCreateFunction: (c) => L.divIcon({ html: `<div class="cluster">${c.getChildCount()}</div>`, className: "marker-cluster-custom", iconSize: [44, 44] })
  });
  function pinIcon(p, hl) {
    const cls = ["pin", "t" + p.tier, state.visited.has(p.id) ? "visited" : "", hl ? "hl" : ""].join(" ");
    const s = p.tier === 3 ? [40, 52] : [34, 44];
    return L.divIcon({ html: `<div class="${cls}">${pinSVG(PUJO.ZONES[p.zone].color)}<span class="pin-label">${esc(p.name)}</span></div>`, className: "", iconSize: s, iconAnchor: [s[0] / 2, s[1]], popupAnchor: [0, -s[1] + 6] });
  }
  PUJAS.forEach((p) => {
    const m = L.marker(p.ll, { icon: pinIcon(p), title: p.name, riseOnHover: true });
    m.on("click", () => showDetail(p.id));
    markers[p.id] = m;
    cluster.addLayer(m);
  });
  map.addLayer(cluster);
  function refreshPin(id, hl) { markers[id].setIcon(pinIcon(byId[id], hl)); }
  let hlId = null;
  function highlight(id) { if (hlId && hlId !== id) refreshPin(hlId, false); hlId = id; if (id) refreshPin(id, true); }

  /* ---------- Other layers ---------- */
  const routeLayer = L.layerGroup().addTo(map);
  const poiLayer = L.layerGroup().addTo(map);
  const metroLayer = L.layerGroup();
  const heatLayer = L.layerGroup();
  const incidentLayer = L.layerGroup();
  let trafficTiles = null;
  const advisoryLayer = L.layerGroup(PUJO.ADVISORIES.map((a) => {
    const c = a.level === "high" ? "#d7262b" : "#d08a00";
    return L.circle(a.ll, { radius: a.r, color: c, weight: 1.5, dashArray: "6 6", fillColor: c, fillOpacity: 0.08 })
      .bindPopup(`<div class="pop-title">🚧 ${esc(a.name)}</div><div style="margin-top:4px">${esc(a.text)}</div><div class="muted" style="margin-top:6px;font-size:11px">Puja-time advisory zone · verify with Kolkata Traffic Police</div>`);
  })).addTo(map);

  /* ---------- Me marker ---------- */
  let meMarker = null, meCircle = null;
  function drawMe() {
    if (!state.me) return;
    const html = `<div class="me">${state.heading != null ? `<span class="heading" style="transform:rotate(${state.heading}deg)"></span>` : ""}</div>`;
    if (!meMarker) {
      meMarker = L.marker(state.me, { icon: L.divIcon({ html, className: "", iconSize: [22, 22] }), zIndexOffset: 1000, interactive: false }).addTo(map);
      meCircle = L.circle(state.me, { radius: state.acc || 30, color: "#1e88e5", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
    } else {
      meMarker.setLatLng(state.me);
      meMarker.setIcon(L.divIcon({ html, className: "", iconSize: [22, 22] }));
      meCircle.setLatLng(state.me).setRadius(state.acc || 30);
    }
  }

  /* ================= Utilities ================= */
  let toastT;
  function toast(msg, ms = 2800) {
    const t = $("#toast"); t.innerHTML = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms);
  }
  function origin() { return state.me && !state.outside ? state.me : null; }
  function anchor() { return origin() || [map.getCenter().lat, map.getCenter().lng]; }
  function gmaps(dest, from, mode, waypoints) {
    const u = new URL("https://www.google.com/maps/dir/");
    u.searchParams.set("api", "1");
    if (from) u.searchParams.set("origin", from.join(","));
    u.searchParams.set("destination", dest.join(","));
    u.searchParams.set("travelmode", { foot: "walking", car: "driving", bike: "bicycling" }[mode] || "walking");
    if (waypoints && waypoints.length) u.searchParams.set("waypoints", waypoints.map((w) => w.join(",")).join("|"));
    return u.toString();
  }
  function loader(txt) { return `<div class="loader"><span class="dhak-spin"></span>${esc(txt)}</div>`; }
  function crowdTag(p) { const v = SVC.crowd(p.tier); const [l, c] = SVC.crowdLabel(v); return `<span class="tag ${c}">● ${l} now</span>`; }
  function saveVisited() { store.set("visited", Array.from(state.visited)); }
  function toggleVisited(id) {
    if (state.visited.has(id)) state.visited.delete(id); else { state.visited.add(id); burst(18); toast(`✨ ${esc(byId[id].name)} added to your Pujo Passport`); }
    saveVisited(); refreshPin(id, hlId === id);
  }
  async function share(title, text, url) {
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url || text);
      toast("Link copied 📋");
    } catch (e) {}
  }
  const metroNear = (ll) => {
    if (!state.metro.length) return null;
    let best = null;
    state.metro.forEach((s) => { const d = SVC.dist(ll, s.ll); if (!best || d < best.d) best = { ...s, d }; });
    return best;
  };

  /* ================= Petals & dhak ================= */
  function burst(n = 30) {
    const box = $("#petals");
    for (let i = 0; i < n; i++) {
      const el = document.createElement("i");
      el.className = "petal" + (Math.random() < 0.3 ? " red" : "");
      el.style.left = Math.random() * 100 + "vw";
      el.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
      el.style.animationDuration = 3 + Math.random() * 3 + "s";
      el.style.animationDelay = Math.random() * 1.2 + "s";
      el.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
      box.appendChild(el);
      setTimeout(() => el.remove(), 7500);
    }
  }

  const Dhak = (() => {
    let ctx, timer, on = false, step = 0;
    // ta-dhin-ta-dhin | ta-ta-dhin-- (classic aagomoni-ish loop) ; 1 = bass "dhin", 2 = slap "ta", 3 = kansor
    const pat = [1, 0, 2, 0, 1, 0, 2, 2, 1, 0, 2, 0, 1, 2, 1, 0];
    const kansor = [3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 3, 0];
    function bass(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.5);
    }
    function slap(t) {
      const len = 0.12, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.8; g.gain.value = 0.7;
      s.buffer = buf; s.connect(f).connect(g).connect(ctx.destination); s.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      og.gain.setValueAtTime(0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(og).connect(ctx.destination); o.start(t); o.stop(t + 0.15);
    }
    function bell(t) {
      [2093, 2637, 3520].forEach((fq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = fq;
        g.gain.setValueAtTime(0.06 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.3);
      });
    }
    function tick() {
      const t = ctx.currentTime + 0.05;
      const a = pat[step % 16], b = kansor[step % 16];
      if (a === 1) bass(t); if (a === 2) slap(t); if (b === 3) bell(t);
      step++;
    }
    return {
      toggle() {
        on = !on;
        if (on) {
          ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
          ctx.resume(); step = 0; timer = setInterval(tick, 150);
        } else clearInterval(timer);
        return on;
      }
    };
  })();
  $("#btn-dhak").onclick = (e) => { const on = Dhak.toggle(); e.currentTarget.setAttribute("aria-pressed", on); if (on) { burst(14); toast("🥁 ঢাক বাজছে — dhak on"); } };

  /* ================= Day ribbon ================= */
  function pujaDay() {
    const now = SVC.ist(), iso = SVC.isoDate(now);
    const days = PUJO.DAYS.filter((d) => d.key !== "mahalaya");
    const idx = days.findIndex((d) => d.date === iso);
    const first = new Date(days[0].date + "T00:00:00"), today = new Date(iso + "T00:00:00");
    const diff = Math.round((first - today) / 864e5);
    return { now, iso, days, idx, before: idx < 0 && diff > 0 ? diff : 0, after: idx < 0 && diff <= 0 };
  }
  function renderRibbon() {
    const d = pujaDay();
    let html;
    if (d.idx >= 0) html = `<span class="dot"></span><span class="bn">${d.days[d.idx].bn}</span> · ${d.days[d.idx].en}`;
    else if (d.before) html = `🪔 Shashthi in ${d.before} day${d.before > 1 ? "s" : ""}`;
    else html = `<span class="bn">আসছে বছর আবার হবে</span>`;
    $("#day-chip").innerHTML = html;
  }

  /* ================= Location ================= */
  function startGeo() {
    // ?at=lat,lng simulates a position (for demos / testing from outside Kolkata)
    const at = new URLSearchParams(location.search).get("at");
    if (at && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(at)) {
      const [lat, lng] = at.split(",").map(Number);
      onPos({ coords: { latitude: lat, longitude: lng, accuracy: 15, heading: null } });
      setTimeout(() => toast("📍 Simulated location (?at=) — remove it from the URL to use GPS", 4000), 3000);
      return;
    }
    if (!("geolocation" in navigator)) { setLocChip("📍 Location not supported"); return; }
    navigator.geolocation.watchPosition(onPos, (err) => {
      state.locDenied = err.code === 1;
      setLocChip(state.locDenied ? "📍 Location blocked — tap to retry" : "📍 Can't get location", true);
      renderActive();
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  }
  let firstFix = true;
  function onPos(pos) {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    state.me = ll; state.acc = pos.coords.accuracy;
    if (pos.coords.heading != null && !isNaN(pos.coords.heading)) state.heading = pos.coords.heading;
    state.outside = SVC.dist(ll, PUJO.CENTER) > 45000;
    drawMe();
    if (state.outside) setLocChip("📍 You're outside Kolkata — city view", true);
    else if (!state.lastRevAt || SVC.dist(state.lastRevAt, ll) > 400) {
      state.lastRevAt = ll;
      SVC.reverse(ll).then((n) => setLocChip(`📍 ${esc(n)} · ±${Math.round(state.acc)} m`)).catch(() => setLocChip(`📍 ±${Math.round(state.acc)} m`));
    }
    if (firstFix) {
      firstFix = false;
      if (!state.outside) { map.flyTo(ll, 15, { duration: 1.2 }); loadWeather(ll); }
      else toast("You seem to be outside Kolkata. Directions will start from the map centre — or open this on your phone in the city.", 5000);
      renderActive();
    }
    if (state.nav) navUpdate();
  }
  function setLocChip(html, warn) { const c = $("#loc-chip"); c.innerHTML = html; c.classList.toggle("muted", !!warn); }
  $("#loc-chip").onclick = () => { if (state.locDenied) toast("Allow location for this site in your browser settings, then reload.", 4000); else if (state.me) map.flyTo(state.me, 16); };
  $("#fab-locate").onclick = () => {
    if (origin()) { map.flyTo(state.me, 16, { duration: 0.8 }); $("#fab-locate").classList.add("active"); }
    else if (state.outside) toast("You're outside Kolkata — showing the city.");
    else { toast("Waiting for GPS… allow location access."); startGeo(); }
  };

  /* ================= Weather ================= */
  async function loadWeather(ll = PUJO.CENTER) {
    try {
      const w = await SVC.weather(ll);
      state.weather = w;
      const [ic, desc] = SVC.wmo(w.current.weather_code, w.current.is_day);
      const hrNow = SVC.ist().getHours();
      const startIdx = w.hourly.time.findIndex((t) => +t.slice(11, 13) === hrNow && t.slice(0, 10) === SVC.isoDate(SVC.ist()));
      const next3 = w.hourly.precipitation_probability.slice(Math.max(0, startIdx), Math.max(0, startIdx) + 3);
      const rain = Math.max(...next3, 0);
      $("#weather-chip").innerHTML = `${ic} ${Math.round(w.current.temperature_2m)}°C${rain >= 40 ? ` · ☔ ${rain}%` : ""}`;
      $("#weather-chip").title = `${desc} · feels ${Math.round(w.current.apparent_temperature)}°C · rain chance next 3h ${rain}% (Open-Meteo)`;
      if (state.tab === "traffic") renderTraffic();
    } catch (e) { $("#weather-chip").textContent = "⛅ —"; }
  }

  /* ================= Metro ================= */
  state.metro = (PUJO.METRO || []).map(([name, lat, lng]) => ({ name, ll: [lat, lng] }));
  state.metro.forEach((s) => L.marker(s.ll, { icon: L.divIcon({ html: '<div class="poi metro">M</div>', className: "", iconSize: [22, 22] }) })
    .bindPopup(`<div class="pop-title">🚇 ${esc(s.name)}</div><div class="muted">Kolkata Metro</div>`).addTo(metroLayer));

  /* ================= Sheet ================= */
  const sheet = $("#sheet");
  const desktop = () => matchMedia("(min-width: 900px)").matches;
  function setSheet(st) { if (!desktop()) sheet.dataset.state = st; updateFabs(); }
  function updateFabs() {
    let peek = 210;
    if (!desktop()) { const st = sheet.dataset.state; peek = st === "peek" ? 210 : st === "half" ? Math.round(innerHeight * 0.88 * 0.55) : 210; }
    root.style.setProperty("--peek", peek + "px");
  }
  (function dragSheet() {
    let y0 = null, t0 = 0, startT = 0;
    const grip = $(".grip");
    const H = () => sheet.getBoundingClientRect().height;
    const offsets = () => ({ peek: H() - 210, half: H() * 0.45, full: 0 });
    grip.addEventListener("pointerdown", (e) => {
      y0 = e.clientY; startT = offsets()[sheet.dataset.state]; t0 = Date.now();
      sheet.classList.add("dragging"); grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener("pointermove", (e) => {
      if (y0 == null) return;
      const y = Math.max(0, Math.min(H() - 120, startT + (e.clientY - y0)));
      sheet.style.transform = `translateY(${y}px)`;
    });
    const end = (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0, fast = Date.now() - t0 < 250;
      sheet.classList.remove("dragging"); sheet.style.transform = "";
      const order = ["full", "half", "peek"], i = order.indexOf(sheet.dataset.state);
      if (Math.abs(dy) < 6) setSheet(sheet.dataset.state === "peek" ? "half" : sheet.dataset.state === "half" ? "full" : "peek");
      else {
        const off = offsets(), y = startT + dy;
        let best = "peek", bd = Infinity;
        for (const k of order) { const d = Math.abs(off[k] - y); if (d < bd) { bd = d; best = k; } }
        if (fast) best = order[Math.max(0, Math.min(2, i + (dy > 0 ? 1 : -1)))];
        setSheet(best);
      }
      y0 = null;
    };
    grip.addEventListener("pointerup", end); grip.addEventListener("pointercancel", end);
  })();
  map.on("click", () => { setSheet("peek"); $("#layers-menu").hidden = true; closeSearch(); });
  addEventListener("resize", updateFabs);
  updateFabs();

  /* ================= Tabs ================= */
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => { switchTab(b.dataset.tab); if (sheet.dataset.state === "peek") setSheet("half"); }));
  function switchTab(tab) {
    if (!["detail", "route"].includes(tab)) state.prevTab = tab;
    state.tab = tab;
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $$(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === "pane-" + tab));
    $("#panel-body").scrollTop = 0;
    renderActive();
  }
  function renderActive() {
    const fn = { explore: renderExplore, nearby: renderNearby, circuits: renderCircuits, food: renderFood, traffic: renderTraffic, sos: renderSOS }[state.tab];
    if (fn) fn();
  }
  const backBtn = () => `<button class="btn" data-back style="margin:4px 0 6px">← Back</button>`;
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { clearRoute(); highlight(null); switchTab(state.prevTab); }
    const pj = e.target.closest("[data-puja]"); if (pj) showDetail(pj.dataset.puja);
  });

  /* ================= Explore ================= */
  function renderExplore() {
    const d = pujaDay();
    const visitedN = state.visited.size, total = PUJAS.length;
    let hero;
    if (d.idx >= 0) {
      const t = d.days[d.idx], nx = d.days[d.idx + 1];
      hero = `<div class="hero"><div class="count">Today · ${t.en}</div><h3>${t.bn}</h3><p>${esc(t.rites)}</p>${nx ? `<p style="margin-top:8px;opacity:.8">Tomorrow: <b>${nx.en}</b> — ${esc(nx.rites)}</p>` : `<p style="margin-top:8px">আসছে বছর আবার হবে 🙏</p>`}</div>`;
    } else if (d.before) hero = `<div class="hero"><div class="count">Countdown</div><h3>${d.before} দিন বাকি</h3><p>Maha Shashthi on ${new Date(d.days[0].date + "T12:00:00").toDateString()}</p></div>`;
    else hero = `<div class="hero"><div class="count">Shubho Bijoya</div><h3>আসছে বছর আবার হবে</h3><p>Pujo 2026 is over — the map stays up for next year's planning.</p></div>`;

    const days = d.days.slice(0, 5).map((x, i) => `<div class="day ${i === d.idx ? "today" : d.idx > i || d.after ? "past" : ""}"><b>${x.bn.replace("মহা", "")}</b>${+x.date.slice(8)} Oct</div>`).join("");
    const zones = [["all", "All"]].concat(Object.entries(PUJO.ZONES).map(([k, z]) => [k, z.en.split(" ")[0]]));
    const types = [["all", "All"], ["theme", "Theme"], ["traditional", "Sabeki"], ["bonedi", "Bonedi"]];

    let list = PUJAS.filter((p) => (state.zone === "all" || p.zone === state.zone) && (state.type === "all" || p.type === state.type || (state.type === "bonedi" && p.type === "math")));
    const o = origin();
    if (o) list = list.map((p) => ({ p, d: SVC.dist(o, p.ll) })).sort((a, b) => a.d - b.d);
    else list = list.map((p) => ({ p, d: null })).sort((a, b) => b.p.tier - a.p.tier);

    $("#pane-explore").innerHTML = `${hero}
      <div class="days">${days}</div>
      <h3 class="sub">Your Pujo Passport</h3>
      <div class="progress"><i style="width:${(visitedN / total) * 100}%"></i></div>
      <div class="muted" style="font-size:12.5px">${visitedN} of ${total} pandals visited ${visitedN >= 10 ? "· 🏅 Pandal-hopper" : visitedN >= 3 ? "· 🌼 Getting started" : ""}</div>
      <h2 class="sec">Pandals<span class="bn">মণ্ডপ</span></h2>
      <p class="lead">${o ? "Sorted by distance from you." : "Showing the big names first. Allow location to sort by distance."}</p>
      <div class="chips" id="zone-chips">${zones.map(([k, l]) => `<button class="chip ${state.zone === k ? "on" : ""}" data-zone="${k}">${l}</button>`).join("")}</div>
      <div class="seg" id="type-seg" style="margin-bottom:12px">${types.map(([k, l]) => `<button class="${state.type === k ? "on" : ""}" data-type="${k}">${l}</button>`).join("")}</div>
      <div class="cards">${list.map(({ p, d }, i) => pujaCard(p, d, i)).join("") || '<div class="empty">No pandals match.</div>'}</div>
      <p class="muted" style="font-size:11.5px;margin-top:16px">Themes are as reported in pre-Puja coverage; crowd levels are time-of-day estimates, not live counts.</p>`;
    $$("#zone-chips .chip").forEach((b) => (b.onclick = () => { state.zone = b.dataset.zone; renderExplore(); fitZone(); }));
    $$("#type-seg button").forEach((b) => (b.onclick = () => { state.type = b.dataset.type; renderExplore(); }));
  }
  function fitZone() {
    if (state.zone === "all") return;
    const pts = PUJAS.filter((p) => p.zone === state.zone).map((p) => p.ll);
    map.flyToBounds(pts, { padding: [60, 60], maxZoom: 16, duration: 0.8 });
  }
  function pujaCard(p, d, i) {
    const right = d != null ? `<div class="r"><b>${SVC.fmtDist(d)}</b>~${SVC.fmtDur(SVC.walkSecs(d))} walk</div>` : "";
    return `<button class="card" data-puja="${p.id}" style="animation-delay:${Math.min(i, 12) * 30}ms">
      <div class="badge-num" style="background:linear-gradient(135deg, ${PUJO.ZONES[p.zone].color}, #7a0f12)">${state.visited.has(p.id) ? "✓" : p.tier === 3 ? "★" : "🪔"}</div>
      <div class="body"><div class="t">${esc(p.name)}<span class="bn">${p.bn}</span></div>
      <div class="m">${p.theme ? `<span class="tag theme">✦ ${esc(p.theme)}</span>` : `<span>${PUJO.TYPES[p.type]}</span>`}${crowdTag(p)}</div></div>${right}</button>`;
  }

  /* ================= Detail ================= */
  function showDetail(id, silent) {
    const p = byId[id]; if (!p) return;
    state.selected = id;
    if (state.tab !== "detail") switchTab("detail");
    highlight(id);
    if (!silent) { map.flyTo(p.ll, Math.max(map.getZoom(), 16), { duration: 0.8 }); setSheet("half"); history.replaceState(null, "", "#p=" + id); }
    const o = origin(), d = o ? SVC.dist(o, p.ll) : null, mt = metroNear(p.ll);
    const crowd = SVC.crowd(p.tier), [cl, cc] = SVC.crowdLabel(crowd);
    const hours = Array.from({ length: 24 }, (_, h) => { const t = SVC.ist(); t.setHours(h, 0, 0, 0); return SVC.crowd(p.tier, new Date(Date.now() + (h - SVC.ist().getHours()) * 3600e3)); });
    const nowH = SVC.ist().getHours();
    const best = hours.map((v, h) => ({ v, h })).filter((x) => x.h >= 6 && x.h <= 23).sort((a, b) => a.v - b.v)[0];
    const prec = { exact: "📌 Exact location (OpenStreetMap)", area: "📍 Street-level location — look for the gate & queue", approx: "⚠️ Approximate location — follow the crowd & signage for the last 200 m" }[p.precision];
    $("#pane-detail").innerHTML = `${backBtn()}
      <h2 class="sec" style="margin-top:2px">${esc(p.name)}</h2>
      <div class="bn" style="font-size:20px;color:var(--gold)">${p.bn}</div>
      <div class="m" style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
        <span class="tag" style="background:${PUJO.ZONES[p.zone].color}22">${PUJO.ZONES[p.zone].en}</span>
        <span class="tag">${PUJO.TYPES[p.type]}</span>
        ${p.theme ? `<span class="tag theme">✦ 2026 theme: ${esc(p.theme)}</span>` : ""}
      </div>
      <p class="lead">${esc(p.note)}</p>
      <div class="stats">
        <div class="stat"><b>${d != null ? SVC.fmtDist(d) : "—"}</b><span>from you</span></div>
        <div class="stat"><b>${d != null ? SVC.fmtDur(SVC.walkSecs(d)).replace(" min", "′") : "—"}</b><span>walk (est.)</span></div>
        <div class="stat"><b class="${cc}" style="background:none">${cl}</b><span>crowd now*</span></div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="go-walk">🚶 Walk here</button>
        <button class="btn gold" id="go-car">🚕 Cab / drive</button>
      </div>
      <div class="btn-row">
        <button class="btn" id="d-visit">${state.visited.has(id) ? "✅ Visited" : "☐ Mark visited"}</button>
        <button class="btn" id="d-food">🍛 Food nearby</button>
        <button class="btn" id="d-share">🔗 Share</button>
      </div>
      ${mt ? `<div class="note">🚇 Nearest Metro: <b>${esc(mt.name)}</b> — ${SVC.fmtDist(mt.d)} (~${SVC.fmtDur(SVC.walkSecs(mt.d))} walk)</div>` : ""}
      <div class="note">${prec}</div>
      <h3 class="sub">Crowd through the day (estimate)</h3>
      <div class="bars">${hours.map((v, h) => `<i class="${h === nowH ? "now" : ""}" style="height:${8 + v * 92}%" title="${h}:00"></i>`).join("")}</div>
      <div class="bars-x"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>
      <p class="muted" style="font-size:12px">Best time to visit today: around <b>${best.h % 12 || 12}${best.h < 12 ? " am" : " pm"}</b>. *Estimated from typical Kolkata Pujo patterns, pandal popularity and puja day.</p>
      <a class="btn" style="width:100%;margin-top:6px" target="_blank" rel="noopener" href="${gmaps(p.ll, o, "foot")}">Open in Google Maps ↗</a>`;
    $("#go-walk").onclick = () => routeTo(p.ll, p.name, "foot", id);
    $("#go-car").onclick = () => routeTo(p.ll, p.name, "car", id);
    $("#d-visit").onclick = () => { toggleVisited(id); showDetail(id, true); };
    $("#d-food").onclick = () => { state.foodAnchor = { ll: p.ll, name: p.name }; switchTab("food"); };
    $("#d-share").onclick = () => share(`${p.name} · Pujo Path`, `${p.name} (${p.bn}) — Durga Puja 2026`, location.origin + location.pathname + "#p=" + id);
  }

  /* ================= Routing / navigation ================= */
  function clearRoute() { routeLayer.clearLayers(); state.nav = null; }
  async function routeTo(dest, name, profile = "foot", pujaId) {
    let from = origin();
    if (!from) {
      from = [map.getCenter().lat, map.getCenter().lng];
      toast(state.outside ? "Outside Kolkata — routing from the map centre." : "No GPS fix yet — routing from the map centre.", 3500);
    }
    state.profile = profile; store.set("profile", profile);
    switchTab("route"); setSheet("half");
    $("#pane-route").innerHTML = backBtn() + loader("Finding the best way through the crowds…");
    try {
      const r = await SVC.route(profile, [from, dest]);
      drawRoute(r, profile);
      state.nav = { r, dest, name, profile, pujaId, idx: stepIndex(r), lastReroute: Date.now(), arrived: false };
      renderRoute();
    } catch (e) {
      $("#pane-route").innerHTML = backBtn() + `<div class="note warn">Couldn't fetch a route right now (${esc(e.message)}). Try Google Maps instead.</div><a class="btn primary" target="_blank" rel="noopener" href="${gmaps(dest, from, profile)}">Open in Google Maps ↗</a>`;
    }
  }
  function drawRoute(r, profile, color) {
    routeLayer.clearLayers();
    const ll = r.geometry.coordinates.map((c) => [c[1], c[0]]);
    const col = color || (profile === "car" ? "#2e86de" : "#c1121f");
    L.polyline(ll, { color: "#fff", weight: 9, opacity: 0.8 }).addTo(routeLayer);
    L.polyline(ll, { color: col, weight: 5, opacity: 0.95, className: "route-line" }).addTo(routeLayer);
    map.flyToBounds(L.latLngBounds(ll), { padding: desktop() ? [60, 60] : [40, 40], paddingTopLeft: desktop() ? [460, 80] : [30, 110], paddingBottomRight: desktop() ? [60, 60] : [30, innerHeight * 0.5], duration: 0.9 });
    return ll;
  }
  function stepIndex(r) {
    const geom = r.geometry.coordinates;
    const steps = r.legs.flatMap((l) => l.steps);
    return steps.map((s) => {
      const loc = s.maneuver.location; let bi = 0, bd = Infinity;
      for (let i = 0; i < geom.length; i++) { const d = (geom[i][0] - loc[0]) ** 2 + (geom[i][1] - loc[1]) ** 2; if (d < bd) { bd = d; bi = i; } }
      return bi;
    });
  }
  function renderRoute(curStep = 0, remain) {
    const n = state.nav; if (!n) return;
    const r = n.r, steps = r.legs.flatMap((l) => l.steps);
    const dist = remain ? remain.d : r.distance, dur = remain ? remain.t : r.duration;
    const modeName = { foot: "Walking", car: "Cab / drive", bike: "Cycle" }[n.profile];
    $("#pane-route").innerHTML = `${backBtn()}
      <h2 class="sec" style="margin-top:2px">To ${esc(n.name)}</h2>
      <div class="seg" id="mode-seg" style="margin:6px 0 4px">${[["foot", "🚶 Walk"], ["car", "🚕 Cab"], ["bike", "🚲 Cycle"]].map(([k, l]) => `<button class="${n.profile === k ? "on" : ""}" data-mode="${k}">${l}</button>`).join("")}</div>
      <div class="stats">
        <div class="stat"><b>${SVC.fmtDist(dist)}</b><span>remaining</span></div>
        <div class="stat"><b>${SVC.fmtDur(n.profile === "car" ? dur * 1.8 : dur)}</b><span>${n.profile === "car" ? "with Pujo traffic*" : modeName.toLowerCase()}</span></div>
        <div class="stat"><b>${new Date(Date.now() + (n.profile === "car" ? dur * 1.8 : dur) * 1000).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</b><span>arrive</span></div>
      </div>
      ${n.profile === "car" ? `<div class="note">*Road-network time × 1.8 for festival congestion. Many pandal lanes are closed to cars — expect to walk the last stretch. For live traffic, use Google Maps or add a TomTom key in the Traffic tab.</div>` : ""}
      ${!origin() ? `<div class="note warn">Routing from the map centre — your live location isn't available.</div>` : `<div class="note">🛰️ Live: this updates as you move and re-routes if you stray.</div>`}
      <ol class="steps">${steps.map((s, i) => { const { txt, ic } = SVC.stepText(s); return `<li class="${i === curStep ? "now" : i < curStep ? "done" : ""}"><span class="ic">${ic}</span><div>${txt}<small>${s.distance > 0 ? SVC.fmtDist(s.distance) : ""}</small></div></li>`; }).join("")}</ol>
      <a class="btn primary" style="width:100%" target="_blank" rel="noopener" href="${gmaps(n.dest, origin(), n.profile)}">Navigate in Google Maps ↗</a>`;
    $$("#mode-seg button").forEach((b) => (b.onclick = () => routeTo(n.dest, n.name, b.dataset.mode, n.pujaId)));
    const now = $(".steps li.now"); if (now && remain) now.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function navUpdate() {
    const n = state.nav; if (!n || !origin() || state.tab !== "route") return;
    const geom = n.r.geometry.coordinates, me = state.me;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < geom.length; i++) { const d = SVC.dist(me, [geom[i][1], geom[i][0]]); if (d < bd) { bd = d; bi = i; } }
    if (SVC.dist(me, n.dest) < 35 && !n.arrived) {
      n.arrived = true; burst(40); toast(`🙏 You've reached ${esc(n.name)}! শুভ শারদীয়া`, 4000);
      if (n.pujaId && !state.visited.has(n.pujaId)) toggleVisited(n.pujaId);
      return;
    }
    if (bd > 60 && Date.now() - n.lastReroute > 20000) { n.lastReroute = Date.now(); toast("Re-routing…"); routeTo(n.dest, n.name, n.profile, n.pujaId); return; }
    let rem = 0; for (let i = bi; i < geom.length - 1; i++) rem += SVC.dist([geom[i][1], geom[i][0]], [geom[i + 1][1], geom[i + 1][0]]);
    let cur = 0; n.idx.forEach((gi, i) => { if (gi <= bi) cur = i; });
    renderRoute(cur, { d: rem + bd, t: n.r.duration * (rem / Math.max(1, n.r.distance)) });
  }

  /* ================= Nearest ================= */
  $("#fab-nearest").onclick = async () => {
    const o = anchor();
    const cand = PUJAS.map((p) => ({ p, d: SVC.dist(o, p.ll) })).sort((a, b) => a.d - b.d);
    let best = cand[0];
    try {
      const top = cand.slice(0, 6);
      const t = await SVC.table("foot", o, top.map((c) => c.p.ll));
      const ranked = top.map((c, i) => ({ ...c, t: t.durations[i] })).filter((c) => c.t != null).sort((a, b) => a.t - b.t);
      if (ranked.length) best = ranked[0];
    } catch (e) {}
    burst(12);
    toast(`🪔 Nearest: <b>${esc(best.p.name)}</b>`);
    highlight(best.p.id);
    routeTo(best.p.ll, best.p.name, "foot", best.p.id);
  };

  async function renderNearby() {
    const pane = $("#pane-nearby");
    const o = origin();
    if (!o) {
      pane.innerHTML = `<h2 class="sec">Near you<span class="bn">কাছাকাছি</span></h2>
        <div class="note ${state.locDenied ? "warn" : ""}">${state.locDenied ? "Location permission is blocked. Enable it for this site in your browser, then reload." : state.outside ? "You're outside Kolkata right now. Showing pandals near the map centre instead." : "Waiting for your GPS location…"}</div>
        <button class="btn primary" id="nb-center" style="width:100%">Use map centre as my starting point</button><div id="nb-list"></div>`;
      $("#nb-center").onclick = () => fillNearby([map.getCenter().lat, map.getCenter().lng]);
      if (state.outside) fillNearby([map.getCenter().lat, map.getCenter().lng]);
      return;
    }
    pane.innerHTML = `<h2 class="sec">Near you<span class="bn">কাছাকাছি</span></h2><p class="lead">Real walking times through the street network (OSRM).</p><div id="nb-list"></div>`;
    fillNearby(o);
  }
  async function fillNearby(o) {
    const box = $("#nb-list");
    box.innerHTML = loader("Measuring real walking times…");
    const cand = PUJAS.map((p) => ({ p, d: SVC.dist(o, p.ll) })).sort((a, b) => a.d - b.d).slice(0, 10);
    try {
      const t = await SVC.table("foot", o, cand.map((c) => c.p.ll));
      cand.forEach((c, i) => { c.t = t.durations[i]; c.rd = t.distances ? t.distances[i] : null; });
      cand.sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9));
    } catch (e) {}
    const mt = metroNear(o);
    box.innerHTML = `${mt ? `<div class="note">🚇 Closest Metro: <b>${esc(mt.name)}</b> · ${SVC.fmtDist(mt.d)}</div>` : ""}
      <div class="cards">${cand.map((c, i) => `<button class="card" data-puja="${c.p.id}" style="animation-delay:${i * 40}ms">
        <div class="badge-num">${i + 1}</div>
        <div class="body"><div class="t">${esc(c.p.name)}<span class="bn">${c.p.bn}</span></div><div class="m">${crowdTag(c.p)}${c.p.theme ? `<span class="tag theme">✦ ${esc(c.p.theme)}</span>` : ""}</div></div>
        <div class="r"><b>${c.t != null ? SVC.fmtDur(c.t * 1.15) : "~" + SVC.fmtDur(SVC.walkSecs(c.d))}</b>${SVC.fmtDist(c.rd || c.d)}</div></button>`).join("")}</div>
      <p class="muted" style="font-size:11.5px">Walking times include a 15% festival-crowd buffer.</p>`;
  }

  /* ================= Circuits ================= */
  function renderCircuits() {
    $("#pane-circuits").innerHTML = `<h2 class="sec">Pujo Circuits<span class="bn">পরিক্রমা</span></h2>
      <p class="lead">Hand-picked pandal-hopping routes across the city's great clusters. Tap one to draw it on the map.</p>
      <div class="cards">${PUJO.CIRCUITS.map((c, i) => {
        const done = c.stops.filter((s) => state.visited.has(s)).length;
        return `<button class="card" data-circuit="${c.id}" style="animation-delay:${i * 40}ms;border-left:4px solid ${c.color}">
          <div class="body"><div class="t">${esc(c.name)}<span class="bn">${c.bn}</span></div>
          <div class="m"><span>${c.mode === "foot" ? "🚶 On foot" : "🚕 By cab"}</span><span>⏱ ${c.hours}</span><span>📍 ${c.stops.length} stops</span>${done ? `<span class="tag crowd-low">${done}/${c.stops.length} done</span>` : ""}</div>
          <div class="m" style="margin-top:4px;color:var(--ink-2)">${esc(c.blurb)}</div></div></button>`;
      }).join("")}</div>`;
    $$("[data-circuit]").forEach((b) => (b.onclick = () => showCircuit(b.dataset.circuit)));
  }
  async function showCircuit(cid, fromMe = false, optimize = false) {
    const c = PUJO.CIRCUITS.find((x) => x.id === cid);
    switchTab("route"); setSheet("half"); history.replaceState(null, "", "#c=" + cid);
    const pane = $("#pane-route");
    pane.innerHTML = backBtn() + loader("Plotting the circuit…");
    let stops = c.stops.map((s) => byId[s]);
    const o = origin();
    let pts = stops.map((s) => s.ll);
    if ((fromMe || optimize) && o) pts = [o].concat(pts);
    let r, order = stops;
    try {
      if (optimize && o) {
        const t = await SVC.trip(c.mode, pts);
        r = t.trips[0];
        const wp = t.waypoints.slice(1).map((w, i) => ({ s: stops[i], k: w.waypoint_index })).sort((a, b) => a.k - b.k);
        order = wp.map((x) => x.s);
      } else r = await SVC.route(c.mode, pts);
    } catch (e) { r = null; }
    routeLayer.clearLayers();
    if (r) drawRoute(r, c.mode, c.color);
    order.forEach((s, i) => L.marker(s.ll, { icon: L.divIcon({ html: `<div class="poi" style="border-color:${c.color};font-weight:700;font-size:12px;color:${c.color}">${i + 1}</div>`, className: "", iconSize: [28, 28], iconAnchor: [14, 34] }), zIndexOffset: 500 }).on("click", () => showDetail(s.id)).addTo(routeLayer));
    if (!r) map.flyToBounds(order.map((s) => s.ll), { padding: [60, 60] });
    state.nav = null;
    const done = order.filter((s) => state.visited.has(s.id)).length;
    const wpts = order.map((s) => s.ll);
    pane.innerHTML = `${backBtn()}
      <h2 class="sec" style="margin-top:2px">${esc(c.name)}</h2><div class="bn" style="color:var(--gold);font-size:17px">${c.bn}</div>
      <p class="lead">${esc(c.blurb)}</p>
      <div class="stats">
        <div class="stat"><b>${r ? SVC.fmtDist(r.distance) : "—"}</b><span>total</span></div>
        <div class="stat"><b>${r ? SVC.fmtDur(r.duration * (c.mode === "car" ? 1.8 : 1) + order.length * 15 * 60) : c.hours}</b><span>incl. 15′/pandal</span></div>
        <div class="stat"><b>${done}/${order.length}</b><span>visited</span></div>
      </div>
      <div class="progress"><i style="width:${(done / order.length) * 100}%"></i></div>
      <div class="note">🚩 Suggested start: <b>${esc(c.start)}</b>${c.mode === "car" ? " · Cab times include a festival-traffic factor; hop out and walk where lanes are closed." : ""}</div>
      <div class="btn-row">
        <button class="btn primary" id="c-me" ${o ? "" : "disabled"}>📍 Start from me</button>
        <button class="btn gold" id="c-opt" ${o ? "" : "disabled"}>✨ Best order from me</button>
      </div>
      <ul class="stoplist" style="--c:${c.color}">${order.map((s, i) => `<li class="${state.visited.has(s.id) ? "v" : ""}"><span class="n">${state.visited.has(s.id) ? "✓" : i + 1}</span>
        <button class="nm" data-puja="${s.id}">${esc(s.name)}<small>${s.bn}${s.theme ? " · ✦ " + esc(s.theme) : ""}</small></button>
        <button class="btn" data-visit="${s.id}" style="padding:6px 10px" aria-label="Mark visited">${state.visited.has(s.id) ? "✅" : "☐"}</button></li>`).join("")}</ul>
      <a class="btn" style="width:100%" target="_blank" rel="noopener" href="${gmaps(wpts[wpts.length - 1], o || wpts[0], c.mode, (o ? wpts.slice(0, -1) : wpts.slice(1, -1)).slice(0, 9))}">Open circuit in Google Maps ↗</a>
      ${!o ? `<p class="muted" style="font-size:12px">Allow location to start the circuit from where you are.</p>` : ""}`;
    $("#c-me").onclick = () => showCircuit(cid, true, false);
    $("#c-opt").onclick = () => showCircuit(cid, false, true);
    $$("[data-visit]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); toggleVisited(b.dataset.visit); showCircuitList(); }));
    function showCircuitList() { showCircuit(cid, fromMe, optimize); }
  }

  /* ================= Food ================= */
  const FOOD_KIND = (t) => {
    if (t.shop === "confectionery" || t.shop === "sweets" || t.shop === "pastry" || /sweet|mishti|mithai/i.test(t.name || "")) return ["mishti", "🍮", "Mishti & sweets"];
    if (t.shop === "bakery") return ["cafe", "🥐", "Bakery"];
    if (t.amenity === "cafe" || t.amenity === "ice_cream") return ["cafe", t.amenity === "ice_cream" ? "🍦" : "☕", t.amenity === "ice_cream" ? "Ice cream" : "Café"];
    if (t.amenity === "fast_food" || t.amenity === "food_court") return ["street", "🌯", "Quick bites"];
    return ["restaurant", "🍛", "Restaurant"];
  };
  async function renderFood() {
    const pane = $("#pane-food");
    const a = state.foodAnchor || (origin() ? { ll: origin(), name: "you" } : { ll: anchor(), name: "the map centre" });
    pane.innerHTML = `<h2 class="sec">Pet Pujo<span class="bn">পেট পুজো</span></h2>
      <p class="lead">Live from OpenStreetMap — eateries within ~900 m of <b>${esc(a.name)}</b>.</p>
      <div class="chips" id="food-chips">${[["all", "All"], ["restaurant", "🍛 Restaurants"], ["street", "🌯 Quick bites"], ["mishti", "🍮 Mishti"], ["cafe", "☕ Cafés"]].map(([k, l]) => `<button class="chip ${state.foodKind === k ? "on" : ""}" data-k="${k}">${l}</button>`).join("")}</div>
      ${state.foodAnchor ? `<button class="btn" id="food-me" style="margin-bottom:10px">📍 Search around me instead</button>` : `<button class="btn" id="food-here" style="margin-bottom:10px">🗺️ Search around map centre</button>`}
      <div id="food-list">${loader("Sniffing out kathi rolls and phuchka…")}</div>`;
    $$("#food-chips .chip").forEach((b) => (b.onclick = () => { state.foodKind = b.dataset.k; drawFood(a); $$("#food-chips .chip").forEach((x) => x.classList.toggle("on", x === b)); }));
    const fm = $("#food-me"); if (fm) fm.onclick = () => { state.foodAnchor = null; renderFood(); };
    const fh = $("#food-here"); if (fh) fh.onclick = () => { state.foodAnchor = { ll: [map.getCenter().lat, map.getCenter().lng], name: "the map centre" }; renderFood(); };
    try {
      const els = await SVC.food(a.ll);
      state.foodData = els.filter((e) => e.tags.name).map((e) => ({ ...e, d: SVC.dist(a.ll, e.ll), kind: FOOD_KIND(e.tags) })).sort((x, y) => x.d - y.d);
      if (state.tab === "food") drawFood(a);
    } catch (e) {
      $("#food-list").innerHTML = `<div class="note warn">Couldn't reach OpenStreetMap right now. <button class="btn" id="food-retry">Retry</button></div>`;
      $("#food-retry").onclick = renderFood;
    }
  }
  function drawFood(a) {
    poiLayer.clearLayers();
    const list = state.foodData.filter((f) => state.foodKind === "all" || f.kind[0] === state.foodKind).slice(0, 60);
    list.forEach((f) => L.marker(f.ll, { icon: L.divIcon({ html: `<div class="poi">${f.kind[1]}</div>`, className: "", iconSize: [28, 28] }) })
      .bindPopup(`<div class="pop-title">${esc(f.tags.name)}</div><div class="muted">${f.kind[2]}${f.tags.cuisine ? " · " + esc(f.tags.cuisine.replace(/[;_]/g, " ")) : ""}</div>${f.tags.opening_hours ? `<div style="margin-top:4px">🕒 ${esc(f.tags.opening_hours)}</div>` : ""}<button class="btn" style="margin-top:8px;padding:6px 10px" data-food-go="${f.id}">🚶 Directions</button>`)
      .addTo(poiLayer));
    const L0 = list.length;
    $("#food-list").innerHTML = L0 ? `<div class="cards">${list.map((f, i) => `<button class="card" data-food="${f.id}" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <div class="badge-num" style="background:var(--surface-2);font-size:20px">${f.kind[1]}</div>
        <div class="body"><div class="t">${esc(f.tags.name)}</div><div class="m"><span>${f.kind[2]}</span>${f.tags.cuisine ? `<span>${esc(f.tags.cuisine.replace(/[;_]/g, " "))}</span>` : ""}${f.tags.opening_hours ? `<span>🕒 ${esc(f.tags.opening_hours.slice(0, 32))}</span>` : ""}</div></div>
        <div class="r"><b>${SVC.fmtDist(f.d)}</b>${f.tags["diet:vegetarian"] === "only" ? "🟢 veg" : ""}</div></button>`).join("")}</div>
        <p class="muted" style="font-size:11.5px">Data: OpenStreetMap contributors. Hours can change during Pujo — many stalls stay open past midnight.</p>`
      : `<div class="empty">No mapped eateries here in this category. Try "All" or move the map.</div>`;
    $$("[data-food]").forEach((b) => (b.onclick = () => { const f = state.foodData.find((x) => x.id === b.dataset.food); map.flyTo(f.ll, 17); routeTo(f.ll, f.tags.name, "foot"); }));
    if (list.length) map.flyToBounds([a.ll].concat(list.slice(0, 15).map((f) => f.ll)), { padding: [50, 50], maxZoom: 16, paddingBottomRight: desktop() ? [50, 50] : [30, innerHeight * 0.5] });
  }
  map.on("popupopen", (e) => {
    const b = e.popup.getElement().querySelector("[data-food-go]");
    if (b) b.onclick = () => { const f = state.foodData.find((x) => x.id === b.dataset.foodGo); routeTo(f.ll, f.tags.name, "foot"); };
    const h = e.popup.getElement().querySelector("[data-poi-go]");
    if (h) h.onclick = () => routeTo(h.dataset.ll.split(",").map(Number), h.dataset.name, "car");
  });

  /* ================= Traffic ================= */
  let incTimer = null;
  function renderTraffic() {
    const w = state.weather, key = SVC.tomtomKey();
    let wx = `<div class="loader"><span class="dhak-spin"></span>Loading weather…</div>`;
    if (w) {
      const [ic, desc] = SVC.wmo(w.current.weather_code, w.current.is_day);
      const nowIso = SVC.isoDate(SVC.ist()), hr = SVC.ist().getHours();
      let si = w.hourly.time.findIndex((t) => t.slice(0, 10) === nowIso && +t.slice(11, 13) === hr); if (si < 0) si = 0;
      const hrs = w.hourly.time.slice(si, si + 12).map((t, i) => { const j = si + i; const [hi] = SVC.wmo(w.hourly.weather_code[j]); return `<div class="hour">${t.slice(11, 13)}h<br>${hi}<b>${Math.round(w.hourly.temperature_2m[j])}°</b>${w.hourly.precipitation_probability[j]}%</div>`; }).join("");
      const rainSoon = Math.max(...w.hourly.precipitation_probability.slice(si, si + 4));
      wx = `<div class="weather-big"><span class="w">${ic}</span><div><b>${Math.round(w.current.temperature_2m)}°C</b><div class="muted">${desc} · feels ${Math.round(w.current.apparent_temperature)}° · humidity ${w.current.relative_humidity_2m}%</div></div></div>
        ${rainSoon >= 50 ? `<div class="note warn">☔ ${rainSoon}% chance of rain in the next few hours — carry an umbrella; waterlogging slows traffic on low-lying roads.</div>` : ""}
        <div class="hours">${hrs}</div><p class="muted" style="font-size:11px">Hourly · temperature · rain chance (Open-Meteo, live)</p>`;
    }
    const nowH = SVC.ist().getHours();
    const cityCurve = Array.from({ length: 24 }, (_, h) => SVC.crowd(3, new Date(Date.now() + (h - nowH) * 3600e3)));
    $("#pane-traffic").innerHTML = `<h2 class="sec">Roads & Weather<span class="bn">পথের খবর</span></h2>
      ${wx}
      <h3 class="sub">Live traffic & closures</h3>
      ${key ? `<div id="inc-list">${loader("Fetching live incidents from TomTom…")}</div>
          <div class="btn-row"><button class="btn" id="tt-layer">${trafficTiles && map.hasLayer(trafficTiles) ? "Hide" : "Show"} live flow on map</button><button class="btn" id="tt-clear">Remove key</button></div>`
        : `<div class="note">Add a free <a href="https://developer.tomtom.com/" target="_blank" rel="noopener">TomTom API key</a> to see <b>live traffic flow and real-time road closures</b> on the map. It stays on this device only.</div>
           <div class="field"><input id="tt-key" placeholder="Paste TomTom API key" autocomplete="off" /><button class="btn primary" id="tt-save">Save</button></div>`}
      <div class="btn-row">
        <a class="btn" target="_blank" rel="noopener" href="${PUJO.LINKS.gmapsTraffic}">🗺️ Google live traffic ↗</a>
        <a class="btn" target="_blank" rel="noopener" href="${PUJO.LINKS.traffic}">🚦 Kolkata Traffic Police ↗</a>
      </div>
      <h3 class="sub">City crowd curve today (estimate)</h3>
      <div class="bars">${cityCurve.map((v, h) => `<i class="${h === nowH ? "now" : ""}" style="height:${8 + v * 92}%"></i>`).join("")}</div>
      <div class="bars-x"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>
      <h3 class="sub">Puja advisory zones</h3>
      <div class="cards">${PUJO.ADVISORIES.map((a, i) => `<button class="card" data-adv="${i}"><div class="badge-num" style="background:${a.level === "high" ? "#d7262b" : "#d08a00"}">🚧</div><div class="body"><div class="t">${esc(a.name)}</div><div class="m">${esc(a.text)}</div></div></button>`).join("")}</div>
      <div class="note">Advisory zones follow the restrictions Kolkata Police enforces around blockbuster pandals every year. Exact timings change daily — confirm with the Traffic Police helpline <a href="tel:1073">1073</a>.</div>
      <h3 class="sub">Metro</h3>
      <div class="note">🚇 Kolkata Metro usually runs extended late-night services from Saptami to Navami — check the <a href="${PUJO.LINKS.metro}" target="_blank" rel="noopener">official Metro Railway site</a> for 2026 timings. Turn on "Metro stations" in map layers to see every station.</div>`;
    $$("[data-adv]").forEach((b) => (b.onclick = () => { const a = PUJO.ADVISORIES[+b.dataset.adv]; map.flyTo(a.ll, 15); setSheet("peek"); }));
    if (key) {
      loadIncidents(key);
      $("#tt-layer").onclick = () => { toggleTraffic(!(trafficTiles && map.hasLayer(trafficTiles))); renderTraffic(); };
      $("#tt-clear").onclick = () => { SVC.setTomtomKey(""); toggleTraffic(false); incidentLayer.clearLayers(); renderTraffic(); };
    } else {
      $("#tt-save").onclick = () => { const v = $("#tt-key").value.trim(); if (!v) return; SVC.setTomtomKey(v); toggleTraffic(true); renderTraffic(); };
    }
    if (!w) loadWeather(anchor());
  }
  function toggleTraffic(on) {
    const key = SVC.tomtomKey();
    if (on && !key) { toast("Add a TomTom key in the Traffic tab first."); switchTab("traffic"); setSheet("half"); $('[data-layer="traffic"]').checked = false; return; }
    if (on) { trafficTiles = trafficTiles || L.tileLayer(SVC.tomtomFlowUrl(key), { opacity: 0.85, zIndex: 5, maxZoom: 19 }); trafficTiles.addTo(map); incidentLayer.addTo(map); }
    else { if (trafficTiles) map.removeLayer(trafficTiles); }
    $('[data-layer="traffic"]').checked = on;
  }
  async function loadIncidents(key) {
    clearTimeout(incTimer);
    const box = $("#inc-list");
    try {
      const inc = await SVC.incidents(key);
      incidentLayer.clearLayers();
      const items = inc.map((x) => ({ ...x.properties, geom: x.geometry })).sort((a, b) => (b.iconCategory === 8) - (a.iconCategory === 8) || (b.magnitudeOfDelay || 0) - (a.magnitudeOfDelay || 0));
      items.forEach((it) => {
        if (!it.geom) return;
        const closed = it.iconCategory === 8 || it.iconCategory === 7;
        const col = closed ? "#111" : it.magnitudeOfDelay >= 3 ? "#d7262b" : "#d08a00";
        const coords = it.geom.type === "LineString" ? it.geom.coordinates.map((c) => [c[1], c[0]]) : [[it.geom.coordinates[1], it.geom.coordinates[0]]];
        const desc = (it.events || []).map((e) => e.description).join(", ");
        const layer = coords.length > 1 ? L.polyline(coords, { color: col, weight: 6, opacity: 0.85, dashArray: closed ? "4 6" : null }) : L.circleMarker(coords[0], { radius: 7, color: col });
        layer.bindPopup(`<div class="pop-title">${closed ? "⛔" : "⚠️"} ${esc(SVC.INCIDENT_CAT[it.iconCategory] || "Incident")}</div><div>${esc(desc)}</div><div class="muted">${esc(it.from || "")} → ${esc(it.to || "")}</div>${it.delay ? `<div>Delay ~${SVC.fmtDur(it.delay)}</div>` : ""}`).addTo(incidentLayer);
      });
      incidentLayer.addTo(map);
      if (box && document.body.contains(box)) {
        const closures = items.filter((i) => i.iconCategory === 8 || i.iconCategory === 7).length;
        box.innerHTML = `<div class="stats"><div class="stat"><b>${items.length}</b><span>incidents</span></div><div class="stat"><b>${closures}</b><span>closures</span></div><div class="stat"><b>${items.filter((i) => i.iconCategory === 6).length}</b><span>jams</span></div></div>
          <div class="cards">${items.slice(0, 12).map((it) => `<div class="card"><div class="badge-num" style="background:${it.iconCategory === 8 ? "#111" : "#d7262b"}">${it.iconCategory === 8 ? "⛔" : "⚠️"}</div><div class="body"><div class="t">${esc(SVC.INCIDENT_CAT[it.iconCategory] || "Incident")}${it.roadNumbers && it.roadNumbers.length ? " · " + esc(it.roadNumbers.join(", ")) : ""}</div><div class="m">${esc(it.from || "")} → ${esc(it.to || "")}</div></div>${it.delay ? `<div class="r"><b>+${SVC.fmtDur(it.delay)}</b>delay</div>` : ""}</div>`).join("") || '<div class="empty">No incidents reported right now 🎉</div>'}</div>
          <p class="muted" style="font-size:11px">Live from TomTom · refreshes every 3 min · updated ${new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</p>`;
      }
    } catch (e) {
      if (box && document.body.contains(box)) box.innerHTML = `<div class="note warn">TomTom request failed (${esc(e.message)}). Check that the key is valid and has Traffic API access.</div>`;
    }
    incTimer = setTimeout(() => { if (state.tab === "traffic" || (trafficTiles && map.hasLayer(trafficTiles))) loadIncidents(key); }, 180000);
  }

  /* ================= SOS ================= */
  $("#sos").onclick = () => { switchTab("sos"); setSheet("full"); };
  async function renderSOS() {
    const o = origin();
    const loc = o || anchor();
    const mapsLink = o ? `https://maps.google.com/?q=${o[0].toFixed(6)},${o[1].toFixed(6)}` : null;
    $("#pane-sos").innerHTML = `<h2 class="sec">Help & Safety<span class="bn">সাহায্য</span></h2>
      <div class="sos-grid">${PUJO.EMERGENCY.map((e) => `<a class="sos-btn ${e.primary ? "primary" : ""}" href="tel:${e.num}"><span class="e">${e.icon}</span><div><b>${e.display || e.num}</b>${e.label}</div></a>`).join("")}</div>
      <h3 class="sub">Share where I am</h3>
      ${o ? `<div class="btn-row"><button class="btn primary" id="sh-loc">📤 Share my live location</button><a class="btn" href="sms:?&body=${encodeURIComponent("I need help. My location: " + mapsLink)}">💬 SMS</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("I need help. My location: " + mapsLink)}">WhatsApp</a></div>
            <div class="muted" style="font-size:12px">${o[0].toFixed(5)}, ${o[1].toFixed(5)} · ±${Math.round(state.acc || 0)} m</div>`
        : `<div class="note warn">Location unavailable — enable GPS so you can share your exact spot.</div>`}
      <h3 class="sub">Nearest hospitals & police ${o ? "" : "(around map centre)"}</h3>
      <div id="sos-list">${loader("Finding hospitals, police stations, pharmacies…")}</div>
      <h3 class="sub">Crowd safety</h3>
      <div class="note">👨‍👩‍👧 Agree on a meeting point (a pandal gate or Metro exit) before you enter. Write your phone number on children's wrists. Every big pandal has a police kiosk and lost-and-found desk — head there if separated.</div>
      <div class="note">🌡️ Carry water, avoid peak 8 pm–midnight queues with elders, and step aside at the first sign of a crush — move diagonally away from the flow.</div>`;
    const sh = $("#sh-loc"); if (sh) sh.onclick = () => share("My location", "I'm here (Pujo Path): " + mapsLink, mapsLink);
    try {
      const els = await SVC.emergencyPOIs(loc);
      const K = { hospital: ["🏥", "Hospital", "hosp"], clinic: ["⚕️", "Clinic", "hosp"], police: ["🚓", "Police", "police"], pharmacy: ["💊", "Pharmacy", ""], toilets: ["🚻", "Toilet", ""], atm: ["🏧", "ATM", ""], drinking_water: ["🚰", "Water", ""] };
      const all = els.map((e) => ({ ...e, d: SVC.dist(loc, e.ll), k: K[e.tags.amenity] || ["📍", e.tags.amenity, ""] })).sort((a, b) => a.d - b.d);
      poiLayer.clearLayers();
      all.slice(0, 80).forEach((e) => L.marker(e.ll, { icon: L.divIcon({ html: `<div class="poi ${e.k[2]}">${e.k[0]}</div>`, className: "", iconSize: [28, 28] }) })
        .bindPopup(`<div class="pop-title">${e.k[0]} ${esc(e.tags.name || e.k[1])}</div><div class="muted">${e.k[1]} · ${SVC.fmtDist(e.d)}</div>${e.tags.phone ? `<a href="tel:${esc(e.tags.phone.split(";")[0])}">📞 ${esc(e.tags.phone.split(";")[0])}</a><br>` : ""}<button class="btn" style="margin-top:6px;padding:6px 10px" data-poi-go data-ll="${e.ll.join(",")}" data-name="${esc(e.tags.name || e.k[1])}">Directions</button>`).addTo(poiLayer));
      const pick = (types, n) => all.filter((e) => types.includes(e.tags.amenity) && (e.tags.name || e.tags.amenity !== "hospital")).slice(0, n);
      const row = (e) => `<div class="card"><div class="badge-num" style="background:var(--surface-2);font-size:20px">${e.k[0]}</div><div class="body"><div class="t">${esc(e.tags.name || e.k[1])}</div><div class="m"><span>${e.k[1]}</span>${e.tags.emergency === "yes" ? '<span class="tag crowd-high">24×7 emergency</span>' : ""}</div></div>
        <div class="r"><b>${SVC.fmtDist(e.d)}</b>${e.tags.phone ? `<a href="tel:${esc(e.tags.phone.split(";")[0])}">Call</a> · ` : ""}<a href="${gmaps(e.ll, o, "car")}" target="_blank" rel="noopener">Go</a></div></div>`;
      const box = $("#sos-list"); if (!box) return;
      const special = /eye|dental|dent|ayurved|homoeo|homeo|skin|ivf|vet/i;
      const hosp = all.filter((e) => e.tags.amenity === "hospital" && e.tags.name)
        .sort((a, b) => ((special.test(a.tags.name) ? 1 : 0) - (special.test(b.tags.name) ? 1 : 0)) || ((b.tags.emergency === "yes") - (a.tags.emergency === "yes")) || a.d - b.d).slice(0, 4), pol = pick(["police"], 3), ph = pick(["pharmacy", "clinic"], 3), wc = pick(["toilets", "drinking_water", "atm"], 4);
      box.innerHTML = `<div class="cards">${hosp.map(row).join("")}${pol.map(row).join("")}</div>
        ${ph.length ? `<h3 class="sub">Pharmacy & clinics</h3><div class="cards">${ph.map(row).join("")}</div>` : ""}
        ${wc.length ? `<h3 class="sub">Toilets · water · ATM</h3><div class="cards">${wc.map(row).join("")}</div>` : ""}
        <p class="muted" style="font-size:11px">Live from OpenStreetMap. In a medical emergency call 112 / 102 first.</p>`;
    } catch (e) { const box = $("#sos-list"); if (box) box.innerHTML = `<div class="note warn">Couldn't load nearby services. Call 112 for any emergency.</div>`; }
  }

  /* ================= Layers menu ================= */
  $("#fab-layers").onclick = (e) => { e.stopPropagation(); $("#layers-menu").hidden = !$("#layers-menu").hidden; };
  $$("#layers-menu input").forEach((inp) => inp.addEventListener("change", () => {
    const on = inp.checked;
    switch (inp.dataset.layer) {
      case "pujas": on ? map.addLayer(cluster) : map.removeLayer(cluster); break;
      case "advisories": on ? map.addLayer(advisoryLayer) : map.removeLayer(advisoryLayer); break;
      case "metro": on ? map.addLayer(metroLayer) : map.removeLayer(metroLayer); if (on && !state.metro.length) toast("Loading Metro stations…"); break;
      case "traffic": toggleTraffic(on); break;
      case "heat": on ? (drawHeat(), map.addLayer(heatLayer)) : map.removeLayer(heatLayer); break;
    }
  }));
  function drawHeat() {
    heatLayer.clearLayers();
    PUJAS.forEach((p) => { const v = SVC.crowd(p.tier); L.circle(p.ll, { radius: 120 + v * 380, stroke: false, fillColor: v > 0.65 ? "#ff2d2d" : v > 0.35 ? "#ff9f1c" : "#3ec46d", fillOpacity: 0.18 + v * 0.22, interactive: false }).addTo(heatLayer); });
  }
  setInterval(() => { if (map.hasLayer(heatLayer)) drawHeat(); renderRibbon(); }, 5 * 60e3);

  /* ================= Search ================= */
  const sInput = $("#search"), sRes = $("#search-results");
  let sT;
  function closeSearch() { sRes.classList.remove("open"); }
  sInput.addEventListener("input", () => {
    clearTimeout(sT);
    const q = sInput.value.trim().toLowerCase();
    if (!q) return closeSearch();
    const local = PUJAS.filter((p) => (p.name + " " + p.bn + " " + (p.theme || "") + " " + PUJO.ZONES[p.zone].en).toLowerCase().includes(q)).slice(0, 6);
    const draw = (places) => {
      sRes.innerHTML = local.map((p) => `<button data-s-puja="${p.id}">🛕<div><b>${esc(p.name)}</b> <span class="bn" style="color:var(--red)">${p.bn}</span><small>${PUJO.ZONES[p.zone].en}${p.theme ? " · ✦ " + esc(p.theme) : ""}</small></div></button>`).join("") +
        (places || []).map((pl, i) => `<button data-s-place="${i}">📍<div><b>${esc(pl.display_name.split(",")[0])}</b><small>${esc(pl.display_name.split(",").slice(1, 3).join(","))}</small></div></button>`).join("") ||
        `<div class="empty">${places ? "No results" : "Searching places…"}</div>`;
      sRes.classList.add("open");
      $$("[data-s-puja]", sRes).forEach((b) => (b.onclick = () => { closeSearch(); sInput.value = ""; showDetail(b.dataset.sPuja); }));
      $$("[data-s-place]", sRes).forEach((b) => (b.onclick = () => {
        const pl = places[+b.dataset.sPlace], ll = [+pl.lat, +pl.lon];
        closeSearch(); sInput.blur();
        map.flyTo(ll, 16);
        const m = L.marker(ll).addTo(poiLayer).bindPopup(`<div class="pop-title">${esc(pl.display_name.split(",")[0])}</div><button class="btn" style="margin-top:6px;padding:6px 10px" data-poi-go data-ll="${ll.join(",")}" data-name="${esc(pl.display_name.split(",")[0])}">Directions</button>`).openPopup();
      }));
    };
    draw(null);
    if (q.length >= 3) sT = setTimeout(() => SVC.search(sInput.value.trim()).then(draw).catch(() => draw([])), 450);
  });
  sInput.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSearch(); sInput.blur(); } if (e.key === "Enter") { const f = $("button", sRes); if (f) f.click(); } });

  /* ================= Hash / deep links ================= */
  function handleHash() {
    const h = location.hash.slice(1), [k, v] = h.split("=");
    if (k === "p" && byId[v]) showDetail(v);
    else if (k === "c" && PUJO.CIRCUITS.some((c) => c.id === v)) showCircuit(v);
  }

  /* ================= Boot ================= */
  renderRibbon();
  renderExplore();
  loadWeather();
  startGeo();
  if (SVC.tomtomKey()) { /* key present: keep flow off until asked, but incidents load on Traffic tab */ }
  setTimeout(() => { $("#splash").classList.add("gone"); burst(36); handleHash(); }, 2700);
  $("#splash").addEventListener("click", () => $("#splash").classList.add("gone"));
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
