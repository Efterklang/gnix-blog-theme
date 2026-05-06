const pagination = require("hexo-pagination");

module.exports = (hexo) => {
  hexo.extend.generator.register("index", function (locals) {
    const config = this.config;
    const themeConfig = hexo.theme.config.index_generator || {};
    const orderBy = themeConfig.order_by ?? "-date";
    const perPage = themeConfig.per_page ?? config.per_page ?? 16;
    const layout = themeConfig.layout ?? ["index", "archive"];
    const paginationDir = themeConfig.pagination_dir ?? config.pagination_dir ?? "page";
    const path = themeConfig.path ?? "";

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
  });
};
