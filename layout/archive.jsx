const { Component, isValidDate, parseISO, formatMonthDay } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");
const { StrokeLabel } = require("../include/util/hershey");
const { filterByLanguage } = require("../include/util/i18n");
const { Icon } = require("../include/util/lucide");
const { isEncrypted } = require("../include/hexo/encrypt");

// 「常用」带取几个：单语去重标签约 136 个，平铺是一堵墙，先把真正会被点的那些摆出来
const COMMON_TOPIC_LIMIT = 12;
// 中日韩字符按每分钟 350 字、其余按每分钟 200 词估算
const CJK_RE = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/g;
// 归档页的页名。手写笔画标签只认拉丁字母与数字，页名与规模都用英文，
// 中文页面上这一行因此是「Archive / 162 writings」——拉丁刻度，中文内容
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

// month 为 1-12 的自然月（moment#month() 是 0 基，调用侧需 +1）
function getSeason(month) {
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Autumn";
  return "Winter";
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

// 规模与话题数用与季节标签同一支手写笔画（构建期转 SVG）；转换失败时调用侧回退为 mono 文字
function getCountStroke(count, noun) {
  return StrokeLabel({ text: `${count} ${noun}`, className: "archive-count__strokes" });
}

// 一季一段：标签行在上，条目在一条等距的清单里。标题贴左缘、日期贴右缘，
// 全页因此有两条笔直的竖轴，167 行也读得下去
function renderSeasonGroup({ posts, title, yearLabel, marker, sectionId, formatReadTime, url_for, date_xml, date }) {
  // 季节标签在构建期转成单线笔画 SVG（无法转换时回退为文字）
  const labelStroke = StrokeLabel({ text: title });
  return (
    <section id={sectionId} class={`archive-group ${marker}`} aria-labelledby={`${sectionId}-title`}>
      <h2 id={`${sectionId}-title`} class="archive-group__header">
        {/* 渐进模糊的另外两层伪元素挂在空 span 上（见 archive.css 的 .archive-label__blur） */}
        <span class="archive-label__blur" aria-hidden="true"></span>
        {/* 回退：单线笔画不可用时按文字渲染 */}
        <span class="archive-label__name">{labelStroke || title}</span>
        {/* 引线把季节与右端的年份连成一行；吸附时随标题一起钉在顶端 */}
        <span class="archive-group__leader" aria-hidden="true"></span>
        <a class="archive-group__year" href={`#${sectionId}`}>
          {yearLabel}
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

function renderTopicPicker({ tags, allPosts, topicListLabel, commonLabel, restLabel }) {
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
        <header class="archive-topic-picker__header">
          <h2 id="archive-topic-picker-title" class="archive-micro">
            {topicListLabel}
          </h2>
          <p class="archive-topic-picker__count">{tags.length}</p>
        </header>
        <nav class="archive-topic-list" aria-labelledby="archive-topic-picker-title">
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

// 秘密花园：不是浮层，而是页面的第二种视图——页名连点五次后，公开清单换成这一块。
// 清单在构建期整体加密（见 include/hexo/encrypt.js 的 encrypt_payload），未解锁前页面源码里
// 只有密文，标题与链接都不外泄；解锁与列表渲染见 source/js/archive.js
function renderGarden({ title, hint, count, placeholder, unlockLabel, lockLabel, errorLabel, blob }) {
  return (
    <section id="archive-garden" class="archive-garden" data-state="locked" aria-labelledby="archive-garden-title">
      <header class="archive-garden__header">
        <h2 id="archive-garden-title" class="archive-garden__title archive-micro">
          {title}
        </h2>
        <span class="archive-garden__count">{count}</span>
      </header>
      <p class="archive-garden__hint">{hint}</p>
      <form class="gate archive-garden__gate" autocomplete="off" aria-labelledby="archive-garden-title">
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
    // 花园清单按日期倒序，与归档列表同一顺序；条目带年份——花园没有季节分组给出年份语境
    const gardenPosts = sitePosts.filter((post) => isEncrypted(post)).sort((a, b) => b.date.valueOf() - a.date.valueOf());

    const groups = groupPostsBySeason(visiblePosts);
    const topicTags = getTopicTags(site?.tags, page, config, helper);

    // 页名：归档页写 Archive，标签页写标签本身——标签页另有一行 eyebrow 说明这是什么
    const heroTitle = isTagPage ? page.tag : ARCHIVE_TITLE;
    const eyebrowLabel = helper._p("common.tag", Infinity);
    const writingsUnit = helper._p("archive.writing", totalVisiblePosts);
    const topicsUnit = helper._p("archive.topic", topicTags.length);
    const writingsStroke = getCountStroke(totalVisiblePosts, totalVisiblePosts === 1 ? "writing" : "writings");
    const topicsStroke = getCountStroke(topicTags.length, topicTags.length === 1 ? "topic" : "topics");
    const gardenCountLabel = `${gardenPosts.length} ${helper._p("archive.writing", gardenPosts.length)}`;
    const formatReadTime = (minutes) => helper.__("article.reading_time", minutes);

    // 花园清单整体加密后随页面下发；没配 encrypt.password 时 helper 返回 null，入口随之消失。
    // 花园只属于归档页——标签页的页名是标签本身，连点没有意义
    const gardenBlob =
      !isTagPage && gardenPosts.length
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
        marker: group.season.toLowerCase(),
        sectionId: getSectionId(group),
        formatReadTime,
        url_for,
        date_xml,
        date,
      }),
    );

    return (
      <main class="archive-page" data-view="archive">
        {/* 刊头一行：页名在左，规模与话题入口在右，共享一条基线。
            两边都是手写笔画——刊头与下面的季节标签因此是同一只手写的 */}
        <header class="archive-masthead">
          {isTagPage ? <p class="archive-masthead__eyebrow archive-micro">{eyebrowLabel}</p> : null}
          <div class="archive-masthead__row">
            <h1 id="archive-masthead-title" class="archive-masthead__title">
              {heroTitle}
            </h1>
            <div class="archive-masthead__actions">
              <span class="archive-masthead__stat">{writingsStroke || `${totalVisiblePosts} ${writingsUnit}`}</span>
              <button
                type="button"
                class="archive-masthead__topics"
                popovertarget="archive-topic-picker"
                aria-expanded="false"
                aria-controls="archive-topic-picker"
              >
                <span class="archive-masthead__stat">{topicsStroke || `${topicTags.length} ${topicsUnit}`}</span>
                <Icon name="chevron-down" size={15} />
              </button>
            </div>
          </div>
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
          commonLabel: helper.__("archive.common_topics"),
          restLabel: helper.__("archive.all_topics"),
        })}

        {gardenBlob
          ? renderGarden({
              title: helper.__("encrypt.garden"),
              hint: helper.__("encrypt.garden_hint"),
              count: gardenCountLabel,
              placeholder: helper.__("encrypt.placeholder"),
              unlockLabel: helper.__("encrypt.unlock"),
              lockLabel: helper.__("encrypt.garden_lock"),
              errorLabel: helper.__("encrypt.error"),
              blob: gardenBlob,
            })
          : null}

        {articleList}
      </main>
    );
  }
};
