const path = require("node:path");
const { slugize } = require("hexo-util");

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const LINK_RE = /^\[\[\s*([^*"\\/<>:?[\]|#]+)\s*(#[^"\\/[\]|]+)?\s*(\\?\|[^/[\]]*)?\s*\]\]/;

function decodePart(value) {
  if (!value) return "";
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function getFileName(item) {
  if (!item.source) return "";
  return path.basename(item.source, path.extname(item.source));
}

function getPermalink(item) {
  let link = item.path || "";
  link = link.replace(/index\.html$/, "");
  if (link.startsWith("/")) link = link.slice(1);
  if (!link.startsWith("/")) link = `/${link}`;
  return link;
}

function buildPostIndex(hexo) {
  const posts = hexo.model("Post").toArray();
  const pages = hexo.model("Page").toArray();
  const index = new Map();

  for (const item of [...posts, ...pages]) {
    const ext = path.extname(item.source || "").toLowerCase();
    if (!MARKDOWN_EXTENSIONS.has(ext)) continue;

    const fileName = getFileName(item);
    if (!fileName) continue;

    index.set(fileName.toLowerCase(), getPermalink(item));
  }

  return index;
}

function createTitlebasedLink(hexo) {
  let postIndex = null;
  const ensurePostIndex = () => {
    if (!postIndex) postIndex = buildPostIndex(hexo);
    return postIndex;
  };

  hexo.extend.filter.register("before_generate", () => {
    postIndex = buildPostIndex(hexo);
  });

  return (md) => {
    md.inline.ruler.before("text", "titlebased_link", (state, silent) => {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5b) return false;
      if (start > 0 && state.src.charCodeAt(start - 1) === 0x21) return false;

      const match = state.src.slice(start).match(LINK_RE);
      if (!match) return false;

      const fileName = decodePart(match[1]).trim();
      const href = ensurePostIndex().get(fileName.toLowerCase());
      if (!href) return false;
      if (silent) return true;

      const alias = match[3] ? decodePart(match[3]).replace(/^\\?\|/, "") : "";
      const anchorText = match[2] ? decodePart(match[2]).slice(1).trim() : "";
      const slug = anchorText ? slugize(anchorText, { transform: 1 }) : "";
      const anchor = slug ? `#${slug}` : "";

      const open = state.push("link_open", "a", 1);
      open.attrSet("href", `${href}${anchor}`);

      const text = state.push("text", "", 0);
      text.content = alias || fileName;

      state.push("link_close", "a", -1);
      state.pos = start + match[0].length;
      return true;
    });
  };
}

module.exports = createTitlebasedLink;
