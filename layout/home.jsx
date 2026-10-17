const { Component, formatMonthDay, isValidDate, parseISO } = require("../include/util/common");
const { filterByLanguage, isExternalUrl } = require("../include/util/i18n");
const { Icon } = require("../include/util/lucide");

// 未配置 home.rows 时的兜底：前三个标签
const DEFAULT_ROWS = [{ label: "Top Topics", tags: 3 }];
const DEFAULT_TAG_LIMIT = 3;
// 未配置 home.recent 时首页列出的最新文章数
const DEFAULT_RECENT_LIMIT = 5;

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

function collectPosts(collection) {
  const posts = [];
  if (collection?.each) {
    collection.each((post) => posts.push(post));
  } else if (Array.isArray(collection)) {
    posts.push(...collection);
  }
  return posts;
}

// 当前语言下最新的 limit 篇文章
function getRecentPosts(sitePosts, limit, { page, config, helper }) {
  const langKey = helper.language_key(page);
  const collection = helper.is_i18n_enabled() ? filterByLanguage(sitePosts, langKey, config || {}) : sitePosts;

  return collectPosts(collection)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf())
    .slice(0, limit);
}

function getRecentLimit(value) {
  if (value === undefined || value === true) return DEFAULT_RECENT_LIMIT;
  const limit = Math.floor(Number(value));
  return Number.isFinite(limit) && limit > 0 ? limit : 0;
}

// 条目日期沿用归档列表的「缩写月 + 日」与 dateTime 注脚
function getPostDateParts(postDate, dateXml, date) {
  const xml = dateXml(postDate);
  const parsed = parseISO(xml);
  return {
    label: isValidDate(parsed) ? formatMonthDay(parsed) : date(postDate),
    xml,
  };
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

module.exports = class extends Component {
  render() {
    const { config, page, site, helper } = this.props;
    const home = config.home && typeof config.home === "object" ? config.home : {};
    const langKey = helper.language_key(page);

    const rows = Array.isArray(home.rows) && home.rows.length ? home.rows : DEFAULT_ROWS;

    const recentLimit = getRecentLimit(home.recent);
    const recentPosts = recentLimit ? getRecentPosts(site?.posts, recentLimit, { page, config, helper }) : [];
    const archiveUrl = helper.localized_url_for(config.archive_generator?.path || "archive");
    const recentTitle = helper.__("home.recent_writings");
    const encryptedLabel = helper.__("encrypt.abstract");

    // --i 为页面级入场次序：标题领先，简介与各行依次跟进（见 home.css）
    let order = 0;
    const titleNode = (
      <h1 class="home-hero__title" style={`--i:${order++};`}>
        GnixAij Oag
      </h1>
    );
    const introNode = (
      <>
        <p class="home-hero__intro" style={`--i:${order++}`}>
          Hello! My name is pronounced{" "}
          <span class="home-hero__ipa" lang="und-Latn-fonipa">
            /nɪkˈsaɪdʒ oʊɡ/
          </span> —— a name I coined myself.
          I was born in 2004 in Qingdao, Shandong.
          This is my digital garden, where I archive essays and engineering notes. There is also
          a{" "}
          <a class="home-intro__link" {...linkAttrs("https://wiki.vluv.space", helper, langKey)}>
            Wiki
          </a>{" "}
          and a{" "}
          <a class="home-intro__link" {...linkAttrs("https://gallery.vluv.space", helper, langKey)}>
            Gallery
          </a> if you'd like to wander further.
        </p>
        <p class="home-hero__intro" style={`--i:${order++}`}>
          See the{" "}
          <a class="home-intro__link" {...linkAttrs("change", helper, langKey)}>
            Changelog
          </a>{" "}
          for updates and the{" "}
          <a class="home-intro__link" {...linkAttrs("colophon", helper, langKey)}>
            Colophon
          </a>{" "}
          for how this site is made. Reach me at{" "}
          <a class="home-intro__link" {...linkAttrs("mailto:gjx@linux.do", helper, langKey)}>
            gjx@linux.do
          </a>
          .
        </p>
        <p class="home-hero__caption" style={`--i:${order++}`}>
          Scroll down for the top topics and my recent writings.
        </p>
      </>
    );

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
                <a key={`${link.href}:${link.text}`} class="home-list-link" {...linkAttrs(link.href, helper, langKey)}>
                  {link.text || link.href}
                </a>
              ))}
              {tags.map((tag) => (
                <a key={tag.url} class="home-list-link home-list-link--tag" href={tag.url}>
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
        </section>
        {rowNodes.length || recentPosts.length ? (
          <section class="home-index">
            {rowNodes.length ? <dl class="home-links__list">{rowNodes}</dl> : null}
            {recentPosts.length ? (
              <div class="home-recent">
                <h2 id="home-recent-title" class="home-recent__title" style={`--i:${order++}`}>
                  <a class="home-recent__title-link" href={archiveUrl}>
                    {recentTitle}
                    <Icon name="arrow-up-right" size={12} />
                  </a>
                </h2>
                <div class="home-recent__body">
                  <ol class="home-recent__list">
                    {recentPosts.map((post) => {
                      const postDate = getPostDateParts(post.date, helper.date_xml, helper.date);
                      const encrypted = Boolean(post.encrypt || post.password || post.password === 0);
                      return (
                        <li key={post.path} class="home-recent__item" style={`--i:${order++}`}>
                          {/* 一行文本：标题在前、日期在后；加密条目在标题后带一把小锁 */}
                          <a class={encrypted ? "home-list-link home-list-link--encrypted" : "home-list-link"} href={helper.url_for(post.link || post.path)}>
                            {post.title}
                            {encrypted && (
                              <span class="home-recent__lock" role="img" aria-label={encryptedLabel}>
                                <Icon name="lock" size={12} />
                              </span>
                            )}{" "}
                            <time class="home-recent__date" dateTime={postDate.xml}>
                              {postDate.label}
                            </time>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    );
  }
};
