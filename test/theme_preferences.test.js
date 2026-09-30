const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { getThemeInitScript, THEME_OPTIONS } = require("../include/util/theme");

function boot(stored, dark = false) {
  const attributes = {};
  const classes = new Set(["gnix-revealed"]);
  const media = { matches: dark, addEventListener: (_, listener) => (media.onChange = listener) };
  const window = { matchMedia: () => media, addEventListener() {}, dispatchEvent() {} };
  const localStorage = { getItem: () => stored, setItem: (_, value) => (stored = value) };
  vm.runInNewContext(getThemeInitScript(), {
    window,
    localStorage,
    document: {
      documentElement: {
        setAttribute: (name, value) => (attributes[name] = value),
        classList: { remove: (...names) => names.forEach((name) => classes.delete(name)), add: (name) => classes.add(name) },
      },
    },
  });
  return { window, attributes, classes, media, localStorage };
}

test("legacy Sunny preferences keep light mode and migrate to Nord", () => {
  for (const stored of ["sunny", JSON.stringify({ mode: "light", light: "sunny", dark: "mono_dark" })]) {
    const { window, attributes, localStorage } = boot(stored, true);
    assert.equal(attributes["data-theme"], "nord");
    assert.equal(attributes["data-theme-mode"], "light");
    window.applyThemePreferences(window.getThemePreferences(), true);
    const saved = JSON.parse(localStorage.getItem());
    assert.equal(saved.light, "nord");
    assert.equal(saved.mode, "light");
    if (stored.startsWith("{")) assert.equal(saved.dark, "mono_dark");
  }
});

test("remaining themes resolve and replace scheme classes without removing unrelated classes", () => {
  const { window, attributes, classes } = boot();
  for (const theme of THEME_OPTIONS.filter((theme) => theme.colorScheme)) {
    window.applyTheme(theme.value, true);
    assert.equal(window.getResolvedTheme(), theme.value);
    assert.equal(attributes["data-theme"], theme.value);
    assert.equal(attributes["data-theme-mode"], theme.colorScheme === "light" ? "light" : "dark");
    assert.ok(classes.has(theme.colorScheme));
    assert.ok(!classes.has(theme.colorScheme === "light" ? "night" : "light"));
    assert.ok(classes.has("gnix-revealed"));
  }
});

test("system mode follows the OS while a fixed mode stays selected", () => {
  const { window, attributes, media } = boot(JSON.stringify({ mode: "system", light: "sunny", dark: "mono_dark" }));
  assert.equal(attributes["data-theme"], "nord");
  media.matches = true;
  media.onChange();
  assert.equal(attributes["data-theme"], "mono_dark");
  window.applyTheme("latte", true);
  media.onChange();
  assert.equal(attributes["data-theme"], "latte");
});
