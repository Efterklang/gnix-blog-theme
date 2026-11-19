const { Component } = require("../include/util/common");
const { filterByLanguage } = require("../include/util/i18n");
const { isEncrypted } = require("../include/hexo/encrypt");

// 固定指针的年份刻度尺：触摸与触控板使用原生滚动、惯性和吸附；鼠标补充拖动。
// 大年份是当前刻度的入口，选择保存在 sessionStorage，后退时仍在原来的年份。
const ARCHIVE_SCALE_SCRIPT = `(function () {
  var root = document.querySelector(".home-archive");
  var viewport = root && root.querySelector(".home-archive__viewport");
  if (!viewport) return;
  var ticks = [].slice.call(viewport.querySelectorAll("[data-home-year]"));
  var figure = root.querySelector("[data-home-figure]");
  var readout = root.querySelector("[data-home-readout]");
  var count = root.querySelector("[data-home-count]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var KEY = "gnix:home-year";
  var active = null;
  var drag = null;
  var dragged = false;
  var wheelTimer = 0;

  function position(tick) { return tick.parentElement.offsetLeft; }
  function nearest() {
    return ticks.reduce(function (best, tick) {
      return Math.abs(position(tick) - viewport.scrollLeft) < Math.abs(position(best) - viewport.scrollLeft) ? tick : best;
    }, ticks[0]);
  }
  function select(tick) {
    if (!tick || tick === active) return;
    active = tick;
    ticks.forEach(function (t) {
      if (t === tick) {
        t.setAttribute("data-tuned", "true");
        t.setAttribute("aria-current", "true");
      } else {
        t.removeAttribute("data-tuned");
        t.removeAttribute("aria-current");
      }
    });
    figure.textContent = tick.dataset.homeYear + "↗";
    readout.href = tick.href;
    readout.setAttribute("aria-label", tick.getAttribute("aria-label"));
    if (count) {
      var writings = Number(tick.dataset.homeYearCount || 0);
      count.textContent = writings + (writings === 1 ? " writing" : " writings");
      count.href = tick.href;
      count.setAttribute("aria-label", tick.getAttribute("aria-label"));
    }
    try { sessionStorage.setItem(KEY, tick.dataset.homeYear); } catch (e) {}
  }
  function align(tick, smooth) {
    viewport.scrollTo({ left: position(tick), behavior: smooth && !reduced.matches ? "smooth" : "instant" });
    select(tick);
  }
  function settle() {
    var tick = nearest();
    viewport.classList.remove("is-scrubbing");
    align(tick, true);
  }

  var restored = ticks[0];
  try {
    var saved = sessionStorage.getItem(KEY);
    restored = ticks.filter(function (t) { return t.dataset.homeYear === saved; })[0] || restored;
  } catch (e) {}
  align(restored, false);

  viewport.addEventListener("scroll", function () { select(nearest()); }, { passive: true });
  // 键盘聚焦时直接定位，Tab 与方向键都能抵达最后一年。
  viewport.addEventListener("focusin", function (event) {
    var tick = event.target.closest("[data-home-year]");
    if (tick && tick.matches(":focus-visible")) align(tick, false);
  });
  viewport.addEventListener("keydown", function (event) {
    var index = ticks.indexOf(active);
    if (event.key === "ArrowRight") index = Math.min(index + 1, ticks.length - 1);
    else if (event.key === "ArrowLeft") index = Math.max(index - 1, 0);
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = ticks.length - 1;
    else return;
    event.preventDefault();
    align(ticks[index], false);
    if (event.target.closest("[data-home-year]")) ticks[index].focus({ preventScroll: true });
  });

  viewport.addEventListener("pointerdown", function (event) {
    dragged = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    clearTimeout(wheelTimer);
    viewport.classList.remove("is-scrubbing");
    drag = { id: event.pointerId, x: event.clientX, left: viewport.scrollLeft };
  });
  viewport.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    var dx = event.clientX - drag.x;
    if (!dragged && Math.abs(dx) < 8) return;
    if (!dragged) {
      dragged = true;
      viewport.classList.add("is-scrubbing");
      viewport.setPointerCapture(event.pointerId);
    }
    viewport.scrollLeft = drag.left - dx;
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    if (dragged) settle();
  }
  viewport.addEventListener("pointerup", release);
  viewport.addEventListener("pointercancel", release);
  viewport.addEventListener("lostpointercapture", release);
  viewport.addEventListener("pointerleave", function () { if (!dragged) drag = null; });
  viewport.addEventListener("dragstart", function (event) { event.preventDefault(); });
  viewport.addEventListener("click", function (event) {
    if (dragged && event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    var tick = event.target.closest("[data-home-year]");
    if (tick) select(tick);
  }, true);

  // 鼠标滚轮也能拨尺；横向触控板输入交给浏览器，在边缘继续允许页面纵向滚动。
  viewport.addEventListener("wheel", function (event) {
    if (event.ctrlKey || event.deltaX || !event.deltaY || ticks.length < 2) return;
    var max = viewport.scrollWidth - viewport.clientWidth;
    if ((event.deltaY < 0 && viewport.scrollLeft <= 0) || (event.deltaY > 0 && viewport.scrollLeft >= max - 1)) return;
    event.preventDefault();
    clearTimeout(wheelTimer);
    viewport.classList.add("is-scrubbing");
    var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
    viewport.scrollLeft += event.deltaY * unit;
    wheelTimer = setTimeout(function () { wheelTimer = 0; settle(); }, 120);
  }, { passive: false });
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { if (!drag && !wheelTimer) align(active, false); }).observe(viewport);
  }
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
  const attrs = { href: /^(?:mailto|tel):/i.test(target) ? target : helper.localized_url_for(target, langKey) };
  if (/^(?:https?:)?\/\//i.test(target)) {
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
    const yearCounts = new Map();
    for (const post of posts) {
      const year = post.date.year();
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }
    const years = [...yearCounts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
    const archiveUrl = helper.localized_url_for(config.archive_generator?.path || "archives");
    const hasMenu = Object.keys(config.navbar?.menu || {}).length > 0;
    const brand = (
      <span>
        GnixAij
        <br />
        <span class="home-hero__logo-last-line">
          Oag
          <span class="home-hero__ipa" aria-hidden="true">/nɪkˈsaɪdʒ oʊɡ/</span>
        </span>
      </span>
    );
    const yearUrl = (year) => `${archiveUrl}${archiveUrl.includes("?") ? "&" : "?"}year=${year}`;

    const email = "gjx@linux.do";

    const links = [
      ["Email ↗", `mailto:${email}`],
      ["Wiki ↗", "https://wiki.vluv.space"],
      ["Gallery ↗", "https://gallery.vluv.space"],
      ["Travellings ↗", "https://www.travellings.cn/go"],
      ["Changelog", "change"],
      ["Colophon", "colophon"],
    ];

    let order = 0;
    return (
      <main class="home-page">
        <section class="home-hero">
          {/* 身份与简介各成一栏，联系入口与其它链接一起排列。 */}
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
            </div>

            <div class="home-hero__about" style={`--i:${order++}`}>
              <div class="home-hero__lead">
                <p class="home-hero__intro">I was born in Qingdao, Shandong, in 2004.</p>
                <p class="home-hero__intro home-hero__intro--muted">This space archives my essays and technical notes.</p>
              </div>
            </div>
          </div>

          {/* 2. 中腰带区域：横向滚动导航（通栏分割线之间） */}
          <nav class="home-hero__mid" style={`--i:${order++}`} aria-label="Destinations">
            <div class="home-hero__mid-header">
              <span class="home-hero__mid-label">Elsewhere</span>
              <span class="home-hero__mid-count">[{String(links.length).padStart(2, "0")}]</span>
            </div>
            <ul class="home-hero__links" id="home-links">
              {links.map(([label, href]) => (
                <li key={label} class="home-hero__link-item">
                  <a class={`home-hero__link${href.startsWith("mailto:") ? " home-hero__link--email" : ""}`} title={href.startsWith("mailto:") ? email : null} {...linkAttrs(href, helper, langKey)}>
                    <span class="home-hero__link-text">{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div class="home-hero__bottom">
            <nav class="home-hero__caption home-archive" style={`--i:${order++}`} aria-label="Archive">
              <div class="home-archive__heading">
                <a class="home-archive__count" data-home-count="" href={years.length ? yearUrl(years[0].year) : archiveUrl} aria-label={years.length ? `${years[0].year}, ${writingsLabel(years[0].count)}` : null}>
                  {writingsLabel(years[0]?.count || 0)}
                </a>
                {years.length ? (
                  <a class="home-archive__readout" data-home-readout href={yearUrl(years[0].year)} aria-label={`${years[0].year}, ${writingsLabel(years[0].count)}`}>
                    <span class="home-archive__figure" data-home-figure="">{`${years[0].year}↗`}</span>
                  </a>
                ) : null}
              </div>

              {/* 指针固定在第一格；原生滚动让刻度与年份一起经过它。 */}
              {years.length ? (
                <div class="home-archive__scale">
                  <span class="home-archive__needle" aria-hidden="true"></span>
                  <div class="home-archive__viewport" tabindex="0" role="group" aria-label="Scroll to choose a year. Use the arrow keys, then open the year above.">
                    <ul class="home-archive__years">
                      {years.map(({ year, count }, index) => (
                        <li key={year}>
                          <a
                            class="home-archive__year"
                            href={yearUrl(year)}
                            data-home-year={year}
                            data-home-year-count={count}
                            data-tuned={index === 0 ? "true" : undefined}
                            aria-current={index === 0 ? "true" : undefined}
                            aria-label={`${year}, ${writingsLabel(count)}`}
                          >
                            <span class="home-archive__tick"></span>
                            <span class="home-archive__year-value">{String(year).slice(-2)}</span>
                          </a>
                        </li>
                      ))}
                      {/* 一屏减一格的尾段，保证最早一年也能停在指针下，不伪造更多年份。 */}
                      <li class="home-archive__origin" aria-hidden="true">
                        <span class="home-archive__origin-mark">✳</span>
                        <span>Every archive<br />begins somewhere.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </nav>
          </div>
        </section>

        {years.length ? <script dangerouslySetInnerHTML={{ __html: ARCHIVE_SCALE_SCRIPT }} /> : null}
      </main>
    );
  }
};
