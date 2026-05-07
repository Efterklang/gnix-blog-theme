const path = require("node:path");

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mdown", ".mkd", ".mkdn"]);

function hasPassword(post) {
  return Boolean(post?.password || post?.password === 0);
}

function isMarkdownSource(post) {
  const source = post?.source || post?.full_source;
  if (typeof source !== "string") return false;

  return MARKDOWN_EXTENSIONS.has(path.extname(source).toLowerCase());
}

function normalizeRoutePath(routePath) {
  if (typeof routePath !== "string") return null;

  return routePath.replace(/^\/+/, "").replace(/\\/g, "/").replace(/\?.*$/, "");
}

function getHtmlRoutePath(routePath) {
  const normalized = normalizeRoutePath(routePath);
  if (normalized === null) return null;

  if (!normalized || normalized.endsWith("/")) {
    return `${normalized}index.html`;
  }

  return normalized;
}

function getMarkdownOutputPath(post) {
  if (hasPassword(post) || !isMarkdownSource(post)) return null;

  const htmlPath = getHtmlRoutePath(post?.path);
  if (!htmlPath) return null;

  const ext = path.posix.extname(htmlPath);
  if (!ext) return `${htmlPath}.md`;

  return `${htmlPath.slice(0, -ext.length)}.md`;
}

module.exports = {
  getMarkdownOutputPath,
  hasPassword,
  isMarkdownSource,
};
