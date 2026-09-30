const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { CUSTOM_FONT_PRESETS: presets, getClientArticleFontConfig } = require("../include/util/article_font");
const source = (file) => fs.readFileSync(path.join(__dirname, "../source", file), "utf8");

class Control {
  constructor(dataset = {}) {
    Object.assign(this, { dataset, value: "", textContent: "", events: {}, checked: false, disabled: false, classList: { toggle() {} } });
  }
  addEventListener(type, fn) { this.events[type] = fn; }
  setAttribute() {}
  closest() { return null; }
}

function preferences(initial) {
  let stored = JSON.stringify(initial);
  const styles = new Map();
  const listeners = {};
  const checks = presets.map((preset) => new Control({ fontPreset: preset.id }));
  const fields = ["serif", "sans-serif", "mono", "handwriting"].map((type) => new Control({ fontFamily: type }));
  const imports = new Control();
  const reset = new Control();
  const root = new Control();
  root.querySelector = (selector) => ({ ".font-custom-imports": imports, ".font-custom-reset": reset })[selector] || null;
  root.querySelectorAll = (selector) => ({ "[data-font-preset]": checks, ".font-custom-family-input": fields })[selector] || [];
  const window = {
    __GNIX_ARTICLE_FONT_CONFIG__: getClientArticleFontConfig(),
    addEventListener: (type, fn) => { listeners[type] = fn; },
    dispatchEvent: (event) => listeners[event.type]?.(event),
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ getPropertyValue: () => "system-ui" }),
  };
  const document = {
    readyState: "complete",
    querySelectorAll: (selector) => selector === "[data-preferences-page]" ? [root] : [],
    documentElement: { dataset: {}, style: {
      getPropertyValue: (key) => styles.get(key) || "",
      setProperty: (key, value) => styles.set(key, value),
      removeProperty: (key) => styles.delete(key),
    } },
  };
  const context = vm.createContext({ window, document,
    localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
    CustomEvent: class { constructor(type, { detail }) { this.type = type; this.detail = detail; } },
  });
  vm.runInContext(source("js/article-font-utils.js"), context);
  window.__GNIX_ARTICLE_FONT_UTILS__.applyCustomFontImports = () => {};
  window.__GNIX_ARTICLE_FONT_UTILS__.applyFontPresets = () => {};
  vm.runInContext(source("js/preferences.js"), context);
  return { checks, fields, imports, reset, styles, read: () => JSON.parse(stored), toggle(index, checked) {
    checks[index].checked = checked;
    checks[index].events.change();
  } };
}

test("checkboxes independently enable fonts without changing the reading category or manual imports", () => {
  const initial = { type: "serif", customFonts: { imports: ["https://example.com/manual.css"], families: { "sans-serif": '"Original", sans-serif' } } };
  const ui = preferences(initial);
  ui.toggle(0, true);
  ui.toggle(1, true);
  assert.deepEqual(ui.read().customFonts.presets, [presets[0].id, presets[1].id]);
  assert.equal(ui.read().type, "serif");
  assert.deepEqual(ui.read().customFonts.imports, initial.customFonts.imports);
  assert.equal(ui.read().customFonts.families["sans-serif"], initial.customFonts.families["sans-serif"]);
  assert.equal(ui.styles.get("--font-sans-serif"), presets[0].family);
  assert.equal(ui.fields[1].disabled, true);
  const restored = preferences(ui.read());
  assert.equal(restored.checks[0].checked, true);
  restored.toggle(0, false);
  assert.equal(restored.styles.get("--font-sans-serif"), initial.customFonts.families["sans-serif"]);
  assert.equal(restored.fields[1].disabled, false);
  assert.deepEqual(restored.read().customFonts.presets, [presets[1].id]);
  restored.reset.events.click();
  assert.deepEqual(restored.read().customFonts, { imports: [], families: {}, presets: [] });
  assert.ok(restored.checks.every((input) => !input.checked));
});

test("only known preset IDs survive normalization", () => {
  const ui = preferences({ customFonts: { presets: ["unknown", presets[0].id, presets[0].id] } });
  ui.toggle(1, true);
  assert.deepEqual(ui.read().customFonts.presets, [presets[0].id, presets[1].id]);
});

function worker({ quota = false } = {}) {
  const handlers = {};
  const cache = new Map();
  let calls = 0, offline = false;
  const context = vm.createContext({ URL, Set, Promise,
    self: { addEventListener: (type, fn) => { handlers[type] = fn; } },
    caches: { open: async () => ({
      match: async (request) => cache.get(request.url)?.clone(),
      put: async (request, response) => { if (quota) throw Error("quota"); cache.set(request.url, response); },
    }) },
    fetch: async () => { calls++; if (offline) throw Error("offline"); return new Response("font bytes"); },
  });
  vm.runInContext(source("font-cache-sw.js"), context);
  return { get calls() { return calls; }, set offline(value) { offline = value; }, async request(url, destination) {
    let response;
    const pending = [];
    handlers.fetch({ request: { url, destination, method: "GET" }, respondWith(p) { response = p; }, waitUntil(p) { pending.push(p); } });
    const result = response ? await response : null;
    await Promise.all(pending);
    return result;
  } };
}

test("only font resources are cached; downloaded fonts remain available offline", async () => {
  const sw = worker();
  assert.equal(await sw.request("https://example.com/article", "document"), null);
  assert.equal(await sw.request("https://example.com/app.js", "script"), null);
  assert.equal(await sw.request("https://fonts.googleapis.com/css2?family=Other", "style"), null);
  const url = "https://fonts.gstatic.com/s/elmssans/v7/font.woff2";
  assert.equal(await (await sw.request(url, "font")).text(), "font bytes");
  assert.equal(sw.calls, 1);
  sw.offline = true;
  assert.equal(await (await sw.request(url, "font")).text(), "font bytes");
  assert.equal(sw.calls, 1);
});

test("CSS revalidation tolerates offline mode and storage quota never breaks font loading", async () => {
  const sw = worker();
  await sw.request(presets[0].css, "style");
  sw.offline = true;
  assert.equal(await (await sw.request(presets[0].css, "style")).text(), "font bytes");
  const limited = worker({ quota: true });
  assert.equal(await (await limited.request(presets[2].css, "style")).text(), "font bytes");
});

test("enabling a preset adds only its stylesheet; cancelling a pending load leaves no link", async () => {
  const links = [];
  const context = vm.createContext({ URL, Map, Promise, setTimeout, clearTimeout,
    window: { isSecureContext: false, dispatchEvent() {} }, navigator: {},
    CustomEvent: class {},
    document: { createElement: () => ({ dataset: {}, remove() { links.splice(links.indexOf(this), 1); } }), head: { appendChild: (link) => links.push(link) } },
  });
  vm.runInContext(source("js/font-presets.js").replace("export function", "function").replaceAll("import.meta.url", '"https://example.com/js/font-presets.js"'), context);
  context.applyPresetFonts([presets[0].id], presets);
  context.applyPresetFonts([], presets);
  await new Promise(setImmediate);
  assert.equal(links.length, 0);
  context.applyPresetFonts([presets[2].id], presets);
  await new Promise(setImmediate);
  assert.equal(links.length, 1);
  assert.equal(links[0].href, presets[2].css);
  context.applyPresetFonts([], presets);
  assert.equal(links.length, 0);
});
