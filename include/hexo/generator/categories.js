// Generates the <root>/categories page
module.exports = (hexo) => {
  hexo.extend.generator.register("categories", (locals) => {
    return {
      path: "categories/",
      layout: ["categories"],
      data: Object.assign({}, locals, {
        __categories: true,
      }),
    };
  });
};
