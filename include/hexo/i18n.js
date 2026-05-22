const {
  getI18nKey,
  getLanguage,
  getLanguageBasePath,
  getPageLanguageKey,
  inferI18nKeyFromSource,
  isI18nEnabled,
  parseLocalizedSource,
} = require("../util/i18n");

let cachedConfig = null;
let cachedHexo = null;

function getConfig(hexo, locals = {}) {
  if (hexo !== cachedHexo || !cachedConfig) {
    cachedHexo = hexo;
    cachedConfig = Object.assign({}, hexo.config, hexo.config.theme_config, hexo.theme.config);
  }
  if (locals.theme) {
    return Object.assign({}, cachedConfig, locals.theme);
  }
  return cachedConfig;
}

function applyI18nFields(item, config) {
  const langKey = getPageLanguageKey(item, config);
  const language = getLanguage(config, langKey);

  item.i18n_lang = item.i18n_lang || langKey;
  item.i18n_path = getLanguageBasePath(config, langKey);
  item.lang = language.locale;
  item.language = language.locale;

  if (!item.i18n_key) {
    item.i18n_key = getI18nKey(item, config) || inferI18nKeyFromSource(item.source, config);
  }

  return langKey;
}

module.exports = (hexo) => {
  hexo.extend.filter.register(
    "post_permalink",
    (post) => {
      if (!post || typeof post !== "object") return post;
      const activeConfig = getConfig(hexo);
      if (!isI18nEnabled(activeConfig)) return post;

      applyI18nFields(post, activeConfig);

      // 让 permalink 模板里的 :name 取到 baseName 而非 foo__en
      if (post.source) {
        const parsed = parseLocalizedSource(post.source, activeConfig);
        if (parsed.langKey) {
          const baseName = inferI18nKeyFromSource(post.source, activeConfig);
          if (baseName) post.slug = baseName;
        }
      }

      return post;
    },
    5,
  );

  hexo.extend.filter.register(
    "template_locals",
    (locals) => {
      const page = locals.page;
      const activeConfig = getConfig(hexo, locals);
      if (!page || !isI18nEnabled(activeConfig)) return locals;

      applyI18nFields(page, activeConfig);

      return locals;
    },
    5,
  );
};
