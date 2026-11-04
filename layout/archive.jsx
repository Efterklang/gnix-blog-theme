const { Component, isValidDate, parseISO, formatMonthDay } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");
const { Icon } = require("../include/util/lucide");
const { filterByLanguage, getDefaultLanguageKey } = require("../include/util/i18n");
const { isEncrypted } = require("../include/hexo/encrypt");
const { withImageParams } = require("../include/util/image");

const COMMON_TOPIC_LIMIT = 12;
// 城市标签：中文名与拼音都认，大小写不敏感；新城市直接往这里加
const CITY_NAMES = ["上海", "苏州", "青岛", "成都", "安顺", "shanghai", "suzhou", "qingdao", "chengdu", "anshun"];
const isCityTag = (name) => CITY_NAMES.includes(String(name).trim().toLowerCase());
const CJK_RE = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/g;
const ARCHIVE_TITLE = "Archive";

function collectPosts(collection) {
  const posts = [];
  if (collection?.each) {
    collection.each((post) => posts.push(post));
  } else if (Array.isArray(collection)) {
    posts.push(...collection);
  }
  return posts;
}

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

function estimateReadMinutes(content) {
  if (typeof content !== "string" || !content) return 0;
  const stripped = content.replace(/<\/?[a-z][^>]*>/gi, "").trim();
  if (!stripped) return 0;
  const cjkCount = stripped.match(CJK_RE)?.length || 0;
  const wordCount = stripped.replace(CJK_RE, " ").match(/[^\s]+/g)?.length || 0;
  const minutes = cjkCount / 350 + wordCount / 200;
  return minutes > 0 ? Math.max(1, Math.ceil(minutes)) : 0;
}

function getSeason(month) {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function getSeasonSpan(date) {
  const year = date.year();
  const month = date.month() + 1;
  const season = getSeason(month);
  if (season !== "winter") return { season, startYear: year, endYear: year };
  const startYear = month === 12 ? year : year - 1;
  return { season, startYear, endYear: startYear + 1 };
}

function getSeasonName({ season }) {
  return season;
}

function getSeasonYearLabel({ startYear, endYear }) {
  const yy = (value) => String(value % 100).padStart(2, "0");
  const range = startYear === endYear ? yy(startYear) : `${yy(startYear)}/${yy(endYear)}`;
  return `’${range}`;
}

function getSectionId({ season, startYear }) {
  return `archive-${season.toLowerCase()}-${startYear}`;
}

function groupPostsBySeason(posts) {
  return posts.reduce((groups, post) => {
    const span = getSeasonSpan(post.date);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.season === span.season && lastGroup.startYear === span.startYear) {
      lastGroup.posts.push(post);
    } else {
      groups.push({ ...span, posts: [post] });
    }

    return groups;
  }, []);
}

function getTopicTags(siteTags, page, config, helper) {
  const langKey = helper.language_key(page);
  const currentTag = page.tag;

  return collectTags(siteTags)
    .map((tag) => {
      if (!tag?.length) return null;

      const posts = helper.is_i18n_enabled() ? filterByLanguage(tag.posts, langKey, config || {}) : tag.posts;
      const count = posts?.length || 0;
      if (!count) return null;

      return {
        name: tag.name,
        count,
        url: helper.localized_tag_url(tag, langKey),
        current: currentTag === tag.name,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function getPostDateParts(postDate, dateXml, date) {
  const xml = dateXml(postDate);
  const parsed = parseISO(xml);

  return {
    label: isValidDate(parsed) ? formatMonthDay(parsed) : date(postDate),
    xml,
  };
}

function getPostTags(post) {
  if (typeof post?.tags?.toArray === "function") return post.tags.toArray().map((tag) => tag.name).filter(Boolean);
  return [];
}

const TITLE_FIT_SCRIPT = `(function() {
  function fit() {
    var page = document.querySelector(".archive-page");
    var title = page && page.querySelector(".archive-watermark");
    var box = page && (page.querySelector(".archive-hero__title") || page.querySelector(".archive-hero"));
    if (!title || !box) return;
    var style = getComputedStyle(box);
    var narrow = window.innerWidth < 1024;
    // 窄屏上刊头注记换到标题下方横排（见 archive.css），不再占标题那一行的宽度
    var notes = narrow ? null : page.querySelector(".archive-masthead");
    var available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - (notes ? notes.getBoundingClientRect().width + parseFloat(getComputedStyle(notes).marginLeft) : 0);
    if (available <= 0) return;
    title.style.fontSize = "100px";
    var range = document.createRange();
    range.selectNodeContents(title);
    var ink = range.getBoundingClientRect().width / 100;
    var gutter = parseFloat(getComputedStyle(page).getPropertyValue("--grid-gutter")) || 24;
    var share = narrow ? 1 : (5 * (available - 7 * gutter) / 8 + 4 * gutter) / available;
    title.style.fontSize = ink > 0 ? Math.min(available * share / ink, window.innerHeight * 0.36) + "px" : "";
    var masthead = page.querySelector(".archive-masthead");
    if (masthead && narrow) {
      masthead.style.fontSize = "";
      masthead.style.marginTop = "";
    }
    // 桌面：刊头注记锁在大字右侧，高度严格等于大写 A 的字高（cap height）——
    // 用 canvas 量出当前字号下「A」在基线以上的高度；最长的一柱按比例缩放到正好这么长；
    // 再借一枚贴在基线上的零高探针，把注记的顶边对齐到大写字母的顶线
    if (notes) {
      var word = title.querySelector(".archive-watermark__word");
      var probe = word && word.querySelector(".archive-watermark__baseline");
      if (word && !probe) {
        probe = document.createElement("span");
        probe.className = "archive-watermark__baseline";
        probe.setAttribute("aria-hidden", "true");
        word.appendChild(probe);
      }
      var ws = getComputedStyle(word || title);
      var canvas = fit.canvas || (fit.canvas = document.createElement("canvas"));
      var ctx = canvas.getContext("2d");
      ctx.font = ws.fontStyle + " " + ws.fontWeight + " " + ws.fontSize + " " + ws.fontFamily;
      var cap = ctx.measureText("A").actualBoundingBoxAscent || parseFloat(ws.fontSize) * 0.72;
      var REF = 11;
      notes.style.fontSize = REF + "px";
      notes.style.marginTop = "0px";
      var cols = notes.children;
      var tallest = 0;
      for (var i = 0; i < cols.length; i++) tallest = Math.max(tallest, cols[i].getBoundingClientRect().height);
      if (tallest > 0) notes.style.fontSize = Math.max(6, (REF * cap) / tallest) + "px";
      if (probe) {
        var holder = notes.parentElement;
        var holderTop = holder.getBoundingClientRect().top + parseFloat(getComputedStyle(holder).paddingTop);
        notes.style.marginTop = probe.getBoundingClientRect().top - cap - holderTop + "px";
      }
    }
  }
  window.__gnixFitArchiveTitle = fit;
  fit();
  fit();
})();`;

// 季节组：迁移为带微小序列计数的标题风格（如 Autumn / 02）
function renderSeasonGroup({ posts, title, yearLabel, years, marker, sectionId, formatReadTime, coverSrc, url_for, date_xml, date }) {
  const countStr = String(posts.length).padStart(2, "0");
  return (
    <section id={sectionId} class={`archive-group ${marker}`} data-years={years} aria-labelledby={`${sectionId}-title`}>
      <h2 id={`${sectionId}-title`} class="archive-group__header">
        <a class="archive-group__link archive-folio" href={`#${sectionId}`} aria-label={`${title} ${yearLabel}`}>
          <span class="archive-folio__title">{title}</span>
          <span class="archive-folio__sep">/</span>
          <span class="archive-folio__count">{countStr}</span>
        </a>
      </h2>
      <ol class="archive-list">
        {posts.map((post) => {
          const postDate = getPostDateParts(post.date, date_xml, date);
          const excerpt = post.excerpt ? post.excerpt.trim() : null;
          const readMinutes = excerpt ? estimateReadMinutes(post._content) : 0;
          return (
            <ArticleMedia
              key={post.path}
              url={url_for(post.link || post.path)}
              title={post.title}
              date={postDate.label}
              dateXml={postDate.xml}
              excerpt={excerpt}
              cover={coverSrc(post.cover)}
              tags={getPostTags(post)}
              readTime={readMinutes ? formatReadTime(readMinutes) : null}
            />
          );
        })}
      </ol>
    </section>
  );
}

function renderTopicItem(tag, index) {
  return (
    <a key={tag.url} class="archive-topic-list__item" style={`--i:${index}`} href={tag.url} aria-current={tag.current ? "page" : null}>
      <span class="archive-topic-list__name">{tag.name}</span>
      <span class="archive-topic-list__count">{tag.count}</span>
    </a>
  );
}

function renderTopicPicker({ tags: allTags, allPosts, topicListLabel, closeLabel, commonLabel, cityLabel, restLabel }) {
  const cities = allTags.filter((tag) => isCityTag(tag.name)).sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)));
  const tags = allTags.filter((tag) => !isCityTag(tag.name));
  const byCount = [...tags].sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)));
  const common = byCount.slice(0, COMMON_TOPIC_LIMIT);
  const commonNames = new Set(common.map((tag) => tag.name));
  const rest = tags.filter((tag) => !commonNames.has(tag.name));
  const base = allPosts ? 1 : 0;

  return (
    <div id="archive-topic-picker" class="archive-topic-picker" popover="auto">
      <div class="archive-topic-picker__body">
        <header class="archive-topic-picker__head">
          <h2 class="archive-topic-picker__title archive-micro">{topicListLabel}</h2>
          <button
            type="button"
            class="archive-topic-picker__close"
            popovertarget="archive-topic-picker"
            popovertargetaction="hide"
            aria-label={closeLabel}
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <nav class="archive-topic-list" aria-label={topicListLabel}>
          <h3 class="archive-topic-list__band archive-micro">{commonLabel}</h3>
          {allPosts ? (
            <a class="archive-topic-list__item archive-topic-list__item--all" style="--i:0" href={allPosts.url} aria-current={allPosts.current ? "page" : null}>
              <span class="archive-topic-list__name">{allPosts.name}</span>
              <span class="archive-topic-list__count">{allPosts.count}</span>
            </a>
          ) : null}
          {common.map((tag, index) => renderTopicItem(tag, base + index))}
          {cities.length ? <h3 class="archive-topic-list__band archive-micro">{cityLabel}</h3> : null}
          {cities.map((tag, index) => renderTopicItem(tag, base + common.length + index))}
          {rest.length ? <h3 class="archive-topic-list__band archive-micro">{restLabel}</h3> : null}
          {rest.map((tag, index) => renderTopicItem(tag, base + common.length + cities.length + index))}
        </nav>
      </div>
    </div>
  );
}

function renderGarden({ title, count, placeholder, unlockLabel, lockLabel, errorLabel, blob }) {
  return (
    <section id="archive-garden" class="archive-garden" data-state="locked" aria-label={title}>
      <header class="archive-garden__header">
        <span class="archive-garden__count">{count}</span>
      </header>
      <form class="gate archive-garden__gate" autocomplete="off">
        <div class="gate__field">
          <span class="gate__mark" aria-hidden="true">
            ✳
          </span>
          <input
            class="gate__input"
            type="password"
            name="password"
            placeholder={placeholder}
            aria-label={placeholder}
            enterkeyhint="done"
            autocomplete="off"
          />
          <button class="gate__submit" type="submit">
            {unlockLabel}
          </button>
        </div>
        <p class="gate__error" role="alert">
          {errorLabel}
        </p>
      </form>
      <div class="archive-garden__list"></div>
      <button class="archive-garden__lock archive-micro" type="button">
        {lockLabel}
      </button>
      <div class="encrypted-data" hidden>
        {blob}
      </div>
    </section>
  );
}

module.exports = class extends Component {
  render() {
    const { config, page, site, helper } = this.props;
    const { url_for, date_xml, date } = helper;
    const langKey = helper.language_key(page);
    const isTagPage = Boolean(page.tag);

    const visiblePosts = collectPosts(page.posts).filter((post) => !isEncrypted(post));
    const totalVisiblePosts = visiblePosts.length;

    const sitePosts = collectPosts(helper.is_i18n_enabled() ? filterByLanguage(site?.posts, langKey, config || {}) : site?.posts);
    const publicPostCount = sitePosts.filter((post) => !isEncrypted(post)).length;

    const gardenPosts = collectPosts(helper.is_i18n_enabled() ? filterByLanguage(site?.posts, getDefaultLanguageKey(config), config || {}) : site?.posts)
      .filter((post) => isEncrypted(post))
      .sort((a, b) => b.date.valueOf() - a.date.valueOf());

    const groups = groupPostsBySeason(visiblePosts);
    const topicTags = getTopicTags(site?.tags, page, config, helper);

    const yearCounts = new Map();
    for (const post of visiblePosts) yearCounts.set(post.date.year(), (yearCounts.get(post.date.year()) || 0) + 1);
    const archiveYears = [...yearCounts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
    const yearList = archiveYears.map(({ year }) => year);
    const buildYear = String(new Date().getFullYear());
    const defaultYearIndex = Math.max(0, yearList.indexOf(yearList.includes(buildYear) ? buildYear : yearList[0]));

    const writingsWord = totalVisiblePosts === 1 ? "writing" : "writings";
    const topicsWord = topicTags.length === 1 ? "topic" : "topics";
    const gardenCountLabel = `${gardenPosts.length} ${helper._p("archive.writing", gardenPosts.length)}`;
    const formatReadTime = (minutes) => `${minutes} min`;

    const coverSrc = (cover) => {
      if (!cover) return null;
      const src = url_for(cover);
      return helper.image_resize_supported(src) ? withImageParams(src, { w: 900 }) : src;
    };

    const gardenBlob =
      gardenPosts.length
        ? helper.encrypt_payload(
            JSON.stringify(
              gardenPosts.map((post) => {
                const parts = getPostDateParts(post.date, date_xml, date);
                return { title: post.title, url: url_for(post.link || post.path), date: `${parts.label}, ${post.date.year()}`, dateXml: parts.xml };
              }),
            ),
          )
        : null;

    const articleList = groups.map((group) =>
      renderSeasonGroup({
        posts: group.posts,
        title: getSeasonName(group),
        yearLabel: getSeasonYearLabel(group),
        years: group.startYear === group.endYear ? String(group.startYear) : `${group.startYear} ${group.endYear}`,
        marker: group.season.toLowerCase(),
        sectionId: getSectionId(group),
        formatReadTime,
        coverSrc,
        url_for,
        date_xml,
        date,
      }),
    );

    return (
      <main class="archive-page" data-view="archive">
        <div class="archive-hero">
          <div class="archive-hero__title">
            <h1 id="archive-title" class="archive-watermark" data-garden-title="Secret Archive 🫥">
              <span class="archive-watermark__word">{ARCHIVE_TITLE}</span>
              {!isTagPage && archiveYears.length > 1 ? (
                <button
                  type="button"
                  class="archive-year"
                  data-year-counts={archiveYears.map(({ year, count }) => `${year}:${count}`).join(" ")}
                  data-switch-label={helper.__("archive.year_switch")}
                  aria-label={`${yearList[defaultYearIndex]} ${helper.__("archive.year_switch")}`}
                >
                  <span class="archive-year__value">{`’${String(yearList[defaultYearIndex]).slice(-2)}`}</span>
                </button>
              ) : null}
            </h1>

            {/* 刊头注记：完全独立的两列纵排，间距舒适 */}
            <div class="archive-masthead">
              <p class="archive-masthead__col archive-masthead__stat">
                {isTagPage ? <span class="archive-masthead__subject">{page.tag} </span> : null}
                <span class="archive-masthead__count">
                  <span data-archive-count>{totalVisiblePosts}</span> <span data-archive-count-word>{writingsWord}</span>
                </span>
              </p>
              <button
                type="button"
                class="archive-masthead__col archive-masthead__topics"
                popovertarget="archive-topic-picker"
                aria-expanded="false"
                aria-controls="archive-topic-picker"
                aria-label={`${topicTags.length} ${topicsWord}`}
              >
                <span class="archive-masthead__count">{topicTags.length}</span> {topicsWord}
              </button>
            </div>
          </div>

        </div>
        <script dangerouslySetInnerHTML={{ __html: TITLE_FIT_SCRIPT }} />

        {renderTopicPicker({
          tags: topicTags,
          allPosts: {
            name: helper.__("archive.all_posts"),
            count: publicPostCount,
            url: helper.localized_url_for(config.archive_generator?.path || "archive"),
            current: !isTagPage,
          },
          topicListLabel: helper._p("common.tag", Infinity),
          closeLabel: helper.__("article.close"),
          commonLabel: helper.__("archive.common_topics"),
          cityLabel: helper.__("archive.city_topics"),
          restLabel: helper.__("archive.all_topics"),
        })}

        {gardenBlob
          ? renderGarden({
              title: helper.__("encrypt.garden"),
              count: gardenCountLabel,
              placeholder: helper.__("encrypt.placeholder"),
              unlockLabel: helper.__("encrypt.unlock"),
              lockLabel: helper.__("encrypt.garden_lock"),
              errorLabel: helper.__("encrypt.error"),
              blob: gardenBlob,
            })
          : null}

        {/* 核心展示区：左侧按季度编排，右侧 Inspector 带纵向左边框 */}
        <div class="archive-body">
          <div class="archive-groups">{articleList}</div>
          <div class="archive-inspector-col">
          <aside class="archive-inspector" aria-live="polite" data-empty>
            <p class="archive-inspector__placeholder">Point at a writing to preview it</p>
            <figure class="archive-inspector__cover" hidden>
              <img class="archive-inspector__img" alt="" decoding="async" />
            </figure>
            <p class="archive-inspector__title"></p>
            <div class="archive-inspector__excerpt"></div>
            <dl class="archive-inspector__meta"></dl>
          </aside>
          </div>
        </div>
      </main>
    );
  }
};
