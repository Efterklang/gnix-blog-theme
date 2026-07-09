const { getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

module.exports = (hexo) => {
  hexo.extend.generator.register("preferences", function (_locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);

    function getTitle(locale) {
      try {
        const translated = hexo.theme.i18n.__(locale)("preferences.title");
        if (translated && translated !== "preferences.title") return translated;
      } catch (_) {}
      return "Preferences";
    }

    function buildPreferencesPage(routePath, langKey = null, i18n = null) {
      const language = langKey ? getLanguage(fullConfig, langKey) : null;
      const data = {
        preferences: true,
        title: getTitle(language ? language.locale : config.language),
      };

      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = language.locale;
        data.i18n = i18n;
      }

      return {
        path: routePath,
        layout: ["preferences", "index"],
        data,
      };
    }

    if (!isI18nEnabled(fullConfig)) {
      return buildPreferencesPage("preferences/index.html");
    }

    const languageKeys = getLanguageKeys(fullConfig);
    const i18n = {};
    languageKeys.forEach((langKey) => {
      i18n[langKey] = `/${getLanguageBasePath(fullConfig, langKey)}preferences/`;
    });

    const defaultKey = getDefaultLanguageKey(fullConfig);
    const result = [];
    if (getLanguageBasePath(fullConfig, defaultKey)) {
      result.push(buildPreferencesPage("preferences/index.html", defaultKey, i18n));
    }

    languageKeys.forEach((langKey) => {
      result.push(buildPreferencesPage(`${getLanguageBasePath(fullConfig, langKey)}preferences/index.html`, langKey, i18n));
    });

    return result;
  });
};
