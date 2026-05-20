const pagination = require("hexo-pagination");
const { filterByLanguage, getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");

const fmtNum = (num) => num.toString().padStart(2, "0");

function redirectTo(path) {
  const target = path.startsWith("/") ? path : `/${path}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"></head><body><a href="${target}">Continue</a></body></html>`;
}

module.exports = (hexo) => {
  hexo.extend.generator.register("archive", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const themeConfig = hexo.theme.config.archive_generator || {};
    let archiveDir = config.archive_dir || "archives";
    const paginationDir = config.pagination_dir || "page";
    const perPage = themeConfig.per_page ?? 0;
    const { Query } = this.model("Post");
    const result = [];

    if (!archiveDir.endsWith("/")) archiveDir += "/";

    function generate(path, posts, options = {}) {
      options.archive = true;
      result.push(
        ...pagination(path, posts, {
          perPage,
          layout: ["archive", "index"],
          format: `${paginationDir}/%d/`,
          data: options,
        }),
      );
    }

    function generateLanguageArchives(langKey = null) {
      const languageBase = langKey ? getLanguageBasePath(fullConfig, langKey) : "";
      const allPostsSource = locals.posts.sort(themeConfig.order_by || "-date");
      const allPosts = langKey ? filterByLanguage(allPostsSource, langKey, fullConfig) : allPostsSource;

      if (!allPosts.length) return;

      const baseArchiveDir = languageBase + archiveDir;
      const languageData = langKey
        ? {
            i18n_lang: langKey,
            lang: getLanguage(fullConfig, langKey).locale,
          }
        : {};

      generate(baseArchiveDir, allPosts, languageData);
      generate(languageBase || "", allPosts, languageData);

      const yearly = themeConfig.yearly ?? true;
      const monthly = themeConfig.monthly ?? true;
      const daily = themeConfig.daily ?? false;

      if (!yearly) return;

      const posts = {};

      allPosts.forEach((post) => {
        const date = post.date;
        const year = date.year();
        const month = date.month() + 1;

        if (!Object.hasOwn(posts, year)) {
          posts[year] = [[], [], [], [], [], [], [], [], [], [], [], [], []];
        }

        posts[year][0].push(post);
        posts[year][month].push(post);

        if (daily) {
          const day = date.date();
          if (!Object.hasOwn(posts[year][month], "day")) {
            posts[year][month].day = {};
          }
          (posts[year][month].day[day] || (posts[year][month].day[day] = [])).push(post);
        }
      });

      const years = Object.keys(posts);

      for (let i = 0, len = years.length; i < len; i++) {
        const year = +years[i];
        const data = posts[year];
        const url = `${baseArchiveDir + year}/`;
        if (!data[0].length) continue;

        generate(url, new Query(data[0]), Object.assign({ year }, languageData));

        if (!monthly && !daily) continue;

        for (let month = 1; month <= 12; month++) {
          const monthData = data[month];
          if (!monthData.length) continue;

          if (monthly) {
            generate(`${url + fmtNum(month)}/`, new Query(monthData), Object.assign({ year, month }, languageData));
          }

          if (!daily) continue;

          for (let day = 1; day <= 31; day++) {
            const dayData = monthData.day[day];
            if (!dayData || !dayData.length) continue;
            generate(`${url + fmtNum(month)}/${fmtNum(day)}/`, new Query(dayData), Object.assign({ year, month, day }, languageData));
          }
        }
      }
    }

    if (isI18nEnabled(fullConfig)) {
      const defaultLanguageBase = getLanguageBasePath(fullConfig, getDefaultLanguageKey(fullConfig));
      if (defaultLanguageBase) {
        result.push({
          path: "index.html",
          data: redirectTo(defaultLanguageBase),
        });
      }
      getLanguageKeys(fullConfig).forEach((langKey) => generateLanguageArchives(langKey));
      return result;
    }

    generateLanguageArchives();
    return result;
  });
};
