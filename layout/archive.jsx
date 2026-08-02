const { Component, isValidDate, parseISO, dateFormatters, formatMonthDay } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");
const { filterByLanguage } = require("../include/util/i18n");

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
  const tokens = stripped.match(/[ÿ-￿]|[a-zA-Z]+/g);
  return tokens ? Math.max(1, Math.ceil(tokens.length / 200)) : 0;
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

const SEASON_ABBR = { Spring: "Spr", Summer: "Sum", Autumn: "Aut", Winter: "Win" };

// 分组标题：季节缩写 + 两位年份，跨年段记起讫年（Win.25/26），CSS 转小写呈现
function getSeasonGroupLabel({ season, startYear, endYear }) {
  const yy = (value) => String(value % 100).padStart(2, "0");
  const range = startYear === endYear ? yy(startYear) : `${yy(startYear)}/${yy(endYear)}`;
  return `${SEASON_ABBR[season]}.${range}`;
}

// 小写标签里 lining figures 比 x 高度高出一截；把数字段拆出来包 span，
// 由 CSS 缩字号贴近小写腰高（近似 oldstyle figures，字体本身多半没有 onum）
function renderLabelSegments(title) {
  return String(title)
    .split(/(\d+)/)
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? <span class="archive-label__num">{segment}</span> : segment));
}

function getArchiveRangeLabel(year, month = null, labels = {}) {
  if (!year) return labels.allPosts || "All Posts";
  if (month) {
    const time = parseISO(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`);
    return isValidDate(time) ? `${dateFormatters.longMonth.format(time)} ${year}` : String(year);
  }
  return String(year);
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

function collectArchiveYears(posts) {
  return Array.from(new Set(posts.map((post) => post.date.year()))).sort((a, b) => b - a);
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

// labelledBy 存在时分组作为 carousel 面板呈现：标题由上方的 tab 承担，
// 组内不再渲染 h2，aria-labelledby 指向对应 tab
function renderSeasonGroup({ posts, title, marker = "all", sectionId, labelledBy = null, url_for, date_xml, date }) {
  return (
    <section id={sectionId} class={`archive-group ${marker}`} aria-labelledby={labelledBy || `${sectionId}-title`}>
      {!labelledBy && (
        <h2 id={`${sectionId}-title`} class="archive-group__header archive-label">
          {/* 单一 span 包住整段：h2 是 flex 容器，多个裸文字/数字节点会各自成 flex 项，
              文字段的行尾空格（如 "June 2026"）会被裁掉，基线对齐也需额外处理 */}
          <span>{renderLabelSegments(title)}</span>
        </h2>
      )}
      {posts.map((post, index) => {
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
            readTime={readMinutes ? `${readMinutes} min read` : null}
            order={index}
          />
        );
      })}
    </section>
  );
}

function renderTopicPicker({ tags, allPosts, topicListLabel, stats }) {
  const staggerBase = allPosts ? 1 : 0;
  return (
    <div id="archive-topic-picker" class="archive-topic-picker" popover="auto">
      <div class="archive-topic-picker__body" role="dialog" aria-labelledby="archive-topic-picker-title">
        <header class="archive-topic-picker__header">
          <h2 id="archive-topic-picker-title">{topicListLabel}</h2>
          {stats.length > 0 && (
            <ul class="archive-topic-picker__stats">
              {stats.map((stat) => (
                <li key={stat}>{stat}</li>
              ))}
            </ul>
          )}
        </header>
        {(allPosts || tags.length > 0) && (
          <nav class="archive-topic-list" aria-label={topicListLabel}>
            {allPosts && (
              <a class="archive-topic-list__item archive-topic-list__item--all" style="--i:0" href={allPosts.url} aria-current={allPosts.current ? "page" : null}>
                <span class="archive-topic-list__name">{allPosts.name}</span>
                <span class="archive-topic-list__count">{allPosts.count}</span>
              </a>
            )}
            {tags.map((tag, index) => (
              <a key={tag.url} class="archive-topic-list__item" style={`--i:${index + staggerBase}`} href={tag.url} aria-current={tag.current ? "page" : null}>
                <span class="archive-topic-list__name">{tag.name}</span>
                <span class="archive-topic-list__count">{tag.count}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

module.exports = class extends Component {
  render() {
    const { config, page, site, helper } = this.props;
    const { url_for, date_xml, date } = helper;

    const visiblePosts = collectPosts(page.posts);
    const totalVisiblePosts = visiblePosts.length;

    const years = collectArchiveYears(visiblePosts);
    const topicTags = getTopicTags(site?.tags, page, config, helper);
    const topicsTitle = helper._p("common.tag", Infinity);
    const archiveLabels = {
      allPosts: helper.__("archive.all_posts"),
    };

    const currentYear = page.year ? Number(page.year) : null;
    const currentMonth = page.month ? Number(page.month) : null;
    const isTagPage = Boolean(page.tag);
    const langKey = helper.language_key(page);
    const allSitePosts = helper.is_i18n_enabled() ? filterByLanguage(site?.posts, langKey, config || {}) : site?.posts;
    const allPostsCount = allSitePosts?.length || totalVisiblePosts;
    const writingsLabel = `${totalVisiblePosts} ${helper._p("archive.writing", totalVisiblePosts)}`;
    const topicLabel = helper._p("archive.topic", topicTags.length);
    const topicCountLabel = `${topicTags.length} ${topicLabel}`;
    const sinceYear = years.length ? years[years.length - 1] : currentYear;
    const sinceLabel = sinceYear ? helper.__("archive.since", sinceYear) : null;
    const pickerStats = [writingsLabel, sinceLabel].filter(Boolean);

    let articleList;
    if (!page.year) {
      const seasonGroups = groupPostsBySeason(visiblePosts).map((group) => ({
        ...group,
        marker: group.season.toLowerCase(),
        sectionId: `archive-${group.season.toLowerCase()}-${group.startYear}`,
      }));
      // 横向 carousel：上方 tab 条承担各组标题与切换（tab 为锚链接，无 JS 时
      // 浏览器原生把 snap 容器横向滚到目标组；archive.js 增强为平滑滚动 + 状态同步）
      articleList = seasonGroups.length > 0 && (
        <div class="archive-carousel">
          <nav class="archive-carousel__tabs" aria-label={helper.__("archive.switch_group")}>
            {seasonGroups.map((group, index) => (
              <a
                key={group.sectionId}
                id={`${group.sectionId}-tab`}
                class={`archive-carousel__tab archive-label ${group.marker}`}
                href={`#${group.sectionId}`}
                aria-current={index === 0 ? "true" : null}
              >
                <span>{renderLabelSegments(getSeasonGroupLabel(group))}</span>
              </a>
            ))}
          </nav>
          <div class="archive-carousel__track">
            {seasonGroups.map((group) =>
              renderSeasonGroup({
                posts: group.posts,
                title: getSeasonGroupLabel(group),
                marker: group.marker,
                sectionId: group.sectionId,
                labelledBy: `${group.sectionId}-tab`,
                url_for,
                date_xml,
                date,
              }),
            )}
          </div>
        </div>
      );
    } else {
      const season = page.month ? getSeason(page.month) : null;
      const marker = season ? season.toLowerCase() : "all";
      articleList = renderSeasonGroup({
        posts: visiblePosts,
        title: getArchiveRangeLabel(page.year, page.month, archiveLabels),
        marker,
        sectionId: `archive-${page.year}-${marker}-${page.month || "all"}`,
        url_for,
        date_xml,
        date,
      });
    }

    const heroTitle = isTagPage ? page.tag : currentYear ? getArchiveRangeLabel(currentYear, currentMonth, archiveLabels) : helper.__("archive.posts");
    const heroTitleLabel = [heroTitle, ...pickerStats, topicCountLabel].join(" / ");
    return (
      <main class="archive-page">
        <h1 class="archive-hero">
          <button type="button" class="archive-hero__title archive-label" popovertarget="archive-topic-picker" aria-haspopup="dialog" aria-label={heroTitleLabel}>
            {heroTitle}
          </button>
        </h1>
        {renderTopicPicker({
          tags: topicTags,
          allPosts: {
            name: archiveLabels.allPosts,
            count: allPostsCount,
            url: helper.localized_url_for("/"),
            current: !isTagPage && !page.year,
          },
          topicListLabel: topicsTitle,
          stats: pickerStats,
        })}

        {articleList}
      </main>
    );
  }
};
