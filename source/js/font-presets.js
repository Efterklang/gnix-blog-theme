// Keep native @font-face loading (including unicode-range and variable styles).
// The small service worker caches only font requests, never pages or app assets.
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

export function applyPresetFonts(ids, presets) {
  const selected = new Map(presets.filter((preset) => ids.includes(preset.id)).map((preset) => [preset.id, preset]));
  for (const [id, entry] of entries) {
    if (selected.has(id)) continue;
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
    const entry = { link: null, state: "loading" };
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
      link.onload = () => update("ready");
      link.onerror = () => update("error");
      entry.link = link;
      document.head.appendChild(link);
    });
  }
}
