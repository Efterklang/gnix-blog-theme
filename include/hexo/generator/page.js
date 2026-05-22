const {
  getDefaultLanguageKey,
  getI18nKey,
  getLanguage,
  getLanguageBasePath,
  getPageLanguageKey,
  inferI18nKeyFromSource,
  isI18nEnabled,
  parseLocalizedSource,
  trimSlashes,
} = require("../../util/i18n");

function getLocalizedPagePath(page, langKey, config) {
  let route = page.path || "";

  const parsed = parseLocalizedSource(page.source || "");
  if (parsed.langKey) {
    const suffix = `__${parsed.langKey}`;
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    route = route.replace(new RegExp(`${escapedSuffix}(?=[/.]|$)`), "");
  }

  const prefix = langKey === getDefaultLanguageKey(config) ? "" : getLanguageBasePath(config, langKey);
  return trimSlashes(`${prefix}${route}`);
}

function decorateLocalizedPage(page, langKey, config) {
  const language = getLanguage(config, langKey);

  page.i18n_path = getLanguageBasePath(config, langKey);
  page.i18n_lang = page.i18n_lang || langKey;
  page.lang = language.locale;
  page.language = language.locale;
  page.i18n_key = page.i18n_key || getI18nKey(page) || inferI18nKeyFromSource(page.source);
  page.path = getLocalizedPagePath(page, langKey, config);
}

module.exports = (hexo) => {
  hexo.extend.generator.register("page", function (locals) {
    const config = Object.assign({}, this.config, this.config.theme_config, hexo.theme.config);
    const i18nEnabled = isI18nEnabled(config);

    return locals.pages.map((page) => {
      const { layout } = page;

      if (i18nEnabled) {
        decorateLocalizedPage(page, getPageLanguageKey(page, config), config);
      }

      if (!layout || layout === "false" || layout === "off") {
        return {
          path: page.path,
          data: page.content,
        };
      }

      const layouts = ["page", "post", "index"];
      if (layout !== "page") layouts.unshift(layout);

      page.__page = true;
      return {
        path: page.path,
        layout: layouts,
        data: page,
      };
    });
  });
};
