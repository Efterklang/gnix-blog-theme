const pagination = require("hexo-pagination");

module.exports = (hexo) => {
  hexo.extend.generator.register("tag", function (locals) {
    const config = this.config;
    const themeConfig = hexo.theme.config.tag_generator || {};
    const perPage = themeConfig.per_page ?? 10;
    const orderBy = themeConfig.order_by ?? "-date";
    const paginationDir = config.pagination_dir || "page";
    const tags = locals.tags;
    const result = [];

    // Generate individual tag pages with pagination
    tags.forEach((tag) => {
      if (!tag.length) return;

      const posts = tag.posts.sort(orderBy);
      const data = pagination(tag.path, posts, {
        perPage,
        layout: ["tag", "archive", "index"],
        format: `${paginationDir}/%d/`,
        data: {
          tag: tag.name,
        },
      });

      result.push(...data);
    });

    // Generate tag index page (/tags/)
    const tagDir = config.tag_dir || "tags";
    const tagDirWithSlash = tagDir.endsWith("/") ? tagDir : `${tagDir}/`;

    result.push({
      path: tagDirWithSlash,
      layout: ["tags"],
      data: {
        base: tagDirWithSlash,
        total: 1,
        current: 1,
        current_url: tagDirWithSlash,
        prev: 0,
        prev_link: "",
        next: 0,
        next_link: "",
        __tags: true,
      },
    });

    return result;
  });
};
