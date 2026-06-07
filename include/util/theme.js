const STORAGE_KEY = "themePreference";
const DEFAULT_THEME = "system";
const DEFAULT_MODE = "system";

const SYSTEM_THEME = Object.freeze({
  dark: "mocha",
  light: "nord",
});

const DEFAULT_PREFERENCES = Object.freeze({
  mode: DEFAULT_MODE,
  light: SYSTEM_THEME.light,
  dark: SYSTEM_THEME.dark,
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
  const themeClassMap = Object.fromEntries(THEME_OPTIONS.filter((theme) => theme.value !== DEFAULT_THEME).map((theme) => [theme.value, theme.colorScheme]));
  const themeSchemeMap = Object.fromEntries(THEME_OPTIONS.filter((theme) => theme.value !== DEFAULT_THEME).map((theme) => [theme.value, theme.colorScheme]));
  return {
    storageKey: STORAGE_KEY,
    defaultTheme: DEFAULT_THEME,
    defaultMode: DEFAULT_MODE,
    defaultPreferences: DEFAULT_PREFERENCES,
    systemTheme: SYSTEM_THEME,
    themes: THEME_OPTIONS,
    themeClassMap,
    themeSchemeMap,
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
  var LEGACY_DEFAULT = config.defaultTheme;
  var DEFAULT_MODE = config.defaultMode || "system";
  var defaultPreferences = config.defaultPreferences || { mode: DEFAULT_MODE, light: config.systemTheme.light, dark: config.systemTheme.dark };
  var themeClassMap = config.themeClassMap || {};
  var themeSchemeMap = config.themeSchemeMap || themeClassMap;
  var THEME_CLASSES = Array.from(new Set(Object.values(themeClassMap)));
  var html = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function isValidTheme(t) {
    return Object.prototype.hasOwnProperty.call(themeClassMap, t);
  }

  function normalizeMode(mode) {
    return mode === "light" || mode === "dark" || mode === DEFAULT_MODE ? mode : DEFAULT_MODE;
  }

  function normalizeThemeForScheme(theme, scheme, fallback) {
    return isValidTheme(theme) && themeSchemeMap[theme] === scheme ? theme : fallback;
  }

  function parseStoredPreference(stored) {
    if (!stored) return null;

    if (stored.charAt(0) === "{") {
      try {
        return JSON.parse(stored);
      } catch (_) {
        return null;
      }
    }

    return stored;
  }

  function normalizePreferences(value) {
    if (typeof value === "string") {
      if (value === LEGACY_DEFAULT || value === DEFAULT_MODE) {
        return Object.assign({}, defaultPreferences, { mode: DEFAULT_MODE });
      }

      if (isValidTheme(value)) {
        var scheme = themeSchemeMap[value];
        var mode = scheme === "light" ? "light" : "dark";
        var fromLegacy = Object.assign({}, defaultPreferences, { mode: mode });
        if (scheme === "light") fromLegacy.light = value;
        if (scheme === "night") fromLegacy.dark = value;
        return fromLegacy;
      }
    }

    var source = value && typeof value === "object" ? value : {};
    var preferences = {
      mode: normalizeMode(source.mode || defaultPreferences.mode),
      light: normalizeThemeForScheme(source.light, "light", defaultPreferences.light),
      dark: normalizeThemeForScheme(source.dark, "night", defaultPreferences.dark),
    };

    return preferences;
  }

  function resolveTheme(preferences) {
    if (preferences.mode === "light") return preferences.light;
    if (preferences.mode === "dark") return preferences.dark;
    return darkQuery.matches ? preferences.dark : preferences.light;
  }

  function getThemePreferences() {
    try {
      return normalizePreferences(parseStoredPreference(localStorage.getItem(STORAGE_KEY)));
    } catch (_) {
      return normalizePreferences();
    }
  }

  function getThemePreference() {
    var preferences = getThemePreferences();
    if (preferences.mode === DEFAULT_MODE) return LEGACY_DEFAULT;
    return preferences.mode === "light" ? preferences.light : preferences.dark;
  }

  function applyThemePreferences(preferences, persist) {
    var preference = normalizePreferences(preferences);
    var resolved = resolveTheme(preference);
    var themeClass = themeClassMap[resolved];
    html.setAttribute("data-theme", resolved);
    html.setAttribute("data-theme-mode", preference.mode);
    html.setAttribute("data-theme-light", preference.light);
    html.setAttribute("data-theme-dark", preference.dark);
    if (THEME_CLASSES.length) html.classList.remove.apply(html.classList, THEME_CLASSES);
    if (themeClass) html.classList.add(themeClass);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preference)); } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent("gnix:theme-change", { detail: { preferences: preference, theme: resolved } }));
    } catch (_) {}
    return preference;
  }

  function applyTheme(theme, persist) {
    var current = getThemePreferences();

    if (theme === LEGACY_DEFAULT || theme === DEFAULT_MODE) {
      current.mode = DEFAULT_MODE;
    } else if (isValidTheme(theme)) {
      var scheme = themeSchemeMap[theme];
      if (scheme === "light") {
        current.mode = "light";
        current.light = theme;
      } else {
        current.mode = "dark";
        current.dark = theme;
      }
    }

    return applyThemePreferences(current, persist);
  }

  function getResolvedTheme() {
    return resolveTheme(getThemePreferences());
  }

  window.__GNIX_THEME_CONFIG__ = config;
  window.applyTheme = applyTheme;
  window.applyThemePreferences = applyThemePreferences;
  window.getThemePreference = getThemePreference;
  window.getThemePreferences = getThemePreferences;
  window.getResolvedTheme = getResolvedTheme;

  applyThemePreferences(getThemePreferences());

  darkQuery.addEventListener("change", function() {
    var preferences = getThemePreferences();
    if (preferences.mode === DEFAULT_MODE) applyThemePreferences(preferences);
  });
})();
`;
}

module.exports = {
  DEFAULT_MODE,
  DEFAULT_PREFERENCES,
  DEFAULT_THEME,
  STORAGE_KEY,
  SYSTEM_THEME,
  THEME_OPTIONS,
  getClientThemeConfig,
  getThemeInitScript,
};
