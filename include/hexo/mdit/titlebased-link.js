const path = require("node:path");
const { slugize, stripHTML, unescapeHTML } = require("hexo-util");

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

    index.set(fileName.toLowerCase(), { href: getPermalink(item), title: String(item.title || fileName) });
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

  // Generators run after post rendering: excerpt is already available, including
  // <!-- more --> excerpts. Never render content again to construct previews.
  hexo.extend.generator.register("wiki-link-previews", (locals) => {
    const previews = Object.create(null);
    for (const item of [...locals.posts.toArray(), ...locals.pages.toArray()]) {
      if (!MARKDOWN_EXTENSIONS.has(path.extname(item.source || "").toLowerCase()) || item.published === false) continue;
      const fileName = getFileName(item);
      if (!fileName) continue;
      const encrypted = item.encrypt || (item.password !== undefined && item.password !== null && item.password !== "");
      const plain = encrypted ? "" : unescapeHTML(stripHTML(String(item.excerpt || "").replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?>/gi, " "))).replace(/\s+/g, " ").trim();
      const characters = Array.from(plain);
      previews[fileName.toLowerCase()] = {
        title: String(item.title || fileName),
        excerpt: characters.length > 280 ? `${characters.slice(0, 280).join("")}…` : plain,
      };
    }
    return { path: "wiki-link-previews.json", data: JSON.stringify(previews) };
  });

  return (md) => {
    md.inline.ruler.before("text", "titlebased_link", (state, silent) => {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5b) return false;
      if (start > 0 && state.src.charCodeAt(start - 1) === 0x21) return false;

      const match = state.src.slice(start).match(LINK_RE);
      if (!match) return false;

      const fileName = decodePart(match[1]).trim();
      const target = ensurePostIndex().get(fileName.toLowerCase());
      if (!target) return false;
      if (silent) return true;

      const alias = match[3] ? decodePart(match[3]).replace(/^\\?\|/, "") : "";
      const anchorText = match[2] ? decodePart(match[2]).slice(1).trim() : "";
      const slug = anchorText ? slugize(anchorText, { transform: 1 }) : "";
      const anchor = slug ? `#${slug}` : "";

      const open = state.push("link_open", "a", 1);
      open.attrSet("href", `${target.href}${anchor}`);
      open.attrSet("class", "wiki-link");
      open.attrSet("data-wiki-title", target.title);
      open.attrSet("data-wiki-key", fileName.toLowerCase());
      open.attrSet("title", target.title);

      const text = state.push("text", "", 0);
      text.content = alias || fileName;

      state.push("link_close", "a", -1);
      state.pos = start + match[0].length;
      return true;
    });
  };
}

module.exports = createTitlebasedLink;
