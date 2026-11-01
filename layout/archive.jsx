const { Component, isValidDate, parseISO, formatMonthDay } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");
const { Icon } = require("../include/util/lucide");
const { filterByLanguage, getDefaultLanguageKey } = require("../include/util/i18n");
const { isEncrypted } = require("../include/hexo/encrypt");
const { withImageParams } = require("../include/util/image");

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

// 页名的字号必须在首帧之前算好：宽一点的字体（衬线、Helvetica Neue）下，先按 CSS 兜底渲染
// 再纠正，会看见末尾的字母溢出去一下。这段内联脚本是它唯一的执行时机，量好之后
// source/js/archive.js 只负责在栏宽与字体变化时重算（window.__gnixFitArchiveTitle）
const TITLE_FIT_SCRIPT = `(function() {
  function fit() {
    var page = document.querySelector(".archive-page");
    var title = page && page.querySelector(".archive-watermark");
    var box = page && page.querySelector(".archive-hero");
    if (!title || !box) return;
    var style = getComputedStyle(box);
    var notes = page.querySelector(".archive-masthead");
    var available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - (notes ? notes.getBoundingClientRect().width + parseFloat(getComputedStyle(notes).marginLeft) : 0);
    if (available <= 0) return;
    // 字号设在 h1 上，页名与年份上标按 em 一起缩放；量的是两者合起来的宽度
    title.style.fontSize = "100px";
    var range = document.createRange();
    range.selectNodeContents(title);
    var ink = range.getBoundingClientRect().width / 100;
    // 窄屏占满整栏；桌面只占栏宽的三分之一。高度再收在视口的 36% 以内
    var share = window.innerWidth < 1024 ? 1 : 1 / 3;
    title.style.fontSize = ink > 0 ? Math.min(available * share / ink, window.innerHeight * 0.36) + "px" : "";
  }
  window.__gnixFitArchiveTitle = fit;
  fit();
})();`;

// 一季一段：季节标签在上，条目在一条等距的清单里。标题贴左缘、日期贴右缘，
// 全页因此有两条笔直的竖轴，167 行也读得下去
function renderSeasonGroup({ posts, title, yearLabel, years, marker, sectionId, formatReadTime, coverSrc, url_for, date_xml, date }) {
  return (
    <section id={sectionId} class={`archive-group ${marker}`} data-years={years} aria-labelledby={`${sectionId}-title`}>
      <h2 id={`${sectionId}-title`} class="archive-group__header">
        {/* 一季一行等宽大写的小标签（AUTUMN ’26），滚动到时浮现；它本身就是通往本季的链接 */}
        <a class="archive-group__link archive-folio" href={`#${sectionId}`} aria-label={`${title} ${yearLabel}`}>
          {title}
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
    const formatReadTime = (minutes) => `${minutes} min`;
    // 检视面板里的封面：能缩图的域名取 900px 宽的一档，其余原图
    const coverSrc = (cover) => {
      if (!cover) return null;
      const src = url_for(cover);
      return helper.image_resize_supported(src) ? withImageParams(src, { w: 900 }) : src;
    };

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
        coverSrc,
        url_for,
        date_xml,
        date,
      }),
    );

    return (
      <main class="archive-page" data-view="archive">
        <div class="archive-hero">
          {/* 页名是一块巨型水印，正文从它上面滚过去；h1 就是它本身。
              连点三次是秘密花园的入口（见 source/js/archive.js），所以它不能被选中 */}
          <h1 id="archive-title" class="archive-watermark" data-garden-title="Secret Archive 🫥">
            <span class="archive-watermark__word">{ARCHIVE_TITLE}</span>
            {!isTagPage && archiveYears.length > 1 ? (
              /* 年份：紧跟在页名后的一枚小字上标（随页名一起缩放）。点一下滚到上一年（到头绕回最新的一年）；
                 ?year= 由脚本写进地址栏。它在 h1 里，archive.js 的连点入口要把它排除 */
              <button
                type="button"
                class="archive-year"
                data-year-counts={archiveYears.map(({ year, count }) => `${year}:${count}`).join(" ")}
                data-switch-label={helper.__("archive.year_switch")}
                aria-label={`${yearList[defaultYearIndex]} ${helper.__("archive.year_switch")}`}
              >
                <span class="archive-year__value">{String(yearList[defaultYearIndex]).slice(-2)}</span>
              </button>
            ) : null}
          </h1>
          {/* 刊头的注记：页名（与年份）右侧两行竖排的小字，像书脊——自上而下读，字母随行转向。
              第一行这一页的规模（标签页先报标签名），第二行话题入口 */}
          <div class="archive-masthead">
            <p class="archive-masthead__stat">
              {isTagPage ? <span class="archive-masthead__subject">{page.tag}</span> : null}
              <span class="archive-masthead__count">
                <span data-archive-count>{totalVisiblePosts}</span> <span data-archive-count-word>{writingsWord}</span>
              </span>
            </p>
            <button
              type="button"
              class="archive-masthead__topics"
              popovertarget="archive-topic-picker"
              aria-expanded="false"
              aria-controls="archive-topic-picker"
              aria-label={`${topicTags.length} ${topicsWord}`}
            >
              <span class="archive-masthead__count">{topicTags.length}</span> {topicsWord}
            </button>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: TITLE_FIT_SCRIPT }} />

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

        {/* 清单在右、检视面板在左：悬停到哪一条，面板就换成那一篇的封面、摘要与标签（见 archive.js）。
            窄屏只有清单 */}
        <div class="archive-body">
          <aside class="archive-inspector" aria-live="polite" hidden>
            <figure class="archive-inspector__cover" hidden>
              <img class="archive-inspector__img" alt="" decoding="async" />
            </figure>
            <p class="archive-inspector__title"></p>
            <div class="archive-inspector__excerpt"></div>
            <dl class="archive-inspector__meta"></dl>
          </aside>
          <div class="archive-groups">{articleList}</div>
        </div>
      </main>
    );
  }
};
