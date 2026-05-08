const path = require("node:path");

const DEFAULT_LANGUAGES = {
  cn: {
    label: "Chinese",
    locale: "zh-CN",
    prefix: "cn",
  },
  en: {
    label: "English",
    locale: "en",
    prefix: "en",
  },
};

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

const i18nConfigCache = new WeakMap();

function getI18nConfig(config = {}) {
  if (i18nConfigCache.has(config)) {
    return i18nConfigCache.get(config);
  }

  const configI18n = config.i18n || {};
  const themeI18n = config.theme_config?.i18n || {};
  const raw = configI18n.enabled === true || configI18n.languages ? configI18n : themeI18n.enabled === true || themeI18n.languages ? themeI18n : configI18n;
  const rawLanguages = raw.languages || DEFAULT_LANGUAGES;
  const languages = {};

  Object.keys(rawLanguages).forEach((key) => {
    const normalizedKey = normalizeLanguageKey(key);
    const value = typeof rawLanguages[key] === "string" ? { locale: rawLanguages[key] } : rawLanguages[key] || {};
    const locale = normalizeLocale(value.locale || value.lang || value.language || normalizedKey);
    const prefix = value.prefix ?? value.path ?? value.url_prefix;
    languages[normalizedKey] = {
      key: normalizedKey,
      label: value.label || value.name || locale || normalizedKey,
      locale,
      prefix: normalizePrefix(prefix, normalizedKey),
    };
  });

  const keys = Object.keys(languages);
  const configuredDefault = normalizeLanguageKey(raw.default || raw.default_language || raw.defaultLanguage || keys[0]);
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

function getLanguageKeyFromLocale(config = {}, locale) {
  const normalizedLocale = normalizeLocale(locale).toLowerCase();
  if (!normalizedLocale) return null;

  const i18n = getI18nConfig(config);
  if (i18n.languages[normalizedLocale]) return normalizedLocale;

  return (
    Object.keys(i18n.languages).find((key) => {
      const language = i18n.languages[key];
      return language.locale.toLowerCase() === normalizedLocale;
    }) || null
  );
}

function getLanguageKeyFromPath(value, config = {}) {
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

function getLanguageKeyFromSource(value, config = {}) {
  const normalized = trimSlashes(value).replace(/\\/g, "/");
  if (!normalized) return null;

  const firstSegment = normalized.split("/")[0];
  const i18n = getI18nConfig(config);
  return i18n.languages[firstSegment] ? firstSegment : null;
}

function getPageLanguageKey(page = {}, config = {}) {
  if (!isI18nEnabled(config)) {
    const configuredLanguage = Array.isArray(config.language) ? config.language[0] : config.language;
    return getLanguageKeyFromLocale(config, page.lang || page.language || configuredLanguage) || normalizeLanguageKey(page.lang || page.language || configuredLanguage) || getDefaultLanguageKey(config);
  }

  const explicit = normalizeLanguageKey(page.i18n_lang || page.i18n?.lang || page.i18n?.language);
  if (explicit && getLanguage(config, explicit)?.key === explicit) return explicit;

  const fromSource = getLanguageKeyFromSource(page.source || page.full_source || "", config);
  if (fromSource) return fromSource;

  const pathDescriptor = Object.getOwnPropertyDescriptor(page, "path");
  const pathValue = pathDescriptor && typeof pathDescriptor.get !== "function" ? pathDescriptor.value : "";
  const fromPath = getLanguageKeyFromPath(pathValue || page.canonical_path || "", config);
  if (fromPath) return fromPath;

  const fromLocale = getLanguageKeyFromLocale(config, page.lang || page.language);
  if (fromLocale) return fromLocale;

  return getDefaultLanguageKey(config);
}

function getPageLocale(page = {}, config = {}) {
  if (!isI18nEnabled(config)) {
    const configuredLanguage = Array.isArray(config.language) ? config.language[0] : config.language;
    return normalizeLocale(page.lang || page.language || configuredLanguage || "");
  }

  const language = getLanguage(config, getPageLanguageKey(page, config));
  return language?.locale || normalizeLocale(page.lang || page.language) || "";
}

function getLanguageLabel(config = {}, keyOrLocale) {
  const key = getLanguage(config, keyOrLocale)?.key === normalizeLanguageKey(keyOrLocale) ? normalizeLanguageKey(keyOrLocale) : getLanguageKeyFromLocale(config, keyOrLocale);
  const language = getLanguage(config, key || getDefaultLanguageKey(config));
  return language?.label || keyOrLocale;
}

function getLanguageBasePath(config = {}, key) {
  return getLanguage(config, key)?.prefix || "";
}

function joinRoute(...parts) {
  const joined = parts.map(trimSlashes).filter(Boolean).join("/");
  return joined ? `${joined}/` : "";
}

function stripLanguagePrefix(value, config = {}) {
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
  const route = stripLanguagePrefix(pathname, config);
  const base = trimSlashes(getLanguageBasePath(config, key || getDefaultLanguageKey(config)));
  const normalizedRoute = trimSlashes(route);
  const joined = [base, normalizedRoute].filter(Boolean).join("/");
  const hasFileExtension = /\.[^/]+$/.test(normalizedRoute);
  const localized = `/${joined}${joined && !hasFileExtension ? "/" : ""}`;
  const queryPart = query ? `?${query}` : "";
  const hashPart = hash ? `#${hash}` : "";
  return `${localized}${queryPart}${hashPart}`;
}

function toArray(collection) {
  if (!collection) return [];
  if (typeof collection.toArray === "function") return collection.toArray();
  if (Array.isArray(collection.data)) return collection.data;
  if (Array.isArray(collection)) return collection;
  return [];
}

function filterByLanguage(collection, key, config = {}) {
  if (!isI18nEnabled(config)) return collection;
  if (typeof collection?.filter === "function" && !Array.isArray(collection)) {
    return collection.filter((item) => getPageLanguageKey(item, config) === key);
  }
  return toArray(collection).filter((item) => getPageLanguageKey(item, config) === key);
}

function getI18nKey(item = {}) {
  return item.i18n_key || item.i18n?.key || item.translation_key || item.slug || inferI18nKeyFromSource(item.source);
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

function inferI18nKeyFromSource(source) {
  if (typeof source !== "string") return "";
  const normalized = trimSlashes(source).replace(/\\/g, "/");
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

module.exports = {
  filterByLanguage,
  getDefaultLanguageKey,
  getI18nConfig,
  getI18nKey,
  getLanguage,
  getLanguageBasePath,
  getLanguageKeyFromLocale,
  getLanguageKeyFromPath,
  getLanguageKeyFromSource,
  getLanguageKeys,
  getLanguageLabel,
  getLocalizedTagPath,
  getPageLanguageKey,
  getPageLocale,
  inferI18nKeyFromSource,
  isExternalUrl,
  isI18nEnabled,
  joinRoute,
  localizePath,
  normalizeLocale,
  stripLanguagePrefix,
  toArray,
  trimSlashes,
};
