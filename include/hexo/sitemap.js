// Adapted from hexo-generator-sitemap (MIT, (c) Tommy Chen)
// https://github.com/hexojs/hexo-generator-sitemap

const { extname } = require("node:path");
const { encodeURL, url_for } = require("hexo-util");

const DEFAULT_CONFIG = {
  path: ["sitemap.xml", "sitemap.txt"],
  rel: false,
  tags: true,
  categories: true,
};

const DEFAULT_SKIP_PATTERNS = ["**/*.js", "**/*.css"];
const REL_SITEMAP_RE = /rel=['|"]?sitemap['|"]?/i;
const HEAD_RE = /<head>(?!<\/head>).+?<\/head>/s;
const REGEX_ESCAPE_CHARS = "\\^$.+()[]{}|";

function globToRegExp(pattern) {
  let regex = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        regex += ".*";
        i++;
        if (pattern[i + 1] === "/") i++;
      } else {
        regex += "[^/]*";
      }
    } else if (ch === "?") {
      regex += "[^/]";
    } else if (REGEX_ESCAPE_CHARS.includes(ch)) {
      regex += `\\${ch}`;
    } else {
      regex += ch;
    }
  }
  return new RegExp(`^${regex}$`);
}

function buildMatcher(patterns) {
  const compiled = patterns.map(globToRegExp);
  return (value) => compiled.some((re) => re.test(value));
}

function normalizePaths(rawPath) {
  const paths = Array.isArray(rawPath) ? rawPath : typeof rawPath === "string" ? [rawPath] : DEFAULT_CONFIG.path;
  return paths.filter((p) => typeof p === "string" && p.trim()).map((p) => (extname(p) ? p : `${p}.xml`));
}

function formatDate(date) {
  return date.toISOString().substring(0, 10);
}

function getLastMod(post) {
  const value = post.updated || post.date;
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  return value instanceof Date ? value : null;
}

function getSortKey(post) {
  const value = post.updated;
  if (!value) return 0;
  if (typeof value.valueOf === "function") return value.valueOf();
  return value instanceof Date ? value.getTime() : 0;
}

function renderXml({ posts, tags, categories, siteUrl, now }) {
  const formattedNow = formatDate(now);

  const postEntries = posts
    .map((post) => {
      const lastMod = getLastMod(post);
      const lastModLine = lastMod ? `\n    <lastmod>${formatDate(lastMod)}</lastmod>` : "";
      return `  <url>
    <loc>${encodeURL(post.permalink)}</loc>${lastModLine}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join("\n");

  const taxonomyEntries = (items, freq, priority) =>
    items
      .map(
        (item) => `  <url>
    <loc>${encodeURL(item.permalink)}</loc>
    <lastmod>${formattedNow}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
      )
      .join("\n");

  const sections = [
    postEntries,
    `  <url>
    <loc>${encodeURL(siteUrl)}</loc>
    <lastmod>${formattedNow}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    taxonomyEntries(tags, "weekly", "0.2"),
    taxonomyEntries(categories, "weekly", "0.2"),
  ].filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sections.join("\n\n")}
</urlset>
`;
}

function renderTxt({ posts, tags, categories, siteUrl }) {
  const lines = [
    ...posts.map((post) => encodeURL(post.permalink)),
    encodeURL(siteUrl),
    ...tags.map((tag) => encodeURL(tag.permalink)),
    ...categories.map((cat) => encodeURL(cat.permalink)),
  ];
  return `${lines.join("\n")}\n`;
}

const RENDERERS = {
  ".xml": renderXml,
  ".txt": renderTxt,
};

module.exports = (hexo) => {
  const config = Object.assign({}, DEFAULT_CONFIG, hexo.config.sitemap);
  config.path = normalizePaths(config.path);
  hexo.config.sitemap = config;

  hexo.extend.generator.register("sitemap", function (locals) {
    const skipPatterns = [...DEFAULT_SKIP_PATTERNS];
    const userSkip = this.config.skip_render;
    if (Array.isArray(userSkip)) {
      skipPatterns.push(...userSkip);
    } else if (typeof userSkip === "string" && userSkip.length > 0) {
      skipPatterns.push(userSkip);
    }

    const isSkipped = buildMatcher(skipPatterns);
    const posts = []
      .concat(locals.posts.toArray(), locals.pages.toArray())
      .filter((post) => post.sitemap !== false && !isSkipped(post.source))
      .sort((a, b) => getSortKey(b) - getSortKey(a));

    if (posts.length === 0) {
      config.rel = false;
      return;
    }

    const context = {
      posts,
      tags: config.tags ? locals.tags.toArray() : [],
      categories: config.categories ? locals.categories.toArray() : [],
      siteUrl: this.config.url,
      now: new Date(),
    };

    return config.path
      .map((p) => {
        const renderer = RENDERERS[extname(p)];
        return renderer ? { path: p, data: renderer(context) } : null;
      })
      .filter(Boolean);
  });

  if (config.rel === true) {
    hexo.extend.filter.register("after_render:html", function (data) {
      const sitemapConfig = hexo.config.sitemap;
      if (!sitemapConfig.rel || REL_SITEMAP_RE.test(data)) return data;

      const xmlPath = sitemapConfig.path.find((p) => extname(p) === ".xml");
      if (!xmlPath) return data;

      const tag = `<link rel="sitemap" type="application/xml" title="Sitemap" href="${url_for.call(this, xmlPath)}">`;
      return data.replace(HEAD_RE, (str) => str.replace("</head>", `${tag}</head>`));
    });
  }
};
