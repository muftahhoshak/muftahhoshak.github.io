// يخلي الموقع يفتح بسرعة ويتثبت كتطبيق
const V = "muftah-v6";
const SHELL = ["./", "index.html", "app.css", "app.js", "common.js", "config.js", "mark.svg", "icon-192.png", "bg.svg"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
