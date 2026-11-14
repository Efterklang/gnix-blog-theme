const { filterByLanguage, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled, trimSlashes } = require("../../util/i18n");

module.exports = (hexo) => {
  hexo.extend.generator.register("archive", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.archive_generator || {};
    const orderBy = themeConfig.order_by || "-date";
    // 归档目录（默认 archive/）挂在各语言前缀下；站点根路径由 home 生成器负责
    const archiveDir = `${trimSlashes(themeConfig.path || "archive") || "archive"}/`;
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
      getLanguageKeys(fullConfig).forEach((langKey) => {
        buildArchive(`${getLanguageBasePath(fullConfig, langKey)}${archiveDir}`, langKey);
      });
    } else {
      buildArchive(archiveDir);
    }

    return result;
  });
};
