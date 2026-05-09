const pagination = require("hexo-pagination");
const { createProfiler } = require("../../util/profiler");
const { filterByLanguage, getLanguage, getLanguageBasePath, getLanguageKeys, getLocalizedTagPath, isI18nEnabled } = require("../../util/i18n");
const profile = createProfiler("i18n");

module.exports = (hexo) => {
  hexo.extend.generator.register("tag", function (locals) {
    return profile.wrap("generator.tag", () => {
      const config = this.config;
      const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
      const themeConfig = hexo.theme.config.tag_generator || {};
      const perPage = themeConfig.per_page ?? 10;
      const orderBy = themeConfig.order_by ?? "-date";
      const paginationDir = config.pagination_dir || "page";
      const tags = locals.tags;
      const result = [];

      function generateTagPages(langKey = null) {
        const languageStop = profile.start("generator.tag.language");
        try {
          const languageData = langKey
            ? {
                i18n_lang: langKey,
                lang: getLanguage(fullConfig, langKey).locale,
              }
            : {};

          const languageTags = [];

          tags.forEach((tag) => {
            if (!tag.length) return;

            const postsSource = tag.posts.sort(orderBy);
            const posts = langKey ? filterByLanguage(postsSource, langKey, fullConfig) : postsSource;
            if (!posts.length) return;

            languageTags.push(tag);

            const data = pagination(langKey ? getLocalizedTagPath(tag, langKey, fullConfig) : tag.path, posts, {
              perPage,
              layout: ["tag", "archive", "index"],
              format: `${paginationDir}/%d/`,
              data: Object.assign(
                {
                  tag: tag.name,
                },
                languageData,
              ),
            });

            result.push(...data);
          });

          const tagDir = config.tag_dir || "tags";
          const tagDirWithSlash = tagDir.endsWith("/") ? tagDir : `${tagDir}/`;
          const indexPath = langKey ? `${getLanguageBasePath(fullConfig, langKey) + tagDirWithSlash}` : tagDirWithSlash;

          result.push({
            path: indexPath,
            layout: ["tags"],
            data: Object.assign(
              {
                base: indexPath,
                total: 1,
                current: 1,
                current_url: indexPath,
                prev: 0,
                prev_link: "",
                next: 0,
                next_link: "",
                tags: languageTags,
                __tags: true,
              },
              languageData,
            ),
          });
        } finally {
          languageStop();
        }
      }

      if (isI18nEnabled(fullConfig)) {
        getLanguageKeys(fullConfig).forEach((langKey) => generateTagPages(langKey));
        return result;
      }

      // Generate individual tag pages with pagination
      generateTagPages();

      return result;
    });
  });
};
