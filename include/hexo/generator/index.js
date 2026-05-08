const util = require("hexo-util");
const { filterByLanguage, getLanguageBasePath, getLanguageKeys, getLocalizedTagPath, isI18nEnabled } = require("../../util/i18n");

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

function mapTag(tag, url_for, langKey = null, config = {}) {
  return {
    name: util.escapeHTML(tag.name).trim(),
    slug: minify(tag.slug),
    link: url_for(langKey ? `/${getLocalizedTagPath(tag, langKey, config)}` : tag.path),
  };
}

module.exports = (hexo) => {
  const mdConfig = hexo.theme.config.md_generator || {};
  if (mdConfig.enabled !== false) {
    require("./md_generator")(hexo);
  }

  hexo.extend.generator.register("insight", function (locals) {
    const url_for = hexo.extend.helper.get("url_for").bind(this);
    const fullConfig = Object.assign({}, this.config, this.config.theme_config, hexo.theme.config);

    if (isI18nEnabled(fullConfig)) {
      return getLanguageKeys(fullConfig).map((langKey) => {
        const posts = filterByLanguage(locals.posts, langKey, fullConfig);
        const tags = locals.tags
          .filter((tag) => filterByLanguage(tag.posts, langKey, fullConfig).length)
          .map((tag) => mapTag(tag, url_for, langKey, fullConfig));

        return {
          path: `${getLanguageBasePath(fullConfig, langKey)}content.json`,
          data: JSON.stringify({
            posts: posts.map((post) => mapPost(post, url_for)),
            tags,
          }),
        };
      });
    }

    return {
      path: "/content.json",
      data: JSON.stringify({
        posts: locals.posts.map((post) => mapPost(post, url_for)),
        tags: locals.tags.map((tag) => mapTag(tag, url_for)),
      }),
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

  require("./page")(hexo);
};
