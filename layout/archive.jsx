const { Component, Fragment, isValidDate, parseISO, dateFormatters } = require("../include/util/common");
const { filterByLanguage } = require("../include/util/i18n");
const ArticleMedia = require("./common/article_media");

function collectPosts(collection) {
  const posts = [];
  if (collection?.each) {
    collection.each((post) => posts.push(post));
  } else if (Array.isArray(collection)) {
    posts.push(...collection);
  }
  return posts;
}

function getSeason(month) {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

function getArchiveRangeLabel(year, month = null, season = null) {
  if (!year) return "All Posts";
  if (month) {
    const time = parseISO(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`);
    return isValidDate(time) ? `${dateFormatters.longMonth.format(time)} ${year}` : String(year);
  }
  return season ? `${season} ${year}` : String(year);
}

function groupPostsBySeason(posts) {
  return posts.reduce((groups, post) => {
    const year = post.date.year();
    const season = getSeason(post.date.month());
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.year === year && lastGroup.season === season) {
      lastGroup.posts.push(post);
    } else {
      groups.push({ year, season, posts: [post] });
    }

    return groups;
  }, []);
}

function collectArchiveYears(posts) {
  return Array.from(new Set(posts.map((post) => post.date.year()))).sort((a, b) => b - a);
}

function getPostDateParts(postDate, dateXml, date) {
  const xml = dateXml(postDate);
  const parsed = parseISO(xml);

  return {
    label: isValidDate(parsed) ? dateFormatters.shortDay.format(parsed) : date(postDate),
    xml,
  };
}

module.exports = class extends Component {
  render() {
    const { page, helper, site, config } = this.props;
    const { url_for, date_xml, date } = helper;
    const langKey = helper.language_key(page);

    function renderArticleList(posts, year, month = null, sectionTitle = null, season = null) {
      const title = sectionTitle || getArchiveRangeLabel(year, month, season);
      const kicker = year ? String(year) : "Archive";
      const marker = season ? season.toLowerCase() : "all";
      const countLabel = posts.length === 1 ? "1 entry" : `${posts.length} entries`;
      const sectionId = `archive-${kicker}-${marker}-${month || "all"}`;

      return (
        <section class={["archive-group", marker].filter(Boolean).join(" ")} aria-labelledby={sectionId}>
          <header class="archive-group__header">
            <div>
              <h2 id={sectionId} class="archive-group__title">
                {title}
              </h2>
            </div>
            <span class="archive-group__count">{countLabel}</span>
          </header>
          <div class="timeline">
            {posts.map((post) => {
              const postDate = getPostDateParts(post.date, date_xml, date);
              return <ArticleMedia key={post.path} url={url_for(post.link || post.path)} title={post.title} date={postDate.label} dateXml={postDate.xml} />;
            })}
          </div>
        </section>
      );
    }

    const visiblePosts = collectPosts(page.posts);
    const totalVisiblePosts = visiblePosts.length;
    const latestPost = visiblePosts[0];

    const allPostsSource = site?.posts ? filterByLanguage(site.posts.sort("date", -1), langKey, config) : page.posts;
    const allPosts = collectPosts(allPostsSource);
    const years = collectArchiveYears(allPosts);
    let articleList;
    if (!page.year) {
      articleList = groupPostsBySeason(visiblePosts).map((group) => {
        const title = getArchiveRangeLabel(group.year, null, group.season);
        return <Fragment key={`${group.year}-${group.season}`}>{renderArticleList(group.posts, group.year, null, title, group.season)}</Fragment>;
      });
    } else {
      const season = page.month ? getSeason(page.month - 1) : null;
      articleList = renderArticleList(visiblePosts, page.year, page.month, null, season);
    }

    const archiveDir = config?.archive_dir || "archives";
    const archiveBasePath = helper.localized_url_for(`/${archiveDir}/`, langKey);
    const currentYear = page.year ? Number(page.year) : null;
    const currentMonth = page.month ? Number(page.month) : null;
    const activeScope = getArchiveRangeLabel(currentYear, currentMonth);
    const yearCountLabel = years.length === 1 ? "1 year" : `${years.length} years`;
    const scopeSummaryLabel = currentYear ? `from ${activeScope}` : `across ${yearCountLabel}`;
    const latestLabel = latestPost ? date(latestPost.date) : "No posts yet";

    return (
      <Fragment>
        <link rel="stylesheet" href={url_for("/css/archive.css")} data-page-head />
        <main class="archive-page">
          <header class="archive-hero">
            <div class="archive-hero__copy">
              <p class="archive-eyebrow">Archive Index</p>
              <h1>{activeScope}</h1>
              <p class="archive-hero__summary">
                {totalVisiblePosts ? `Browsing ${totalVisiblePosts} ${totalVisiblePosts === 1 ? "post" : "posts"} ${scopeSummaryLabel}.` : "No posts are available in this archive yet."}
              </p>
            </div>
            <dl class="archive-stats" aria-label="Archive summary">
              <div>
                <dt>Posts</dt>
                <dd>{totalVisiblePosts}</dd>
              </div>
              <div>
                <dt>Years</dt>
                <dd>{years.length}</dd>
              </div>
              <div>
                <dt>Latest</dt>
                <dd>{latestLabel}</dd>
              </div>
            </dl>
          </header>

          <nav class="archive-years" aria-label="Archive years">
            <a href={archiveBasePath} class={!currentYear ? "is-active" : null} aria-current={!currentYear ? "page" : null}>
              All
            </a>
            {years.map((year) => (
              <a key={year} href={helper.localized_url_for(`/${archiveDir}/${year}/`, langKey)} class={currentYear === year ? "is-active" : null} aria-current={currentYear === year ? "page" : null}>
                {year}
              </a>
            ))}
          </nav>

          <div class="archive-stack">{articleList}</div>
        </main>
      </Fragment>
    );
  }
};
