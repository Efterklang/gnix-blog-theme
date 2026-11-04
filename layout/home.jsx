const { Component } = require("../include/util/common");
const { filterByLanguage, isExternalUrl } = require("../include/util/i18n");
const { isEncrypted } = require("../include/hexo/encrypt");

const SITE_SINCE = "2022";

function collectPosts(collection) {
  const posts = [];
  if (collection?.each) {
    collection.each((post) => posts.push(post));
  } else if (Array.isArray(collection)) {
    posts.push(...collection);
  }
  return posts;
}

function getLanguagePosts(sitePosts, { page, config, helper }) {
  const langKey = helper.language_key(page);
  const collection = helper.is_i18n_enabled() ? filterByLanguage(sitePosts, langKey, config || {}) : sitePosts;
  return collectPosts(collection);
}

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
    const langKey = helper.language_key(page);

    const posts = getLanguagePosts(site?.posts, { page, config, helper }).filter((post) => !isEncrypted(post));
    const tagNames = new Set();
    const yearCounts = new Map();
    for (const post of posts) {
      post.tags?.each?.((tag) => tagNames.add(tag.name));
      const year = post.date.year();
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }
    const years = [...yearCounts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
    const archiveUrl = helper.localized_url_for(config.archive_generator?.path || "archive");
    const yearUrl = (year) => `${archiveUrl}${archiveUrl.includes("?") ? "&" : "?"}year=${year}`;

    const specItems = [
      ["Writings", posts.length],
      ["Topics", tagNames.size],
      ["Since", SITE_SINCE],
    ];
    const email = "gjx@linux.do";

    const links = [
      ["Wiki", "https://wiki.vluv.space"],
      ["Gallery", "https://gallery.vluv.space"],
      ["Changelog", "change"],
      ["Colophon", "colophon"],
      ["Travellings", "https://www.travellings.cn/go"],
    ];

    let order = 0;
    return (
      <main class="home-page">
        <section class="home-hero">

          {/* 1. 顶部区域：左上巨字 + 右上数据表 */}
          <div class="home-hero__top">
            <div class="home-hero__brand" style={`--i:${order++}`}>
              <h1 class="home-hero__title">
                GnixAij<br/>Oag
              </h1>
              <span class="home-hero__ipa">/nɪkˈsaɪdʒ oʊɡ/</span>

              <div class="home-hero__lead">
                <p class="home-hero__intro">I was born in Qingdao, Shandong, in 2004.</p>
                <p class="home-hero__intro home-hero__intro--muted">This space archives my essays and technical notes.</p>
              </div>
            </div>

            <dl class="home-hero__spec" style={`--i:${order++}`}>
              {specItems.map(([label, value]) => (
                <div key={label} class="home-hero__spec-row">
                  <dt class="home-hero__spec-label">{label}</dt>
                  <dd class="home-hero__spec-value">{value}</dd>
                </div>
              ))}
              <div class="home-hero__spec-row">
                <dt class="home-hero__spec-label">Email</dt>
                <dd class="home-hero__spec-value">
                  <a class="home-intro__link" href={`mailto:${email}`}>
                    {email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* 2. 中腰带区域：精致五联导航带（通栏分割线之间） */}
          <nav class="home-hero__mid" style={`--i:${order++}`} aria-label="Destinations">
            <div class="home-hero__mid-header">
              <span class="home-hero__mid-label">Links</span>
              <span class="home-hero__mid-count">[05]</span>
            </div>
            <ul class="home-hero__links">
              {links.map(([label, href], index) => (
                <li key={label} class="home-hero__link-item">
                  <a class="home-hero__link" {...linkAttrs(href, helper, langKey)}>
                    <span class="home-hero__link-index">0{index + 1}</span>
                    <span class="home-hero__link-text">{label}</span>
                    {isExternalUrl(href) && <span class="home-hero__external">↗</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div class="home-hero__bottom">
            {years.length ? (
              <nav class="home-hero__caption" style={`--i:${order++}`} aria-label="Archive">
                <a class="home-archive__label" href={archiveUrl}>
                  Writing Collections
                </a>
                <ul class="home-archive__years">
                  {years.map(({ year, count }, index) => (
                    <li key={year}>
                      <a
                        class="home-archive__year"
                        href={yearUrl(year)}
                        data-home-year
                        data-current={index === 0 ? "true" : undefined}
                        aria-label={`${year}, ${count} ${count === 1 ? "writing" : "writings"}`}
                      >
                        <span class="home-archive__year-value">{String(year).slice(-2)}</span>
                        <span class="home-archive__year-count" aria-hidden="true">
                          {count}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </section>

        <script
          dangerouslySetInnerHTML={{
            __html: `document.querySelector(".home-hero__caption")?.addEventListener("click",function(e){var a=e.target.closest("[data-home-year]");if(!a)return;document.querySelectorAll(".home-archive__year-value").forEach(function(v){v.style.viewTransitionName=""});a.querySelector(".home-archive__year-value").style.viewTransitionName="archive-year"});`,
          }}
        ></script>
      </main>
    );
  }
};
