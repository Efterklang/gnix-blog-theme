module.exports = (hexo) => {
  require("./hexo/filter")(hexo);
  require("./hexo/generator")(hexo);
  require("./hexo/view").init(hexo);
  require("./hexo/helper")(hexo);
  require("./hexo/renderer")(hexo);
};
