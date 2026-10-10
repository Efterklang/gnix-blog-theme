const { Component } = require("../include/util/common");
const { filterByLanguage, isExternalUrl } = require("../include/util/i18n");

// 未配置 home.rows 时的兜底：归档入口 + 前三个标签
const DEFAULT_ROWS = [
  { label: "Index", links: [{ text: "Archive", href: "archive" }] },
  { label: "Top Topics", tags: 3 },
];
const DEFAULT_TAG_LIMIT = 3;

// 简介里唯一支持的标记：[text](url)
const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function collectTags(collection) {
  const tags = [];
  if (collection?.each) {
    collection.each((tag) => tags.push(tag));
  } else if (typeof collection?.toArray === "function") {
    tags.push(...collection.toArray());
  } else if (Array.isArray(collection)) {
    tags.push(...collection);
  }
  return tags;
}

// 按当前语言的文章数取前 limit 个标签；同数按名称排序，保证构建结果稳定
function getTopTags(siteTags, limit, { page, config, helper }) {
  const langKey = helper.language_key(page);

  return collectTags(siteTags)
    .map((tag) => {
      if (!tag?.length) return null;

      const posts = helper.is_i18n_enabled() ? filterByLanguage(tag.posts, langKey, config || {}) : tag.posts;
      const count = posts?.length || 0;
      if (!count) return null;

      return { name: tag.name, count, url: helper.localized_tag_url(tag, langKey) };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

function getTagLimit(value) {
  if (value === true) return DEFAULT_TAG_LIMIT;
  const limit = Math.floor(Number(value));
  return Number.isFinite(limit) && limit > 0 ? limit : 0;
}

// 站内路径随当前语言本地化（archive → /archive/ 或 /en/archive/），外链原样输出并新开标签页
function linkAttrs(href, helper, langKey) {
  const target = String(href);
  const attrs = { href: helper.localized_url_for(target, langKey) };
  if (isExternalUrl(target)) {
    attrs.target = "_blank";
    attrs.rel = "noopener noreferrer";
  }
  return attrs;
}

function renderIntro(text, helper, langKey) {
  const source = String(text);
  const nodes = [];
  let cursor = 0;

  for (const match of source.matchAll(INLINE_LINK_RE)) {
    if (match.index > cursor) nodes.push(source.slice(cursor, match.index));
    nodes.push(
      <a key={match.index} class="home-intro__link" {...linkAttrs(match[2], helper, langKey)}>
        {match[1]}
      </a>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) nodes.push(source.slice(cursor));

  return nodes;
}

module.exports = class extends Component {
  render() {
    const { config, page, site, helper } = this.props;
    const home = config.home && typeof config.home === "object" ? config.home : {};
    const langKey = helper.language_key(page);

    const title = home.title || config.author || config.title;
    const intro = home.intro || config.description;
    const rows = Array.isArray(home.rows) && home.rows.length ? home.rows : DEFAULT_ROWS;

    // --i 为页面级入场次序：标题领先，简介与各行依次跟进（见 home.css）
    let order = 0;
    const titleNode = (
      <h1 class="home-hero__title" style={`--i:${order++}`}>
        {title}
      </h1>
    );
    const introNode = intro ? (
      <p class="home-hero__intro" style={`--i:${order++}`}>
        {renderIntro(intro, helper, langKey)}
      </p>
    ) : null;

    const rowNodes = rows
      .map((row, index) => {
        if (!row || typeof row !== "object") return null;

        const links = Array.isArray(row.links) ? row.links.filter((link) => link && link.href) : [];
        const tagLimit = getTagLimit(row.tags);
        const tags = tagLimit ? getTopTags(site?.tags, tagLimit, { page, config, helper }) : [];
        if (!links.length && !tags.length) return null;

        return (
          <div key={index} class="home-links__row" style={`--i:${order++}`}>
            <dt class="home-links__label">{row.label}</dt>
            <dd class="home-links__value">
              {links.map((link) => (
                <a key={`${link.href}:${link.text}`} class="home-links__link" {...linkAttrs(link.href, helper, langKey)}>
                  {link.text || link.href}
                </a>
              ))}
              {tags.map((tag) => (
                <a key={tag.url} class="home-links__tag" href={tag.url}>
                  {tag.name}
                </a>
              ))}
            </dd>
          </div>
        );
      })
      .filter(Boolean);

    return (
      <main class="home-page">
        <section class="home-hero">
          {titleNode}
          {introNode}
          {rowNodes.length ? <dl class="home-links">{rowNodes}</dl> : null}
        </section>
      </main>
    );
  }
};
