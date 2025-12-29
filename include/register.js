module.exports = (hexo) => {
  require("./hexo/filter/locals")(hexo);
  require("./hexo/generator/insight")(hexo);
  require("./hexo/generator/tags")(hexo);
  require("./hexo/view").init(hexo);
  require("./hexo/helper")(hexo);
  require("./hexo/renderer")(hexo);
};
