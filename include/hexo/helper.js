function getCDN(cdn, pkg, version, filename) {
  switch (cdn) {
    case "host":
      return `/js/host/${pkg}/${version}/${filename}`;
    case "loli":
      return `https://cdnjs.loli.net/ajax/libs/${pkg}/${version}/${filename}`;
    case "jsdelivr":
      return `https://cdn.jsdelivr.net/npm/${pkg}@${version}/${filename}`;
    case "bootcdn":
      return `https://cdn.bootcdn.net/ajax/libs/${pkg}/${version}/${filename}`;
    default:
      throw new Error(`Unknown CDN provider: ${cdn}`);
  }
}

const {
  getPageLanguageKey,
  getPageLocale,
  getLocalizedTagPath,
  isExternalUrl,
  isI18nEnabled,
  localizePath,
} = require("../util/i18n");

module.exports = (hexo) => {
  hexo.extend.helper.register("cdn", function (_package, version, filename) {
    cdn = this.config.providers?.cdn ? this.config.providers.cdn : "jsdelivr";
    return getCDN(cdn, _package, version, filename);
  });
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
