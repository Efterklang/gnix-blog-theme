const { filterByLanguage, getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

module.exports = (hexo) => {
  hexo.extend.generator.register("archive", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.archive_generator || {};
    const orderBy = themeConfig.order_by || "-date";
    const result = [];

    function buildArchive(path, langKey = null) {
      const sorted = locals.posts.sort(orderBy);
      const posts = langKey ? filterByLanguage(sorted, langKey, fullConfig) : sorted;
      if (!posts.length) return;

      const data = { archive: true, posts };
      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = getLanguage(fullConfig, langKey).locale;
      }

      result.push({ path, layout: ["archive", "index"], data });
    }

    if (isI18nEnabled(fullConfig)) {
      const defaultKey = getDefaultLanguageKey(fullConfig);
      const defaultBase = getLanguageBasePath(fullConfig, defaultKey);
      // When the default language lives under a prefix (e.g. "/zh-CN/"),
      // mirror its archive at site root so /index.html serves real content.
      if (defaultBase) buildArchive("", defaultKey);
      getLanguageKeys(fullConfig).forEach((langKey) => {
        buildArchive(getLanguageBasePath(fullConfig, langKey), langKey);
      });
    } else {
      buildArchive("");
    }

    return result;
  });
};
