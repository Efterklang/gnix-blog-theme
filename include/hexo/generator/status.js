const { filterByLanguage, getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

function getCollectionLength(collection) {
  if (typeof collection?.length === "number") return collection.length;
  if (typeof collection?.toArray === "function") return collection.toArray().length;
  return Array.isArray(collection) ? collection.length : 0;
}

module.exports = (hexo) => {
  hexo.extend.generator.register("status", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);

    function buildStatusPage(routePath, langKey = null, i18n = null) {
      const posts = langKey ? filterByLanguage(locals.posts, langKey, fullConfig) : locals.posts;
      const data = {
        status: true,
        title: "Status",
        postCount: getCollectionLength(posts),
      };

      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = getLanguage(fullConfig, langKey).locale;
        data.i18n = i18n;
      }

      return {
        path: routePath,
        layout: ["status", "index"],
        data,
      };
    }

    if (!isI18nEnabled(fullConfig)) {
      return buildStatusPage("status.html");
    }

    const languageKeys = getLanguageKeys(fullConfig);
    const i18n = {};
    languageKeys.forEach((langKey) => {
      i18n[langKey] = `/${getLanguageBasePath(fullConfig, langKey)}status.html`;
    });

    const defaultKey = getDefaultLanguageKey(fullConfig);
    const result = [];
    if (getLanguageBasePath(fullConfig, defaultKey)) {
      result.push(buildStatusPage("status.html", defaultKey, i18n));
    }

    languageKeys.forEach((langKey) => {
      result.push(buildStatusPage(`${getLanguageBasePath(fullConfig, langKey)}status.html`, langKey, i18n));
    });

    return result;
  });
};
