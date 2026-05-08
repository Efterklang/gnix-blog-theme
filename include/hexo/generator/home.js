const pagination = require("hexo-pagination");
const { filterByLanguage, getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

function redirectTo(path) {
  const target = path.startsWith("/") ? path : `/${path}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"></head><body><a href="${target}">Continue</a></body></html>`;
}

module.exports = (hexo) => {
  hexo.extend.generator.register("index", function (locals) {
    const config = this.config;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.index_generator || {};
    const orderBy = themeConfig.order_by ?? "-date";
    const perPage = themeConfig.per_page ?? config.per_page ?? 16;
    const layout = themeConfig.layout ?? ["index", "archive"];
    const paginationDir = themeConfig.pagination_dir ?? config.pagination_dir ?? "page";
    const path = themeConfig.path ?? "";

    if (!isI18nEnabled(fullConfig)) {
      const posts = locals.posts.sort(orderBy);
      posts.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0));

      return pagination(path, posts, {
        perPage,
        layout,
        format: `${paginationDir}/%d/`,
        data: {
          __index: true,
        },
      });
    }

    const result = [];
    const defaultLanguageBase = getLanguageBasePath(fullConfig, getDefaultLanguageKey(fullConfig));

    if (defaultLanguageBase) {
      result.push({
        path: "index.html",
        data: redirectTo(defaultLanguageBase),
      });
    }

    getLanguageKeys(fullConfig).forEach((langKey) => {
      const posts = filterByLanguage(locals.posts.sort(orderBy), langKey, fullConfig);
      posts.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0));

      result.push(
        ...pagination(getLanguageBasePath(fullConfig, langKey) + path, posts, {
          perPage,
          layout,
          format: `${paginationDir}/%d/`,
          data: {
            __index: true,
            i18n_lang: langKey,
            lang: getLanguage(fullConfig, langKey).locale,
          },
        }),
      );
    });

    return result;
  });
};
