const STORAGE_KEY = "gnix-glass";

// 数值与 default.css「Liquid glass」区的默认 token 一致：等于默认值时不写行内变量，
// 仍由样式表（含深浅主题各自的取值）生效
const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  press: true,
  blur: 0,
  // 折射默认拉满（2×），与 default.css 的 --glass-lens-strength 一致
  refraction: 2,
  tint: 1,
});

// 滑块取值范围；refraction / tint 是相对主题原值的倍率
const RANGES = Object.freeze({
  blur: Object.freeze({ min: 0, max: 24, step: 1 }),
  refraction: Object.freeze({ min: 0, max: 2, step: 0.05 }),
  tint: Object.freeze({ min: 0.5, max: 1.5, step: 0.05 }),
});

// 数值参数写到 <html> 上的 CSS 变量：--glass-lens-strength 由 glass-lens.js 读取，
// --glass-tint 缩放 --glass-fill / --glass-fill-strong 的不透明度
const CSS_VARIABLES = Object.freeze({
  blur: Object.freeze({ name: "--glass-blur", unit: "px" }),
  refraction: Object.freeze({ name: "--glass-lens-strength", unit: "" }),
  tint: Object.freeze({ name: "--glass-tint", unit: "" }),
});

function getClientGlassConfig() {
  return {
    storageKey: STORAGE_KEY,
    defaultSettings: DEFAULT_SETTINGS,
    ranges: RANGES,
    variables: CSS_VARIABLES,
  };
}

function stringifyForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function getGlassInitScript() {
  const config = stringifyForScript(getClientGlassConfig());

  return `
(function() {
  var config = ${config};
  var defaults = config.defaultSettings;
  var html = document.documentElement;

  function normalizeNumber(value, range, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(range.max, Math.max(range.min, Math.round(parsed * 100) / 100));
  }

  function normalizeSettings(value) {
    var source = value && typeof value === "object" ? value : {};
    var settings = {
      enabled: typeof source.enabled === "boolean" ? source.enabled : defaults.enabled,
      press: typeof source.press === "boolean" ? source.press : defaults.press
    };
    Object.keys(config.ranges).forEach(function(key) {
      settings[key] = normalizeNumber(source[key], config.ranges[key], defaults[key]);
    });
    return settings;
  }

  function getGlassSettings() {
    var stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(config.storageKey));
    } catch (_) {}
    return normalizeSettings(stored);
  }

  function applyGlassSettings(value, persist) {
    var settings = normalizeSettings(value);
    // 鲜艳度已移除：清掉旧版行内覆盖，保持背景原始饱和度。
    html.style.removeProperty("--glass-saturate");
    html.setAttribute("data-glass", settings.enabled ? "on" : "off");
    html.setAttribute("data-glass-press-effect", settings.press ? "on" : "off");
    Object.keys(config.variables).forEach(function(key) {
      var variable = config.variables[key];
      if (settings[key] === defaults[key]) html.style.removeProperty(variable.name);
      else html.style.setProperty(variable.name, settings[key] + variable.unit);
    });
    if (persist) {
      try { localStorage.setItem(config.storageKey, JSON.stringify(settings)); } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent("gnix:glass-settings-change", { detail: settings }));
    } catch (_) {}
    return settings;
  }

  window.__GNIX_GLASS_CONFIG__ = config;
  window.getGlassSettings = getGlassSettings;
  window.applyGlassSettings = applyGlassSettings;

  applyGlassSettings(getGlassSettings());

  // bfcache 返回时本脚本不再执行，按 localStorage 重放一次
  // （applyGlassSettings 会派发 gnix:glass-settings-change 供 UI 与折射层同步）
  window.addEventListener("pageshow", function(event) {
    if (event.persisted) applyGlassSettings(getGlassSettings());
  });
})();
`;
}

module.exports = {
  CSS_VARIABLES,
  DEFAULT_SETTINGS,
  RANGES,
  STORAGE_KEY,
  getClientGlassConfig,
  getGlassInitScript,
};
