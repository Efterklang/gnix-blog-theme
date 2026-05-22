const {
  getPageLanguageKey,
  getPageLocale,
  getLocalizedTagPath,
  isExternalUrl,
  isI18nEnabled,
  localizePath,
} = require("../util/i18n");

module.exports = (hexo) => {
  hexo.extend.helper.register("is_tags", function (page = null) {
    return (page === null ? this.page : page).__tags === true;
  });
  hexo.extend.helper.register("is_i18n_enabled", function () {
    return isI18nEnabled(this.config);
  });
  hexo.extend.helper.register("language_key", function (page = null) {
    return getPageLanguageKey(page || this.page, this.config);
  });
  hexo.extend.helper.register("language_locale", function (page = null) {
    return getPageLocale(page || this.page, this.config);
  });
  hexo.extend.helper.register("localized_path", function (targetPath, langKey = null) {
    return localizePath(targetPath, langKey || getPageLanguageKey(this.page, this.config), this.config);
  });
  hexo.extend.helper.register("localized_url_for", function (targetPath, langKey = null) {
    const localized = localizePath(targetPath, langKey || getPageLanguageKey(this.page, this.config), this.config);
    const urlFor = hexo.extend.helper.get("url_for").bind(this);
    return isExternalUrl(localized) ? localized : urlFor(localized);
  });
  hexo.extend.helper.register("localized_tag_url", function (tag, langKey = null) {
    const urlFor = hexo.extend.helper.get("url_for").bind(this);
    if (!isI18nEnabled(this.config)) {
      return urlFor(typeof tag === "string" ? tag : tag.path);
    }
    const route = getLocalizedTagPath(tag, langKey || getPageLanguageKey(this.page, this.config), this.config);
    return urlFor(`/${route}`);
  });
};
