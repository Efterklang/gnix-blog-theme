const path = require("node:path");
const { filterByLanguage, getDefaultLanguageKey, getLanguage, getLanguageBasePath, getLanguageKeys, isI18nEnabled } = require("../../util/i18n");
const { isEncrypted } = require("../encrypt");

// 文章之间的双链图：titlebased-link 把 [[文件名]] 渲染成 <a class="wiki-link" data-wiki-key="…">，
// 这里从渲染后的正文里把 data-wiki-key 收回来，连成无向图。只收默认语言的公开文章
// （译本与原文是同一篇；加密文章不进图），只保留至少有一条连线的节点
const KEY_RE = /data-wiki-key="([^"]+)"/g;

function collect(collection) {
  if (Array.isArray(collection)) return collection;
  if (typeof collection?.toArray === "function") return collection.toArray();
  const items = [];
  collection?.each?.((item) => items.push(item));
  return items;
}

function fileKey(item) {
  const source = item.source || "";
  return path.basename(source, path.extname(source)).toLowerCase();
}

function firstTag(post) {
  const tags = typeof post.tags?.toArray === "function" ? post.tags.toArray() : [];
  return tags[0]?.name || "";
}

module.exports = (hexo) => {
  hexo.extend.generator.register("graph", function (locals) {
    const { config } = this;
    const fullConfig = Object.assign({}, config, config.theme_config, hexo.theme.config);
    const url_for = hexo.extend.helper.get("url_for").bind(this);
    const i18n = isI18nEnabled(fullConfig);
    const defaultKey = i18n ? getDefaultLanguageKey(fullConfig) : null;

    const posts = collect(i18n ? filterByLanguage(locals.posts, defaultKey, fullConfig) : locals.posts).filter((post) => !isEncrypted(post) && post.published !== false);
    const byKey = new Map(posts.map((post) => [fileKey(post), post]));

    const edgeSet = new Set();
    for (const post of posts) {
      const from = fileKey(post);
      for (const match of String(post.content || "").matchAll(KEY_RE)) {
        const to = match[1].toLowerCase();
        if (to !== from && byKey.has(to)) edgeSet.add([from, to].sort().join("\u0000"));
      }
    }
    const degree = new Map();
    for (const edge of edgeSet) for (const key of edge.split("\u0000")) degree.set(key, (degree.get(key) || 0) + 1);

    const nodes = posts
      .filter((post) => degree.has(fileKey(post)))
      .sort((a, b) => b.date.valueOf() - a.date.valueOf())
      .map((post) => ({ id: fileKey(post), title: String(post.title || ""), url: url_for(post.path), tag: firstTag(post), degree: degree.get(fileKey(post)) }));
    const edges = [...edgeSet].map((edge) => edge.split("\u0000"));
    const json = JSON.stringify({ nodes, edges });

    const pageData = (langKey, i18nMap) => {
      const data = { graph: true, title: "Graph", nodeCount: nodes.length, edgeCount: edges.length };
      if (langKey) {
        data.i18n_lang = langKey;
        data.lang = getLanguage(fullConfig, langKey).locale;
        data.i18n = i18nMap;
      }
      return data;
    };

    const routes = [{ path: "graph.json", data: json }];
    if (!i18n) {
      routes.push({ path: "graph/", layout: ["graph", "index"], data: pageData() });
      return routes;
    }

    const languageKeys = getLanguageKeys(fullConfig);
    const i18nMap = {};
    for (const langKey of languageKeys) i18nMap[langKey] = `/${getLanguageBasePath(fullConfig, langKey)}graph/`;
    if (getLanguageBasePath(fullConfig, defaultKey)) routes.push({ path: "graph/", layout: ["graph", "index"], data: pageData(defaultKey, i18nMap) });
    for (const langKey of languageKeys) routes.push({ path: `${getLanguageBasePath(fullConfig, langKey)}graph/`, layout: ["graph", "index"], data: pageData(langKey, i18nMap) });
    return routes;
  });
};
