// Generate "<root>/tags/" page
module.exports = (hexo) => {
  hexo.extend.generator.register("tags", (locals) => {
    return {
      path: "tags/",
      layout: ["tags"],
      data: Object.assign({}, locals, {
        __tags: true,
      }),
    };
  });
};
