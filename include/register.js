module.exports = (hexo) => {
  require("./hexo/filter/locals")(hexo);
  require("./hexo/generator/insight")(hexo);
  require("./hexo/generator/categories")(hexo);
  require("./hexo/generator/category")(hexo);
  require("./hexo/generator/manifest")(hexo);
  require("./hexo/generator/tags")(hexo);
  require("./hexo/helper/cdn")(hexo);
  require("./hexo/helper/page")(hexo);
  require("./hexo/view").init(hexo);
};
