const { getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

function getPreferencesTitle(langKey) {
  return langKey === "cn" ? "偏好设置" : "Preferences";
}

module.exports = (hexo) => {
  hexo.extend.generator.register("preferences", function () {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);

    function buildPreferencesPage(routePath, langKey = null, i18n = null) {
      const data = {
        preferences: true,
        title: getPreferencesTitle(langKey),
      };

      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = getLanguage(fullConfig, langKey).locale;
        data.i18n = i18n;
      }

      return {
        path: routePath,
        layout: ["preferences", "index"],
        data,
      };
    }

    if (!isI18nEnabled(fullConfig)) {
      return buildPreferencesPage("preferences.html");
    }

    const languageKeys = getLanguageKeys(fullConfig);
    const i18n = {};
    languageKeys.forEach((langKey) => {
      i18n[langKey] = `/${getLanguageBasePath(fullConfig, langKey)}preferences.html`;
    });

    const defaultKey = getDefaultLanguageKey(fullConfig);
    const result = [];
    if (getLanguageBasePath(fullConfig, defaultKey)) {
      result.push(buildPreferencesPage("preferences.html", defaultKey, i18n));
    }

    languageKeys.forEach((langKey) => {
      result.push(buildPreferencesPage(`${getLanguageBasePath(fullConfig, langKey)}preferences.html`, langKey, i18n));
    });

    return result;
  });
};
