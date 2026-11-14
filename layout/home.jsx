const { Component } = require("../include/util/common");
const { filterByLanguage, isExternalUrl } = require("../include/util/i18n");
const { isEncrypted } = require("../include/hexo/encrypt");

const SITE_SINCE = "2022";

// 年份刻度尺：悬停／聚焦到哪一格，读数与指针就跟到哪一年（不必点击）；离开刻度区回到选中的年份。
// 点击把那一年记为选中（sessionStorage，后退回来仍在）再跳转；触屏上分两下：先选中，再点一次进入。
// 脚本紧跟标记内联执行，首帧前就位。
const ARCHIVE_SCALE_SCRIPT = `(function () {
  var root = document.querySelector(".home-archive");
  var scale = root && root.querySelector(".home-archive__scale");
  if (!scale) return;
  var ticks = [].slice.call(scale.querySelectorAll("[data-home-year]"));
  var figure = root.querySelector("[data-home-figure]");
  var count = root.querySelector("[data-home-count]");
  var KEY = "gnix:home-year";
  var active = ticks[0];

  function mark(attr, tick) {
    ticks.forEach(function (t) {
      if (t === tick) t.setAttribute(attr, "true");
      else t.removeAttribute(attr);
    });
  }
  function tune(tick) {
    var year = tick.dataset.homeYear;
    var n = tick.dataset.count;
    mark("data-tuned", tick);
    scale.style.setProperty("--needle", ticks.indexOf(tick));
    figure.textContent = year.slice(-2);
    count.textContent = n + (n === "1" ? " writing" : " writings");
  }
  function select(tick) {
    active = tick;
    mark("aria-current", tick);
    tune(tick);
    try { sessionStorage.setItem(KEY, tick.dataset.homeYear); } catch (e) {}
  }
  function tickOf(event) {
    return event.target.closest("[data-home-year]");
  }

  try {
    var saved = sessionStorage.getItem(KEY);
    var restored = ticks.filter(function (t) { return t.dataset.homeYear === saved; })[0];
    if (restored) select(restored);
  } catch (e) {}

  scale.addEventListener("pointerover", function (event) {
    var tick = tickOf(event);
    if (tick) tune(tick);
  });
  scale.addEventListener("pointerleave", function () { tune(active); });
  scale.addEventListener("focusin", function (event) {
    var tick = tickOf(event);
    if (tick) tune(tick);
  });
  scale.addEventListener("focusout", function (event) {
    if (!scale.contains(event.relatedTarget)) tune(active);
  });
  // 触屏没有悬停：第一下只选中（读数换到那一年），再点一下已选中的那一格才跳转。
  // 按这一次按下的指针类型判断，触屏笔记本上用鼠标仍是一次直达；键盘回车没有 pointerdown（detail 为 0），也直达
  var touch = false;
  scale.addEventListener("pointerdown", function (event) { touch = event.pointerType === "touch"; });
  scale.addEventListener("click", function (event) {
    var tick = tickOf(event);
    if (!tick) return;
    if (touch && event.detail !== 0 && tick !== active) event.preventDefault();
    select(tick);
  });
})();`;

const writingsLabel = (count) => `${count} ${count === 1 ? "writing" : "writings"}`;

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
    const hasMenu = Object.keys(config.navbar?.menu || {}).length > 0;
    const brand = (
      <span>
        GnixAij
        <br />
        Oag
      </span>
    );
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
                {hasMenu ? (
                  <button
                    type="button"
                    class="home-hero__logo"
                    data-navbar-menu-trigger
                    popovertarget="navbar-menu"
                    aria-haspopup="dialog"
                    aria-controls="navbar-menu"
                    aria-expanded="false"
                    aria-label={`GnixAij Oag · ${helper.__("navbar.menu")}`}
                  >
                    {brand}
                  </button>
                ) : (
                  <a class="home-hero__logo" href={archiveUrl}>
                    {brand}
                  </a>
                )}
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
              <nav class="home-hero__caption home-archive" style={`--i:${order++}`} aria-label="Archive">
                <a class="home-archive__label" href={archiveUrl}>
                  Writing Collections
                </a>

                {/* 读数：只是刻度尺的回显，信息已在每个刻度链接的 aria-label 里 */}
                <div class="home-archive__readout" aria-hidden="true">
                  <span class="home-archive__figure" data-home-figure>
                    {String(years[0].year).slice(-2)}
                  </span>
                </div>

                {/* 刻度尺：--ticks 等分栏数，--needle 指针所在的格（由脚本随悬停更新） */}
                <div class="home-archive__scale" style={`--ticks:${years.length};--needle:0`}>
                  <span class="home-archive__needle" aria-hidden="true"></span>
                  <ul class="home-archive__years">
                    {years.map(({ year, count }, index) => (
                      <li key={year}>
                        <a
                          class="home-archive__year"
                          href={yearUrl(year)}
                          data-home-year={year}
                          data-count={count}
                          data-tuned={index === 0 ? "true" : undefined}
                          aria-current={index === 0 ? "true" : undefined}
                          aria-label={`${year}, ${writingsLabel(count)}`}
                        >
                          <span class="home-archive__tick"></span>
                          <span class="home-archive__year-value">{String(year).slice(-2)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <p class="home-archive__meta-count" data-home-count aria-hidden="true">
                  {writingsLabel(years[0].count)}
                </p>
              </nav>
            ) : null}
          </div>
        </section>

        {years.length ? <script dangerouslySetInnerHTML={{ __html: ARCHIVE_SCALE_SCRIPT }} /> : null}
      </main>
    );
  }
};
