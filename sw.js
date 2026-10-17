/* Pujo Path service worker: offline app shell; live APIs always go to network. */
const CACHE = "pujo-path-v2";
const SHELL = ["./", "index.html", "css/styles.css", "js/data.js", "js/services.js", "js/app.js", "assets/icon.svg", "manifest.webmanifest",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const isShell = u.origin === location.origin || u.hostname === "unpkg.com" || u.hostname.endsWith("gstatic.com") || u.hostname === "fonts.googleapis.com";
  const isTile = u.hostname === "tile.openstreetmap.org";
  if (!isShell && !isTile) return; // live data: straight to network
  e.respondWith(
    fetch(e.request, u.origin === location.origin ? { cache: "no-cache" } : {}).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
