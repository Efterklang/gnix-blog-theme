const path = require("node:path");

// ─── 基础字符串工具 ────────────────────────────────────────────────

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function normalizeLanguageKey(value) {
  return trimSlashes(value).trim();
}

function normalizePrefix(value, fallback) {
  const prefix = trimSlashes(value == null ? fallback : value);
  return prefix ? `${prefix}/` : "";
}

function normalizeLocale(value) {
  return String(value || "").replace(/_/g, "-");
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(value) || /^(?:mailto|tel|data):/i.test(value) || value.startsWith("#");
}

// ─── i18n 配置解析（带缓存）─────────────────────────────────────────

const i18nConfigCache = new WeakMap();

function getI18nConfig(config = {}) {
  if (i18nConfigCache.has(config)) {
    return i18nConfigCache.get(config);
  }

  const raw = config.i18n || {};
  const rawLanguages = raw.languages || {};
  const languages = {};

  Object.keys(rawLanguages).forEach((key) => {
    const normalizedKey = normalizeLanguageKey(key);
    const value = rawLanguages[key] || {};
    languages[normalizedKey] = {
      key: normalizedKey,
      label: value.label || normalizedKey,
      locale: normalizeLocale(value.locale || normalizedKey),
      prefix: normalizePrefix(value.prefix, normalizedKey),
    };
  });

  const keys = Object.keys(languages);
  const configuredDefault = normalizeLanguageKey(raw.default || keys[0]);
  const defaultLanguage = languages[configuredDefault] ? configuredDefault : keys[0];

  const result = {
    enabled: raw.enabled === true,
    defaultLanguage,
    languages,
  };

  i18nConfigCache.set(config, result);
  return result;
}

function isI18nEnabled(config = {}) {
  return getI18nConfig(config).enabled;
}

function getLanguageKeys(config = {}) {
  return Object.keys(getI18nConfig(config).languages);
}

function getDefaultLanguageKey(config = {}) {
  return getI18nConfig(config).defaultLanguage;
}

function getLanguage(config = {}, key) {
  const i18n = getI18nConfig(config);
  const normalizedKey = normalizeLanguageKey(key);
  return i18n.languages[normalizedKey] || i18n.languages[i18n.defaultLanguage];
}

function getLanguageBasePath(config, key) {
  return getLanguage(config, key)?.prefix || "";
}

// ─── 语言键查询（私有辅助）─────────────────────────────────────────

function getLanguageKeyFromLocale(config, locale) {
  const normalized = normalizeLocale(locale).toLowerCase();
  if (!normalized) return null;

  const i18n = getI18nConfig(config);
  if (i18n.languages[normalized]) return normalized;

  return Object.keys(i18n.languages).find((key) => i18n.languages[key].locale.toLowerCase() === normalized) || null;
}

function getLanguageKeyFromPath(value, config) {
  const normalized = trimSlashes(value);
  if (!normalized) return null;

  const i18n = getI18nConfig(config);
  return (
    Object.keys(i18n.languages).find((key) => {
      const prefix = trimSlashes(i18n.languages[key].prefix);
      return prefix && (normalized === prefix || normalized.startsWith(`${prefix}/`));
    }) || null
  );
}

// ─── 源路径解析：从文件名识别 __<lang> 后缀 ──────────────────────────

function parseLocalizedSource(source) {
  if (typeof source !== "string" || !source) {
    return { langKey: null, baseSource: "" };
  }

  const normalized = source.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const ext = path.posix.extname(filename);
  const stem = ext ? filename.slice(0, -ext.length) : filename;

  const match = stem.match(/^(.+?)__([a-zA-Z][\w-]*)$/);
  if (!match) return { langKey: null, baseSource: normalized };

  return {
    langKey: match[2],
    baseSource: dir + match[1] + ext,
  };
}

function inferI18nKeyFromSource(source) {
  if (typeof source !== "string") return "";
  const { baseSource } = parseLocalizedSource(source);
  const normalized = trimSlashes(baseSource || source).replace(/\\/g, "/");
  const ext = path.posix.extname(normalized);
  const withoutExt = ext ? normalized.slice(0, -ext.length) : normalized;
  const parts = withoutExt.split("/").filter(Boolean);
  if (!parts.length) return "";

  const last = parts[parts.length - 1];
  if (last === "index" && parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return last;
}

function getI18nKey(item = {}) {
  if (item.i18n_key) return item.i18n_key;

  const fromSource = inferI18nKeyFromSource(item.source);
  if (fromSource) return fromSource;

  return item.slug || "";
}

// ─── 单个 post / page 的语言归属查询 ────────────────────────────────

function getPageLanguageKey(page = {}, config = {}) {
  if (!isI18nEnabled(config)) {
    const fallback = Array.isArray(config.language) ? config.language[0] : config.language;
    return getLanguageKeyFromLocale(config, page.lang || page.language || fallback) || getDefaultLanguageKey(config);
  }

  const explicit = normalizeLanguageKey(page.i18n_lang);
  if (explicit && getLanguage(config, explicit)?.key === explicit) return explicit;

  const fromSource = parseLocalizedSource(page.source || page.full_source || "").langKey;
  if (fromSource) return fromSource;

  const fromPath = getLanguageKeyFromPath(page.path || page.canonical_path || "", config);
  if (fromPath) return fromPath;

  const fromLocale = getLanguageKeyFromLocale(config, page.lang || page.language);
  if (fromLocale) return fromLocale;

  return getDefaultLanguageKey(config);
}

function getPageLocale(page = {}, config = {}) {
  if (!isI18nEnabled(config)) {
    const fallback = Array.isArray(config.language) ? config.language[0] : config.language;
    return normalizeLocale(page.lang || page.language || fallback || "");
  }

  const language = getLanguage(config, getPageLanguageKey(page, config));
  return language?.locale || normalizeLocale(page.lang || page.language) || "";
}

// ─── 路径生成 ──────────────────────────────────────────────────────

function joinRoute(...parts) {
  const joined = parts.map(trimSlashes).filter(Boolean).join("/");
  return joined ? `${joined}/` : "";
}

function stripLanguagePrefix(value, config) {
  const normalized = trimSlashes(value);
  const key = getLanguageKeyFromPath(normalized, config);
  if (!key) return normalized;

  const prefix = trimSlashes(getLanguageBasePath(config, key));
  return normalized.slice(prefix.length).replace(/^\/+/, "");
}

function localizePath(value, key, config = {}) {
  if (!isI18nEnabled(config) || typeof value !== "string" || !value.trim() || isExternalUrl(value)) {
    return value;
  }

  const [pathAndQuery, hash = ""] = value.split("#");
  const [pathname, query = ""] = pathAndQuery.split("?");
  const route = trimSlashes(stripLanguagePrefix(pathname, config));
  const base = trimSlashes(getLanguageBasePath(config, key || getDefaultLanguageKey(config)));
  const joined = [base, route].filter(Boolean).join("/");
  const hasFileExtension = /\.[^/]+$/.test(route);
  const localized = `/${joined}${joined && !hasFileExtension ? "/" : ""}`;
  return `${localized}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function getLocalizedTagPath(tag, key, config = {}) {
  const tagDir = config.tag_dir || "tags";
  const tagPath = typeof tag === "string" ? tag : tag?.path || tag?.slug || tag?.name || "";
  let slug = trimSlashes(tagPath);
  const tagDirPrefix = `${trimSlashes(tagDir)}/`;

  if (slug.startsWith(tagDirPrefix)) {
    slug = slug.slice(tagDirPrefix.length);
  }

  return joinRoute(getLanguageBasePath(config, key), tagDir, slug);
}

// ─── 集合按语言筛选 ────────────────────────────────────────────────

function filterByLanguage(collection, key, config = {}) {
  if (!isI18nEnabled(config)) return collection;
  // Hexo Query 对象：保留链式能力
  if (typeof collection?.filter === "function" && !Array.isArray(collection)) {
    return collection.filter((item) => getPageLanguageKey(item, config) === key);
  }
  // 普通数组 / 含 toArray 的对象
  const arr = Array.isArray(collection) ? collection : typeof collection?.toArray === "function" ? collection.toArray() : [];
  return arr.filter((item) => getPageLanguageKey(item, config) === key);
}

module.exports = {
  filterByLanguage,
  getDefaultLanguageKey,
  getI18nKey,
  getLanguage,
  getLanguageBasePath,
  getLanguageKeys,
  getLocalizedTagPath,
  getPageLanguageKey,
  getPageLocale,
  inferI18nKeyFromSource,
  isExternalUrl,
  isI18nEnabled,
  localizePath,
  normalizeLocale,
  parseLocalizedSource,
  trimSlashes,
};
