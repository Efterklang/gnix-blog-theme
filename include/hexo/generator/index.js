const util = require("hexo-util");

function minify(str) {
  return util
    .stripHTML(str)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/&#(?:x([\da-fA-F]+)|([\d]+));/g, (_, hex, dec) => {
      return String.fromCharCode(parseInt(hex || dec, hex ? 16 : 10));
    });
}

function mapPost(post, url_for) {
  return {
    title: util.escapeHTML(post.title).trim(),
    text: post.password ? "该文章需要密码" : minify(post.content),
    link: url_for(post.path),
  };
}

function mapTag(tag, url_for) {
  return {
    name: util.escapeHTML(tag.name).trim(),
    slug: minify(tag.slug),
    link: url_for(tag.path),
  };
}

module.exports = (hexo) => {
  const mdConfig = hexo.theme.config.md_generator || {};
  if (mdConfig.enabled !== false) {
    require("./md_generator")(hexo);
  }

  hexo.extend.generator.register("insight", function (locals) {
    const url_for = hexo.extend.helper.get("url_for").bind(this);
    const site = {
      posts: locals.posts.map((post) => mapPost(post, url_for)),
      tags: locals.tags.map((tag) => mapTag(tag, url_for)),
    };

    return {
      path: "/content.json",
      data: JSON.stringify(site),
    };
  });

  const tagConfig = hexo.theme.config.tag_generator || {};
  if (tagConfig.enabled !== false) {
    require("./tag")(hexo);
  }

  const archiveConfig = hexo.theme.config.archive_generator || {};
  if (archiveConfig.enabled !== false) {
    require("./archive")(hexo);
  }

  const indexConfig = hexo.theme.config.index_generator || {};
  if (indexConfig.enabled !== false) {
    require("./home")(hexo);
  }
};
