const STORAGE_KEY = "gnix-article-font";

const DEFAULT_SETTINGS = Object.freeze({
  size: "medium",
  type: "serif",
  lineHeight: 1.7,
  weight: "regular",
});

const SIZE_OPTIONS = Object.freeze(["small", "medium-small", "medium", "medium-large", "large"]);
const FONT_OPTIONS = Object.freeze(["serif", "sans-serif", "mono", "handwriting"]);
const WEIGHT_OPTIONS = Object.freeze(["light", "regular", "medium"]);
const LINE_HEIGHT = Object.freeze({
  min: 1.45,
  max: 1.9,
});

const CUSTOM_FONT_FAMILY_OPTIONS = Object.freeze({
  serif: "--font-serif",
  "sans-serif": "--font-sans-serif",
  handwriting: "--font-handwriting",
});

const CUSTOM_FONT_IMPORT_LIMIT = 6;

function getClientArticleFontConfig() {
  return {
    storageKey: STORAGE_KEY,
    defaultSettings: DEFAULT_SETTINGS,
    sizeOptions: SIZE_OPTIONS,
    fontOptions: FONT_OPTIONS,
    weightOptions: WEIGHT_OPTIONS,
    lineHeight: LINE_HEIGHT,
    customFonts: {
      familyOptions: CUSTOM_FONT_FAMILY_OPTIONS,
      importLimit: CUSTOM_FONT_IMPORT_LIMIT,
    },
  };
}

function stringifyForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function getArticleFontInitScript() {
  const config = stringifyForScript(getClientArticleFontConfig());

  return `
(function() {
  var config = ${config};
  var defaults = config.defaultSettings || {};
  var stored = null;
  var parsed = {};

  window.__GNIX_ARTICLE_FONT_CONFIG__ = config;

  try {
    stored = localStorage.getItem(config.storageKey);
  } catch (_) {}

  if (stored) {
    try {
      parsed = JSON.parse(stored) || {};
    } catch (_) {}
  }

  function hasOption(options, value) {
    return Array.isArray(options) && options.indexOf(value) !== -1;
  }

  function normalizeCustomFontImport(value) {
    if (typeof value !== "string") return null;

    var href = value.trim();
    if (!href || /[\\s<>"']/.test(href) || /^javascript:/i.test(href)) return null;
    if (!/^(https?:)?\\/\\//i.test(href) && href.charAt(0) !== "/") return null;

    return href;
  }

  function normalizeCustomFontFamily(value) {
    if (typeof value !== "string") return null;

    var family = value.trim();
    if (!family || /[{};<>]/.test(family)) return null;

    return family;
  }

  function normalizeCustomFonts(value) {
    var customFonts = value && typeof value === "object" ? value : {};
    var familyOptions = config.customFonts && config.customFonts.familyOptions ? config.customFonts.familyOptions : {};
    var importLimit = Number(config.customFonts && config.customFonts.importLimit);
    var importSource = customFonts.imports;
    var importValues = Array.isArray(importSource)
      ? importSource
      : typeof importSource === "string"
        ? importSource.split(/\\r?\\n/)
        : [];
    var imports = [];
    var families = {};

    if (!Number.isFinite(importLimit) || importLimit < 1) importLimit = 6;

    importValues.forEach(function(value) {
      var href = normalizeCustomFontImport(value);
      if (href && imports.indexOf(href) === -1 && imports.length < importLimit) {
        imports.push(href);
      }
    });

    Object.keys(familyOptions).forEach(function(key) {
      var family = normalizeCustomFontFamily(customFonts.families && customFonts.families[key]);
      if (family) families[key] = family;
    });

    return {
      imports: imports,
      families: families
    };
  }

  function applyCustomFontImports(imports) {
    var head = document.head;
    if (!head || !Array.isArray(imports)) return;

    imports.forEach(function(href, index) {
      var existing = Array.prototype.some.call(document.querySelectorAll('link[data-gnix-custom-font="true"]'), function(link) {
        return link.href === href || link.getAttribute("href") === href;
      });
      if (existing) return;

      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-gnix-custom-font", "true");
      link.setAttribute("data-gnix-custom-font-index", String(index));
      head.appendChild(link);
    });
  }

  function applyCustomFontFamilies(html, families) {
    var familyOptions = config.customFonts && config.customFonts.familyOptions ? config.customFonts.familyOptions : {};
    Object.keys(familyOptions).forEach(function(key) {
      if (families[key]) html.style.setProperty(familyOptions[key], families[key]);
    });
  }

  function normalizeLineHeight(value) {
    if (value === "compact") return 1.55;
    if (value === "normal") return 1.7;
    if (value === "relaxed") return 1.85;

    var parsedValue = Number(value);
    var min = Number(config.lineHeight && config.lineHeight.min);
    var max = Number(config.lineHeight && config.lineHeight.max);
    var fallback = Number(defaults.lineHeight);

    if (!Number.isFinite(parsedValue)) parsedValue = Number.isFinite(fallback) ? fallback : 1.7;
    if (!Number.isFinite(min)) min = 1.45;
    if (!Number.isFinite(max)) max = 1.9;

    return Math.min(max, Math.max(min, parsedValue));
  }

  var candidate = Object.assign({}, defaults, parsed);
  var settings = {
    size: hasOption(config.sizeOptions, candidate.size) ? candidate.size : defaults.size,
    type: hasOption(config.fontOptions, candidate.type) ? candidate.type : defaults.type,
    lineHeight: normalizeLineHeight(candidate.lineHeight),
    weight: hasOption(config.weightOptions, candidate.weight) ? candidate.weight : defaults.weight,
    customFonts: normalizeCustomFonts(candidate.customFonts)
  };
  var html = document.documentElement;

  applyCustomFontImports(settings.customFonts.imports);
  applyCustomFontFamilies(html, settings.customFonts.families);
  html.setAttribute("data-article-font-size", settings.size);
  html.setAttribute("data-article-font-family", settings.type);
  html.setAttribute("data-article-line-height", String(settings.lineHeight));
  html.setAttribute("data-article-font-weight", settings.weight);
  html.style.setProperty("--article-line-height", String(settings.lineHeight));
})();
`;
}

module.exports = {
  CUSTOM_FONT_FAMILY_OPTIONS,
  CUSTOM_FONT_IMPORT_LIMIT,
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  LINE_HEIGHT,
  SIZE_OPTIONS,
  STORAGE_KEY,
  WEIGHT_OPTIONS,
  getArticleFontInitScript,
  getClientArticleFontConfig,
};
