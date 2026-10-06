// Scoped runtime cache for recommended font CSS and font binaries only.
const FONT_CACHE = "gnix-fonts-v1";
const FONT_HOSTS = new Set(["fonts.gstatic.com", "fontsapi.zeoseven.com"]);
const GOOGLE_FAMILIES = new Set(["Elms Sans", "Geist Mono", "Noto Serif SC"]);

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function isPresetStylesheet(url) {
  if (url.origin === "https://fontsapi.zeoseven.com" && ["/5/main/result.css", "/505/main/result.css"].includes(url.pathname)) return true;
  if (url.origin !== "https://fonts.googleapis.com" || url.pathname !== "/css2") return false;
  const families = url.searchParams.getAll("family");
  return families.length > 0 && families.every((family) => GOOGLE_FAMILIES.has(family.split(":")[0]));
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok && response.type !== "opaque") {
    // A quota/storage failure must not turn a successful font download into an error.
    try { await cache.put(request, response.clone()); } catch (_) {}
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const stylesheet = isPresetStylesheet(url);
  const font = request.destination === "font" && url.protocol === "https:" && FONT_HOSTS.has(url.hostname);
  if (!stylesheet && !font) return;

  // Register the background task synchronously while the fetch event is active.
  let refresh = Promise.resolve();
  const response = (async () => {
    let cache;
    try { cache = await caches.open(FONT_CACHE); } catch (_) { return fetch(request); }
    let cached;
    try { cached = await cache.match(request); } catch (_) {}
    if (!cached) return fetchAndCache(request, cache);
    // CSS may point to a new font revision; binaries use versioned/content-hashed URLs.
    if (stylesheet) refresh = fetchAndCache(request, cache).catch(() => {});
    return cached;
  })();
  event.respondWith(response);
  event.waitUntil(response.then(() => refresh).catch(() => {}));
});
