const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mdown", ".mkd", ".mkdn"]);

function getPosts(posts) {
  if (typeof posts?.toArray === "function") return posts.toArray();
  if (Array.isArray(posts?.data)) return posts.data;
  if (Array.isArray(posts)) return posts;
  return [];
}

function hasPassword(post) {
  return Boolean(post?.password || post?.password === 0);
}

function isMarkdownSource(post) {
  const source = post?.source || post?.full_source;
  if (typeof source !== "string") return false;
  return MARKDOWN_EXTENSIONS.has(path.extname(source).toLowerCase());
}

function getHtmlRoutePath(routePath) {
  if (typeof routePath !== "string") return null;
  const normalized = routePath.replace(/^\/+/, "").replace(/\\/g, "/").replace(/\?.*$/, "");
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

function readMarkdownFile(sourcePath) {
  let content;
  try {
    content = fs.readFileSync(sourcePath);
  } catch {
    return null;
  }

  const hasBom = content.length >= 3 && content.subarray(0, 3).equals(UTF8_BOM);
  return hasBom ? content : Buffer.concat([UTF8_BOM, content]);
}

module.exports = (hexo) => {
  hexo.extend.generator.register("md_generator", (locals) =>
    getPosts(locals.posts)
      .map((post) => {
        const markdownPath = getMarkdownOutputPath(post);
        const sourcePath = post?.full_source;

        if (!markdownPath || typeof sourcePath !== "string") {
          delete post.markdown_path;
          return null;
        }

        const data = readMarkdownFile(sourcePath);
        if (!data) {
          delete post.markdown_path;
          return null;
        }

        post.markdown_path = markdownPath;

        return {
          path: markdownPath,
          data: {
            data: () => Readable.from(data),
            modified: true,
          },
        };
      })
      .filter(Boolean),
  );
};
