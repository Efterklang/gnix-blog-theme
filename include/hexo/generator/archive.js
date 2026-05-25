const { filterByLanguage, getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

function redirectTo(path) {
  const target = path.startsWith("/") ? path : `/${path}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"></head><body><a href="${target}">Continue</a></body></html>`;
}

module.exports = (hexo) => {
  hexo.extend.generator.register("archive", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.archive_generator || {};
    const orderBy = themeConfig.order_by || "-date";
    const result = [];

    function generateForLanguage(langKey = null) {
      const sorted = locals.posts.sort(orderBy);
      const posts = langKey ? filterByLanguage(sorted, langKey, fullConfig) : sorted;
      if (!posts.length) return;

      const data = { archive: true, posts };
      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = getLanguage(fullConfig, langKey).locale;
      }

      result.push({
        path: langKey ? getLanguageBasePath(fullConfig, langKey) : "",
        layout: ["archive", "index"],
        data,
      });
    }

    if (isI18nEnabled(fullConfig)) {
      const defaultBase = getLanguageBasePath(fullConfig, getDefaultLanguageKey(fullConfig));
      if (defaultBase) {
        result.push({ path: "index.html", data: redirectTo(defaultBase) });
      }
      getLanguageKeys(fullConfig).forEach(generateForLanguage);
    } else {
      generateForLanguage();
    }

    return result;
  });
};
