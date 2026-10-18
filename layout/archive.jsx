const { Component, isValidDate, parseISO, formatMonthDay } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");
const { Icon } = require("../include/util/lucide");
const { filterByLanguage, getDefaultLanguageKey } = require("../include/util/i18n");
const { isEncrypted } = require("../include/hexo/encrypt");

// 「常用」带取几个：单语去重标签约 136 个，平铺是一堵墙，先把真正会被点的那些摆出来
const COMMON_TOPIC_LIMIT = 12;
// 中日韩字符按每分钟 350 字、其余按每分钟 200 词估算
const CJK_RE = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/g;
// 归档页的页名与规模行都用英文：页名是这一页的坐标，规模行是一句量级注解，
// 中文页面上它们就是那两处拉丁刻度，正文仍是中文
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

// 中文正文按字计，按 200 计会把中文条目的时长普遍估高约一倍
function estimateReadMinutes(content) {
  if (typeof content !== "string" || !content) return 0;
  const stripped = content.replace(/<\/?[a-z][^>]*>/gi, "").trim();
  if (!stripped) return 0;
  const cjkCount = stripped.match(CJK_RE)?.length || 0;
  const wordCount = stripped.replace(CJK_RE, " ").match(/[^\s]+/g)?.length || 0;
  const minutes = cjkCount / 350 + wordCount / 200;
  return minutes > 0 ? Math.max(1, Math.ceil(minutes)) : 0;
}

// month 为 1-12 的自然月（moment#month() 是 0 基，调用侧需 +1）。
// 季节名用小写：手写笔画按字面书写，小写更像随手写下的注记
function getSeason(month) {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

// 冬季按气象季跨年：12 月与次年 1-2 月同属一段，startYear 记 12 月所在年；
// 其余季节整段落在自然年内（startYear === endYear）
function getSeasonSpan(date) {
  const year = date.year();
  const month = date.month() + 1;
  const season = getSeason(month);
  if (season !== "Winter") return { season, startYear: year, endYear: year };
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

// 栏数图标：一个竖块是单栏、两个是双栏。用线条画而不是引一套 icon——
// 它要和旁边那行 caption 的字重、粗细待在同一个尺度里
function ColumnGlyph({ columns }) {
  return (
    <svg class="archive-columns__glyph" viewBox="0 0 11 13" width="11" height="13" aria-hidden="true" focusable="false">
      {columns === 1 ? (
        <rect x="1" y="1" width="9" height="11" rx="1.5" />
      ) : (
        <>
          <rect x="1" y="1" width="3.6" height="11" rx="1.5" />
          <rect x="6.4" y="1" width="3.6" height="11" rx="1.5" />
        </>
      )}
    </svg>
  );
}

// 页名的字号必须在首帧之前算好：宽一点的字体（衬线、Helvetica Neue）下，先按 CSS 兜底渲染
// 再纠正，会看见末尾的字母溢出去一下。这段内联脚本是它唯一的执行时机，量好之后
// source/js/archive.js 只负责在栏宽与字体变化时重算（window.__gnixFitArchiveTitle）
const TITLE_FIT_SCRIPT = `(function() {
  function fit() {
    var page = document.querySelector(".archive-page");
    var word = page && page.querySelector(".archive-watermark__word");
    var box = word && word.parentElement;
    if (!word || !box) return;
    var style = getComputedStyle(box);
    var available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (available <= 0) return;
    word.style.fontSize = "100px";
    var range = document.createRange();
    range.selectNodeContents(word);
    // 末尾那个负字距把字面推到前进宽度之外：量到的宽度要减掉它，否则最后一个字母会被裁掉
    var ink = (range.getBoundingClientRect().width - parseFloat(getComputedStyle(word).letterSpacing)) / 100;
    // 页名只占栏宽的三分之一；两栏模式下栏宽接近翻倍，高度再收在视口的 36% 以内
    word.style.fontSize = ink > 0 ? Math.min(available / 3 / ink, window.innerHeight * 0.36) + "px" : "";
  }
  window.__gnixFitArchiveTitle = fit;
  fit();
})();`;

// 像素字：5×7 的方点阵，构建期就摊成 <rect>，前端零成本。
// 字母给季节用，数字给年份的翻表用（缺字形时整枚不出，宁可空着也不出半句话）
const PIXEL_GLYPHS = {
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11111 00010 00100 00010 00001 10001 01110",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110",
  "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  A: "01110 10001 10001 11111 10001 10001 10001",
  E: "11111 10000 10000 11110 10000 10000 11111",
  G: "01110 10001 10000 10111 10001 10001 01111",
  I: "11111 00100 00100 00100 00100 00100 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  P: "11110 10001 10001 11110 10000 10000 10000",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  W: "10001 10001 10001 10101 10101 11011 10001",
};

// 一季的像素字：每个字母 5 格宽、字距 2 格，字高 7 格。
// 翻页动画由 archive.js 的观察器驱动（.is-armed / .is-turning 见 archive.css）
function PixelFolio({ word }) {
  const letters = [...word.toUpperCase()].map((char) => PIXEL_GLYPHS[char]?.split(" "));
  if (!letters.length || letters.some((rows) => !rows)) return null;
  const cells = [];
  letters.forEach((rows, letter) => {
    rows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === "1") cells.push([letter * 7 + x, y]);
      });
    });
  });
  return (
    <svg class="archive-folio" viewBox={`0 0 ${letters.length * 7 - 2} 7`} fill="currentColor" aria-hidden="true" focusable="false">
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

// 一枚像素字符：和季节字共用一套点阵，单字一枚 <svg>，年份翻表拿它当格芯
function PixelGlyph({ char }) {
  const rows = PIXEL_GLYPHS[char]?.split(" ");
  if (!rows) return null;
  const cells = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "1") cells.push([x, y]);
    });
  });
  return (
    <svg viewBox="0 0 5 7" fill="currentColor" aria-hidden="true" focusable="false">
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

// 一季一段：像素字在上，条目在一条等距的清单里。标题贴左缘、日期贴右缘，
// 全页因此有两条笔直的竖轴，167 行也读得下去
function renderSeasonGroup({ posts, title, yearLabel, years, marker, sectionId, formatReadTime, url_for, date_xml, date }) {
  return (
    <section id={sectionId} class={`archive-group ${marker}`} data-years={years} aria-labelledby={`${sectionId}-title`}>
      <h2 id={`${sectionId}-title`} class="archive-group__header">
        {/* 一季一枚像素字：浅色的一页，滚动到时浮现；它本身就是通往本季的链接 */}
        <a class="archive-group__link" href={`#${sectionId}`} aria-label={`${title} ${yearLabel}`}>
          <PixelFolio word={title} />
        </a>
      </h2>
      <ol class="archive-list">
        {posts.map((post) => {
          const postDate = getPostDateParts(post.date, date_xml, date);
          const excerpt = post.excerpt || null;
          const readMinutes = excerpt ? estimateReadMinutes(post._content) : 0;
          return (
            <ArticleMedia
              key={post.path}
              url={url_for(post.link || post.path)}
              title={post.title}
              date={postDate.label}
              dateXml={postDate.xml}
              excerpt={excerpt}
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

function renderTopicPicker({ tags, allPosts, topicListLabel, closeLabel, commonLabel, restLabel }) {
  // 第一带按篇数降序（26 篇的 Essay 和 1 篇的 Ruff 不该并排），第二带按字母序，
  // 两带共用一条连续下标：逐条上浮仍是一整条自上而下的瀑布
  const byCount = [...tags].sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)));
  const common = byCount.slice(0, COMMON_TOPIC_LIMIT);
  const commonNames = new Set(common.map((tag) => tag.name));
  const rest = tags.filter((tag) => !commonNames.has(tag.name));
  const base = allPosts ? 1 : 0;

  return (
    <div id="archive-topic-picker" class="archive-topic-picker" popover="auto">
      <div class="archive-topic-picker__body">
        {/* 全屏接管：顶端一枚标题与关闭钮——幕帘盖住触发钮，关闭得有自己的落点 */}
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
          {rest.length ? <h3 class="archive-topic-list__band archive-micro">{restLabel}</h3> : null}
          {rest.map((tag, index) => renderTopicItem(tag, base + common.length + index))}
        </nav>
      </div>
    </div>
  );
}

// 秘密花园：不是浮层，而是页面的第二种视图——页名连点三次后，公开清单换成这一块。
// 清单在构建期整体加密（见 include/hexo/encrypt.js 的 encrypt_payload），未解锁前页面源码里
// 只有密文，标题与链接都不外泄；解锁与列表渲染见 source/js/archive.js
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

    // 加密文章不进公开列表：它们只在「秘密花园」里出现（首页近期列表、搜索索引、
    // 站点地图、feed 与 .md 直出同样排除，见 include/hexo/encrypt.js 的 isEncrypted）
    const visiblePosts = collectPosts(page.posts).filter((post) => !isEncrypted(post));
    const totalVisiblePosts = visiblePosts.length;

    const sitePosts = collectPosts(helper.is_i18n_enabled() ? filterByLanguage(site?.posts, langKey, config || {}) : site?.posts);
    const publicPostCount = sitePosts.filter((post) => !isEncrypted(post)).length;
    // 花园清单按日期倒序，与归档列表同一顺序；条目带年份——花园没有季节分组给出年份语境。
    // 只有自己看：不随站点语言分家，永远列原始语言那一份（中英对照的译本不重复出现）
    const gardenPosts = collectPosts(helper.is_i18n_enabled() ? filterByLanguage(site?.posts, getDefaultLanguageKey(config), config || {}) : site?.posts)
      .filter((post) => isEncrypted(post))
      .sort((a, b) => b.date.valueOf() - a.date.valueOf());

    const groups = groupPostsBySeason(visiblePosts);
    const topicTags = getTopicTags(site?.tags, page, config, helper);

    // 年份切片：先按年归堆（倒序），切片切换时规模行跟着走
    const yearCounts = new Map();
    for (const post of visiblePosts) yearCounts.set(post.date.year(), (yearCounts.get(post.date.year()) || 0) + 1);
    const archiveYears = [...yearCounts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
    // 步进器的初始位置：构建机器上的当年（或最近的一年）——脚本加载后按访客的年份重算
    const yearList = archiveYears.map(({ year }) => year);
    const buildYear = String(new Date().getFullYear());
    const defaultYearIndex = Math.max(0, yearList.indexOf(yearList.includes(buildYear) ? buildYear : yearList[0]));

    // 页名永远是 Archive——水印是这一处的记号，不随页面变；标签页是谁由 caption 那一行说
    const writingsWord = totalVisiblePosts === 1 ? "writing" : "writings";
    const topicsWord = topicTags.length === 1 ? "topic" : "topics";
    const gardenCountLabel = `${gardenPosts.length} ${helper._p("archive.writing", gardenPosts.length)}`;
    const formatReadTime = (minutes) => helper.__("article.reading_time", minutes);

    // 花园清单整体加密后随页面下发；没配 encrypt.password 时 helper 返回 null，入口随之消失。
    // 页名水印（Archive）在归档页与标签页都立着，花园两边都能进
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
        // 年份切片按它归属：冬季跨年（’25/26）在两年里都算
        years: group.startYear === group.endYear ? String(group.startYear) : `${group.startYear} ${group.endYear}`,
        marker: group.season.toLowerCase(),
        sectionId: getSectionId(group),
        formatReadTime,
        url_for,
        date_xml,
        date,
      }),
    );

    return (
      <main class="archive-page" data-view="archive" data-columns="1">
        <div class="archive-hero">
          {/* 页名是一块巨型水印，正文从它上面滚过去；h1 就是它本身。
              连点三次是秘密花园的入口（见 source/js/archive.js），所以它不能被选中 */}
          <h1 id="archive-title" class="archive-watermark" data-garden-title="Secret Archive 🫥">
            <span class="archive-watermark__word">{ARCHIVE_TITLE}</span>
          </h1>
          {!isTagPage && archiveYears.length > 1 ? (
            /* 年份：书口上的页码，像素字。点一下滚到上一年（到头绕回最新的一年），
               数字像翻表一样逐位滚动，只有变动的位在动；?year= 由脚本写进地址栏 */
            <button
              type="button"
              class="archive-year"
              data-year-counts={archiveYears.map(({ year, count }) => `${year}:${count}`).join(" ")}
              data-switch-label={helper.__("archive.year_switch")}
              aria-label={`${yearList[defaultYearIndex]} ${helper.__("archive.year_switch")}`}
            >
              {String(yearList[defaultYearIndex])
                .slice(-2)
                .split("")
                .map((digit, index) => (
                  <span key={index} class="archive-year__digit" aria-hidden="true">
                    <span class="archive-year__reel" style={`--digit:${digit}`}>
                      {"0123456789".split("").map((value) => (
                        <PixelGlyph key={value} char={value} />
                      ))}
                    </span>
                  </span>
                ))}
            </button>
          ) : null}
        </div>
        <script dangerouslySetInnerHTML={{ __html: TITLE_FIT_SCRIPT }} />

        {/* caption 是一条控制行：左端报这一页的规模，右端放栏数切换与话题入口 */}
        <header class="archive-masthead">
          <div class="archive-masthead__caption">
            <p class="archive-masthead__stat">
              {isTagPage ? <span class="archive-masthead__subject">{page.tag}</span> : null}
              <span class="archive-masthead__count">
                <span data-archive-count>{totalVisiblePosts}</span>{" "}
                <span data-archive-count-word>{writingsWord}</span>
              </span>
            </p>
            <span class="archive-masthead__leader" aria-hidden="true"></span>
            <div class="archive-masthead__tools">
              <div class="archive-columns">
                <button
                  type="button"
                  class="archive-columns__option"
                  data-archive-columns="1"
                  aria-pressed="true"
                  aria-label={helper.__("archive.one_column")}
                  title={helper.__("archive.one_column")}
                >
                  <ColumnGlyph columns={1} />
                </button>
                <button
                  type="button"
                  class="archive-columns__option"
                  data-archive-columns="2"
                  aria-pressed="false"
                  aria-label={helper.__("archive.two_columns")}
                  title={helper.__("archive.two_columns")}
                >
                  <ColumnGlyph columns={2} />
                </button>
              </div>
              <button
                type="button"
                class="archive-masthead__topics"
                popovertarget="archive-topic-picker"
                aria-expanded="false"
                aria-controls="archive-topic-picker"
                aria-label={`${topicTags.length} ${topicsWord}`}
              >
                <Icon name="tags" size={14} />
                <span class="archive-masthead__count">{topicTags.length}</span>
              </button>
            </div>
          </div>
          {/* 窄屏上选两栏时的提醒：绝对定位，出现时不推动下面的清单 */}
          <p class="archive-masthead__note" role="status" hidden>
            {helper.__("archive.columns_narrow")}
          </p>
        </header>

        {renderTopicPicker({
          tags: topicTags,
          allPosts: {
            name: helper.__("archive.all_posts"),
            count: publicPostCount,
            // 归档已不在站点根路径，「全部文章」指向 archive 生成器的目录（可由 archive_generator.path 调整）
            url: helper.localized_url_for(config.archive_generator?.path || "archive"),
            current: !isTagPage,
          },
          topicListLabel: helper._p("common.tag", Infinity),
          closeLabel: helper.__("article.close"),
          commonLabel: helper.__("archive.common_topics"),
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

        <div class="archive-groups">{articleList}</div>
      </main>
    );
  }
};
