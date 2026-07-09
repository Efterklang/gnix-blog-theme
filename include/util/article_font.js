const STORAGE_KEY = "gnix-article-font";

const DEFAULT_SETTINGS = Object.freeze({
  size: "medium",
  type: "serif",
  lineHeight: 1.7,
  weight: "regular",
  width: "medium",
});

const SIZE_OPTIONS = Object.freeze(["small", "medium-small", "medium", "medium-large", "large"]);
const FONT_OPTIONS = Object.freeze(["serif", "sans-serif", "mono", "handwriting"]);
const WEIGHT_OPTIONS = Object.freeze(["light", "regular", "medium"]);
const WIDTH_OPTIONS = Object.freeze(["narrow", "medium-narrow", "medium", "medium-wide", "wide"]);
const LINE_HEIGHT = Object.freeze({
  min: 1.45,
  max: 1.9,
});

const CUSTOM_FONT_FAMILY_OPTIONS = Object.freeze({
  serif: "--font-serif",
  "sans-serif": "--font-sans-serif",
  mono: "--font-mono",
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
    widthOptions: WIDTH_OPTIONS,
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
  var utils = window.__GNIX_ARTICLE_FONT_UTILS__ || {};

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
  var customFonts = utils.normalizeCustomFonts
    ? utils.normalizeCustomFonts(
        candidate.customFonts,
        config.customFonts && config.customFonts.familyOptions,
        config.customFonts && config.customFonts.importLimit
      )
    : { imports: [], families: {} };
  var settings = {
    size: hasOption(config.sizeOptions, candidate.size) ? candidate.size : defaults.size,
    type: hasOption(config.fontOptions, candidate.type) ? candidate.type : defaults.type,
    lineHeight: normalizeLineHeight(candidate.lineHeight),
    weight: hasOption(config.weightOptions, candidate.weight) ? candidate.weight : defaults.weight,
    width: hasOption(config.widthOptions, candidate.width) ? candidate.width : defaults.width,
    customFonts: customFonts
  };
  var html = document.documentElement;

  if (utils.applyCustomFontImports) utils.applyCustomFontImports(settings.customFonts.imports);
  if (utils.applyCustomFontFamilies) utils.applyCustomFontFamilies(html, settings.customFonts.families, config.customFonts && config.customFonts.familyOptions);
  html.setAttribute("data-article-font-size", settings.size);
  html.setAttribute("data-article-font-family", settings.type);
  html.setAttribute("data-article-line-height", String(settings.lineHeight));
  html.setAttribute("data-article-font-weight", settings.weight);
  html.setAttribute("data-article-width", settings.width);
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
  WIDTH_OPTIONS,
  getArticleFontInitScript,
  getClientArticleFontConfig,
};
