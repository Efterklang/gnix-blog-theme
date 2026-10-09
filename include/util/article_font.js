const STORAGE_KEY = "gnix-article-font";

const DEFAULT_SETTINGS = Object.freeze({
  size: "medium",
  type: "sans-serif",
  weight: "regular",
  width: "narrow",
  spacing: "normal",
});

const SIZE_OPTIONS = Object.freeze(["small", "medium-small", "medium", "medium-large", "large"]);
const FONT_OPTIONS = Object.freeze(["sans-serif", "serif", "mono", "handwriting"]);
const WEIGHT_OPTIONS = Object.freeze(["light", "regular", "medium"]);
const WIDTH_OPTIONS = Object.freeze(["narrow", "medium-narrow", "medium", "medium-wide", "wide"]);
// 正文纵向间距档位：由 default.css 的 --prose-* tokens 统一管理。
const SPACING_OPTIONS = Object.freeze(["compact", "normal", "relaxed"]);

const CUSTOM_FONT_FAMILY_OPTIONS = Object.freeze({
  serif: "--font-serif",
  "sans-serif": "--font-sans-serif",
  mono: "--font-mono",
  handwriting: "--font-handwritten",
});

const CUSTOM_FONT_IMPORT_LIMIT = 6;
const CUSTOM_FONT_PRESETS = Object.freeze([
  { id: "elms-sans", type: "sans-serif", name: "Elms Sans", family: '"Elms Sans", system-ui, sans-serif', css: "https://fonts.googleapis.com/css2?family=Elms+Sans:ital,wght@0,100..900;1,100..900&display=swap" },
  { id: "geist-mono", type: "mono", name: "Geist Mono", family: '"Geist Mono", "SF Mono", Consolas, monospace', css: "https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&display=swap" },
  { id: "maple-mono-nf-cn", type: "mono", name: "Maple Mono NF CN", family: '"Maple Mono NF CN", ui-monospace, monospace', css: "https://fontsapi.zeoseven.com/442/main/result.css" },
  { id: "chill-kai", type: "serif", name: "ChillKai", family: '"ChillKai", serif', css: "https://fontsapi.zeoseven.com/5/main/result.css" },
  { id: "noto-serif-sc", type: "serif", name: "Noto Serif SC", family: '"Noto Serif SC", serif', css: "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200..900&display=swap" },
  { id: "ping-fang-zhui-guang", type: "handwriting", name: "PING FANG ZHUI GUANG", family: '"PING FANG ZHUI GUANG", cursive', css: "https://fontsapi.zeoseven.com/505/main/result.css" },
]);

function getClientArticleFontConfig() {
  return {
    storageKey: STORAGE_KEY,
    defaultSettings: DEFAULT_SETTINGS,
    sizeOptions: SIZE_OPTIONS,
    fontOptions: FONT_OPTIONS,
    weightOptions: WEIGHT_OPTIONS,
    widthOptions: WIDTH_OPTIONS,
    spacingOptions: SPACING_OPTIONS,
    customFonts: {
      familyOptions: CUSTOM_FONT_FAMILY_OPTIONS,
      importLimit: CUSTOM_FONT_IMPORT_LIMIT,
      presets: CUSTOM_FONT_PRESETS,
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
  var utils = window.__GNIX_ARTICLE_FONT_UTILS__ || {};
  var html = document.documentElement;

  window.__GNIX_ARTICLE_FONT_CONFIG__ = config;

  function hasOption(options, value) {
    return Array.isArray(options) && options.indexOf(value) !== -1;
  }

  function readStoredSettings() {
    var stored = null;
    var parsed = {};

    try {
      stored = localStorage.getItem(config.storageKey);
    } catch (_) {}

    if (stored) {
      try {
        parsed = JSON.parse(stored) || {};
      } catch (_) {}
    }

    var candidate = Object.assign({}, defaults, parsed);

    return {
      size: hasOption(config.sizeOptions, candidate.size) ? candidate.size : defaults.size,
      type: hasOption(config.fontOptions, candidate.type) ? candidate.type : defaults.type,
      weight: hasOption(config.weightOptions, candidate.weight) ? candidate.weight : defaults.weight,
      width: hasOption(config.widthOptions, candidate.width) ? candidate.width : defaults.width,
      spacing: hasOption(config.spacingOptions, candidate.spacing) ? candidate.spacing : defaults.spacing,
      customFonts: utils.normalizeCustomFonts
        ? utils.normalizeCustomFonts(
            candidate.customFonts,
            config.customFonts && config.customFonts.familyOptions,
            config.customFonts && config.customFonts.importLimit,
            config.customFonts && config.customFonts.presets
          )
        : { imports: [], families: {} }
    };
  }

  function applySettings(settings) {
    if (utils.applyCustomFontImports) utils.applyCustomFontImports(settings.customFonts.imports);
    if (utils.applyFontPresets) utils.applyFontPresets(settings.customFonts.presets, config.customFonts.presets);
    if (utils.applyCustomFontFamilies) utils.applyCustomFontFamilies(html, utils.resolveCustomFontFamilies(settings.customFonts, config.customFonts.presets), config.customFonts && config.customFonts.familyOptions);
    html.setAttribute("data-article-font-size", settings.size);
    html.setAttribute("data-article-font-family", settings.type);
    html.setAttribute("data-article-font-weight", settings.weight);
    html.setAttribute("data-article-width", settings.width);
    html.setAttribute("data-article-spacing", settings.spacing);
  }

  applySettings(readStoredSettings());

  // bfcache 返回时本脚本不再执行，<html> 上仍是页面被缓存那一刻的字体设置。
  // 按 localStorage 重放一次，并广播给偏好面板等监听者同步 UI
  window.addEventListener("pageshow", function(event) {
    if (!event.persisted) return;

    var settings = readStoredSettings();
    applySettings(settings);
    try {
      window.dispatchEvent(new CustomEvent("gnix:article-font-settings-change", { detail: settings }));
    } catch (_) {}
  });
})();
`;
}

module.exports = {
  CUSTOM_FONT_FAMILY_OPTIONS,
  CUSTOM_FONT_IMPORT_LIMIT,
  CUSTOM_FONT_PRESETS,
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  SPACING_OPTIONS,
  STORAGE_KEY,
  WEIGHT_OPTIONS,
  WIDTH_OPTIONS,
  getArticleFontInitScript,
  getClientArticleFontConfig,
};
