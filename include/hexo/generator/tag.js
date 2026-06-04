const { filterByLanguage, getLanguage, getLanguageKeys, getLocalizedTagPath, isI18nEnabled } = require("../../util/i18n");

module.exports = (hexo) => {
  hexo.extend.generator.register("tag", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.tag_generator || {};
    const orderBy = themeConfig.order_by ?? "-date";
    const result = [];

    function generateTagPages(langKey = null) {
      const languageData = langKey ? { i18n_lang: langKey, lang: getLanguage(fullConfig, langKey).locale } : {};

      locals.tags.forEach((tag) => {
        if (!tag.length) return;
        const sorted = tag.posts.sort(orderBy);
        const posts = langKey ? filterByLanguage(sorted, langKey, fullConfig) : sorted;
        if (!posts.length) return;

        result.push({
          path: langKey ? getLocalizedTagPath(tag, langKey, fullConfig) : tag.path,
          layout: ["tag", "archive", "index"],
          data: { posts, tag: tag.name, ...languageData },
        });
      });
    }

    const langKeys = isI18nEnabled(fullConfig) ? getLanguageKeys(fullConfig) : [null];
    langKeys.forEach(generateTagPages);
    return result;
  });
};
