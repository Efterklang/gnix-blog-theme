const pagination = require("hexo-pagination");

const fmtNum = (num) => num.toString().padStart(2, "0");

module.exports = (hexo) => {
  hexo.extend.generator.register("archive", function (locals) {
    const { config } = this;
    const themeConfig = hexo.theme.config.archive_generator || {};
    let archiveDir = config.archive_dir || "archives";
    const paginationDir = config.pagination_dir || "page";
    const allPosts = locals.posts.sort(themeConfig.order_by || "-date");
    const perPage = themeConfig.per_page ?? 0;
    const result = [];

    if (!allPosts.length) return result;

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

    generate(archiveDir, allPosts);

    const yearly = themeConfig.yearly ?? true;
    const monthly = themeConfig.monthly ?? true;
    const daily = themeConfig.daily ?? false;

    if (!yearly) return result;

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

    const { Query } = this.model("Post");
    const years = Object.keys(posts);

    for (let i = 0, len = years.length; i < len; i++) {
      const year = +years[i];
      const data = posts[year];
      const url = `${archiveDir + year}/`;
      if (!data[0].length) continue;

      generate(url, new Query(data[0]), { year });

      if (!monthly && !daily) continue;

      for (let month = 1; month <= 12; month++) {
        const monthData = data[month];
        if (!monthData.length) continue;

        if (monthly) {
          generate(`${url + fmtNum(month)}/`, new Query(monthData), { year, month });
        }

        if (!daily) continue;

        for (let day = 1; day <= 31; day++) {
          const dayData = monthData.day[day];
          if (!dayData || !dayData.length) continue;
          generate(`${url + fmtNum(month)}/${fmtNum(day)}/`, new Query(dayData), { year, month, day });
        }
      }
    }

    return result;
  });
};
