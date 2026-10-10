const { getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

// 站点首页：每种语言在各自前缀下生成一份（默认语言落在站点根路径）。
// 页面内容由主题配置的 home 段与站点标签统计驱动；归档列表由 archive 生成器另行生成在 archive/
module.exports = (hexo) => {
  hexo.extend.generator.register("home", function (_locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);

    function buildHomePage(routePath, langKey = null, i18n = null) {
      const data = { home: true };

      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = getLanguage(fullConfig, langKey).locale;
        data.i18n = i18n;
      }

      return {
        path: routePath,
        layout: ["home", "index"],
        data,
      };
    }

    if (!isI18nEnabled(fullConfig)) {
      return buildHomePage("");
    }

    const languageKeys = getLanguageKeys(fullConfig);
    const i18n = {};
    languageKeys.forEach((langKey) => {
      i18n[langKey] = `/${getLanguageBasePath(fullConfig, langKey)}`;
    });

    const defaultKey = getDefaultLanguageKey(fullConfig);
    const result = [];
    // 默认语言带前缀时（如 /zh-CN/），根路径镜像一份默认语言首页，保证 /index.html 有内容
    if (getLanguageBasePath(fullConfig, defaultKey)) {
      result.push(buildHomePage("", defaultKey, i18n));
    }

    languageKeys.forEach((langKey) => {
      result.push(buildHomePage(getLanguageBasePath(fullConfig, langKey), langKey, i18n));
    });

    return result;
  });
};
