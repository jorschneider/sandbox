/* CRUX service worker — caches the app shell and voice clips for offline use.
   Shell is network-first (so deploys land); voice clips are cache-first
   (immutable, hashed filenames) so repeat sessions are instant and offline. */
const SHELL = "crux-shell-v2";
const VOICE = "crux-voice-v1";
const SHELL_ASSETS = ["./", "./index.html", "./audio/manifest.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== VOICE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // leave fonts/CDNs alone

  // voice clips: cache-first, fetch + store on miss
  if (url.pathname.includes("/audio/") && url.pathname.endsWith(".mp3")){
    e.respondWith(
      caches.open(VOICE).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(() => hit))
      )
    );
    return;
  }

  // everything else (shell): network-first, fall back to cache when offline
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && (url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname.endsWith("manifest.js"))){
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
