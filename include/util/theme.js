const STORAGE_KEY = "themePreference";
const DEFAULT_THEME = "system";

const SYSTEM_THEME = Object.freeze({
  dark: "mocha",
  light: "nord",
});

const THEME_OPTIONS = Object.freeze([
  { label: "🖥️ SYSTEM", name: "System", value: DEFAULT_THEME },
  { label: "🌻 LATTE", name: "Catppuccin Latte", value: "latte", colorScheme: "light" },
  { label: "🦭 NORD", name: "Nord Light", value: "nord", colorScheme: "light" },
  { label: "🐻‍❄️ NORD NIGHT", name: "Nord Night", value: "nord_night", colorScheme: "night" },
  { label: "🌹 ROSE PINE", name: "Rosé Pine", value: "rose_pine", colorScheme: "night" },
  { label: "🌿 MOCHA", name: "Catppuccin Mocha", value: "mocha", colorScheme: "night" },
  { label: "🏙 TOKYO NIGHT", name: "Tokyo Night", value: "tokyo_night", colorScheme: "night" },
]);

function getConcreteThemeOptions() {
  return THEME_OPTIONS.filter((theme) => theme.value !== DEFAULT_THEME);
}

function getThemeClassMap() {
  return Object.fromEntries(getConcreteThemeOptions().map((theme) => [theme.value, theme.colorScheme]));
}

function getClientThemeConfig() {
  return {
    storageKey: STORAGE_KEY,
    defaultTheme: DEFAULT_THEME,
    systemTheme: SYSTEM_THEME,
    themes: THEME_OPTIONS,
    themeClassMap: getThemeClassMap(),
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
  var themeClassMap = config.themeClassMap || {};
  var stored = null;

  window.__GNIX_THEME_CONFIG__ = config;

  try {
    stored = localStorage.getItem(config.storageKey);
  } catch (_) {}

  var theme = stored === config.defaultTheme || Object.prototype.hasOwnProperty.call(themeClassMap, stored)
    ? stored
    : config.defaultTheme;
  var resolvedTheme = theme === config.defaultTheme
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? config.systemTheme.dark : config.systemTheme.light
    : theme;
  var html = document.documentElement;
  var themeClass = themeClassMap[resolvedTheme];

  html.setAttribute("data-theme", resolvedTheme);
  if (themeClass) html.classList.add(themeClass);
})();
`;
}

module.exports = {
  DEFAULT_THEME,
  STORAGE_KEY,
  SYSTEM_THEME,
  THEME_OPTIONS,
  getClientThemeConfig,
  getConcreteThemeOptions,
  getThemeClassMap,
  getThemeInitScript,
};
