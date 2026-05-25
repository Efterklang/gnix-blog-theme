const { filterByLanguage, getLanguage, getLanguageBasePath, getLanguageKeys, getLocalizedTagPath, isI18nEnabled } = require("../../util/i18n");

module.exports = (hexo) => {
  hexo.extend.generator.register("tag", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.tag_generator || {};
    const orderBy = themeConfig.order_by ?? "-date";
    const tagDir = (config.tag_dir || "tags").replace(/\/?$/, "/");
    const result = [];

    function generateTagPages(langKey = null) {
      const languageData = langKey
        ? { i18n_lang: langKey, lang: getLanguage(fullConfig, langKey).locale }
        : {};
      const languageTags = [];

      locals.tags.forEach((tag) => {
        if (!tag.length) return;
        const sorted = tag.posts.sort(orderBy);
        const posts = langKey ? filterByLanguage(sorted, langKey, fullConfig) : sorted;
        if (!posts.length) return;

        languageTags.push(tag);
        result.push({
          path: langKey ? getLocalizedTagPath(tag, langKey, fullConfig) : tag.path,
          layout: ["tag", "archive", "index"],
          data: { posts, tag: tag.name, ...languageData },
        });
      });

      result.push({
        path: (langKey ? getLanguageBasePath(fullConfig, langKey) : "") + tagDir,
        layout: ["tags"],
        data: { tags: languageTags, __tags: true, ...languageData },
      });
    }

    const langKeys = isI18nEnabled(fullConfig) ? getLanguageKeys(fullConfig) : [null];
    langKeys.forEach(generateTagPages);
    return result;
  });
};
