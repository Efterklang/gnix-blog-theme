const util = require("hexo-util");

module.exports = (hexo) => {
  hexo.extend.generator.register("insight", function (locals) {
    const url_for = hexo.extend.helper.get("url_for").bind(this);
    function minify(str) {
      return util
        .stripHTML(str)
        .trim()
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/&#x([\da-fA-F]+);/g, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        })
        .replace(/&#([\d]+);/g, (_, dec) => {
          return String.fromCharCode(dec);
        });
    }
    function mapPost(post) {
      return {
        title: util.escapeHTML(post.title).trim(),
        text: post.password ? "该文章需要密码" : minify(post.content),
        link: url_for(post.path),
      };
    }
    function mapTag(tag) {
      return {
        name: util.escapeHTML(tag.name).trim(),
        slug: minify(tag.slug),
        link: url_for(tag.path),
      };
    }
    const site = {
      posts: locals.posts.map(mapPost),
      tags: locals.tags.map(mapTag),
    };

    return {
      path: "/content.json",
      data: JSON.stringify(site),
    };
  });
  // Generate "<root>/tags/" page
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
