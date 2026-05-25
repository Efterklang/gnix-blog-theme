const STORAGE_KEY = "themePreference";
const DEFAULT_THEME = "system";

const SYSTEM_THEME = Object.freeze({
  dark: "mocha",
  light: "nord",
});

const THEME_OPTIONS = Object.freeze([
  { name: "System", value: DEFAULT_THEME },
  { name: "Catppuccin Latte", value: "latte", colorScheme: "light" },
  { name: "Nord Light", value: "nord", colorScheme: "light" },
  { name: "Song Porcelain", value: "song_ci", colorScheme: "light" },
  { name: "Nord Night", value: "nord_night", colorScheme: "night" },
  { name: "Rosé Pine", value: "rose_pine", colorScheme: "night" },
  { name: "Catppuccin Mocha", value: "mocha", colorScheme: "night" },
  { name: "Tokyo Night", value: "tokyo_night", colorScheme: "night" },
]);

function getClientThemeConfig() {
  const themeClassMap = Object.fromEntries(
    THEME_OPTIONS.filter((theme) => theme.value !== DEFAULT_THEME).map((theme) => [theme.value, theme.colorScheme]),
  );
  return {
    storageKey: STORAGE_KEY,
    defaultTheme: DEFAULT_THEME,
    systemTheme: SYSTEM_THEME,
    themes: THEME_OPTIONS,
    themeClassMap,
  };
}

function stringifyForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function getThemeInitScript() {
  const config = stringifyForScript(getClientThemeConfig());

  return `
(function() {
  var config = ${config};
  var STORAGE_KEY = config.storageKey;
  var DEFAULT = config.defaultTheme;
  var themeClassMap = config.themeClassMap || {};
  var THEME_CLASSES = Array.from(new Set(Object.values(themeClassMap)));
  var html = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function isValidTheme(t) {
    return t === DEFAULT || Object.prototype.hasOwnProperty.call(themeClassMap, t);
  }

  function resolveTheme(t) {
    if (t !== DEFAULT) return t;
    return darkQuery.matches ? config.systemTheme.dark : config.systemTheme.light;
  }

  function getThemePreference() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return isValidTheme(stored) ? stored : DEFAULT;
    } catch (_) { return DEFAULT; }
  }

  function applyTheme(theme, persist) {
    var preference = isValidTheme(theme) ? theme : DEFAULT;
    var resolved = resolveTheme(preference);
    var themeClass = themeClassMap[resolved];
    html.setAttribute("data-theme", resolved);
    if (THEME_CLASSES.length) html.classList.remove.apply(html.classList, THEME_CLASSES);
    if (themeClass) html.classList.add(themeClass);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, preference); } catch (_) {}
    }
  }

  window.__GNIX_THEME_CONFIG__ = config;
  window.applyTheme = applyTheme;
  window.getThemePreference = getThemePreference;

  applyTheme(getThemePreference());

  darkQuery.addEventListener("change", function() {
    if (getThemePreference() === DEFAULT) applyTheme(DEFAULT);
  });
})();
`;
}

module.exports = {
  DEFAULT_THEME,
  STORAGE_KEY,
  SYSTEM_THEME,
  THEME_OPTIONS,
  getClientThemeConfig,
  getThemeInitScript,
};
