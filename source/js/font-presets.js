// Download selected font files without applying a font family to the page.
// Share Cache Storage with the worker so native @font-face requests reuse them.
const FONT_CACHE = "gnix-fonts-v1";
const entries = new Map();
let cacheSetup;

function report(id, state) {
  window.dispatchEvent(new CustomEvent("gnix:font-preset-state", { detail: { id, state } }));
}

async function enableFontCache() {
  if (!window.isSecureContext || !navigator.serviceWorker) return;
  const workerUrl = new URL("../font-cache-sw.js", import.meta.url);
  const scope = new URL("../", import.meta.url).href;
  const existing = await navigator.serviceWorker.getRegistration(scope);
  const existingWorker = existing?.active || existing?.waiting || existing?.installing;
  // An unrelated worker must retain ownership of this site's scope.
  if (existingWorker && !new URL(existingWorker.scriptURL).pathname.split("/").pop().startsWith("font-cache-sw.")) return;
  await navigator.serviceWorker.register(workerUrl.href, { scope });
  if (navigator.serviceWorker.controller) return;
  await new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", finish);
      resolve();
    };
    const timer = setTimeout(finish, 1500);
    navigator.serviceWorker.addEventListener("controllerchange", finish);
    if (navigator.serviceWorker.controller) finish();
  });
}

async function downloadFontFiles(link, signal) {
  const urls = new Set();
  // All presets expose their stylesheet through CORS. Reading CSSOM preserves
  // variable font styles and every unicode-range subset supplied by the provider.
  for (const rule of link.sheet.cssRules) {
    if (rule.type !== 5) continue; // CSSFontFaceRule
    const src = rule.style.getPropertyValue("src");
    for (const match of src.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)) {
      urls.add(new URL(match[1] || match[2] || match[3], link.href).href);
    }
  }
  if (!urls.size) throw new Error("No font files found in the preset stylesheet");

  let cache;
  try { cache = await window.caches?.open(FONT_CACHE); } catch (_) {}
  let cachedAll = Boolean(cache);
  const pending = [...urls];
  let next = 0;
  const download = async () => {
    while (next < pending.length) {
      signal.throwIfAborted();
      const url = pending[next++];
      if (cache) {
        try { if (await cache.match(url)) continue; } catch (_) {}
      }
      const response = await fetch(url, { signal, mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
      const saved = cache ? cache.put(url, response.clone()).catch(() => { cachedAll = false; }) : Promise.resolve();
      // Fetch resolves at headers; wait for the complete file before reporting ready.
      await Promise.all([response.arrayBuffer(), saved]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, download));
  return cachedAll ? "ready" : "uncached";
}

export function applyPresetFonts(ids, presets) {
  const selected = new Map(presets.filter((preset) => ids.includes(preset.id)).map((preset) => [preset.id, preset]));
  for (const [id, entry] of entries) {
    if (selected.has(id)) continue;
    entry.controller.abort();
    entry.link?.remove();
    entries.delete(id);
    report(id, "");
  }
  for (const [id, preset] of selected) {
    const current = entries.get(id);
    if (current) {
      report(id, current.state);
      continue;
    }
    const entry = { link: null, state: "loading", controller: new AbortController() };
    entries.set(id, entry);
    report(id, "loading");
    // Blocked storage, private browsing or an existing worker falls back to HTTP caching.
    cacheSetup ||= enableFontCache().catch(() => {});
    cacheSetup.then(() => {
      if (entries.get(id) !== entry) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.crossOrigin = "anonymous";
      link.href = preset.css;
      link.dataset.gnixFontPreset = id;
      const update = (state) => {
        if (entries.get(id) !== entry) return;
        entry.state = state;
        report(id, state);
      };
      link.onload = () => {
        if (entries.get(id) !== entry) return;
        downloadFontFiles(link, entry.controller.signal).then(update).catch(() => {
          entry.controller.abort();
          update("error");
        });
      };
      link.onerror = () => update("error");
      entry.link = link;
      document.head.appendChild(link);
    });
  }
}
