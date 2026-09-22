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
    title: util.escapeHTML(String(post.title || "")).trim(),
    text: post.password ? "该文章需要密码" : minify(post.content),
    link: url_for(post.path),
  };
}

// 命令面板的空查询列出最近文章，索引按日期倒序（warehouse Query 的 sort 接收 "-date"）
function sortByDate(collection) {
  return typeof collection?.sort === "function" && !Array.isArray(collection) ? collection.sort("-date") : collection;
}

// 可检索的独立页面：跳过无布局直出的页面与 front-matter 标记 search: false 的页面
function indexablePages(pages) {
  return pages.filter((page) => page.layout && page.layout !== "false" && page.layout !== "off" && page.search !== false);
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

  // 命令面板的检索索引 content.json：posts / tags 必有，pages 由 search.index_pages 控制（默认开启）
  hexo.extend.generator.register("insight", function (locals) {
    const url_for = hexo.extend.helper.get("url_for").bind(this);
    const fullConfig = Object.assign({}, this.config, this.config.theme_config, hexo.theme.config);
    const searchConfig = fullConfig.search && typeof fullConfig.search === "object" ? fullConfig.search : {};
    const indexPages = searchConfig.index_pages !== false;

    function buildIndex(posts, pages, tags) {
      const data = { posts: sortByDate(posts).map((post) => mapPost(post, url_for)) };
      if (indexPages) data.pages = indexablePages(pages).map((page) => mapPost(page, url_for));
      data.tags = tags;
      return JSON.stringify(data);
    }

    if (isI18nEnabled(fullConfig)) {
      return getLanguageKeys(fullConfig).map((langKey) => {
        const posts = filterByLanguage(locals.posts, langKey, fullConfig);
        const pages = filterByLanguage(locals.pages, langKey, fullConfig);
        const tags = locals.tags.filter((tag) => filterByLanguage(tag.posts, langKey, fullConfig).length).map((tag) => mapTag(tag, url_for, langKey, fullConfig));

        return {
          path: `${getLanguageBasePath(fullConfig, langKey)}content.json`,
          data: buildIndex(posts, pages, tags),
        };
      });
    }

    return {
      path: "/content.json",
      data: buildIndex(
        locals.posts,
        locals.pages,
        locals.tags.map((tag) => mapTag(tag, url_for)),
      ),
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

  const statusConfig = hexo.theme.config.status_generator || {};
  if (statusConfig.enabled !== false) {
    require("./status")(hexo);
  }

  require("./preferences")(hexo);

  require("./page")(hexo);
};
