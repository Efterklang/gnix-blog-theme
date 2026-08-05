module.exports = (hexo) => {
  hexo.extend.generator.register("page", (locals) =>
    locals.pages.map((page) => {
      const { layout } = page;

      if (!layout || layout === "false" || layout === "off") {
        return {
          path: page.path,
          data: page.content,
        };
      }

      const layouts = ["page", "post", "index"];
      if (layout !== "page") layouts.unshift(layout);

      page.__page = true;
      return {
        path: page.path,
        layout: layouts,
        data: page,
      };
    }),
  );
};
