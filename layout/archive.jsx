const { format, isValid, parseISO } = require("date-fns");
const { Component, Fragment } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");

module.exports = class extends Component {
  render() {
    const { page, helper, site, config } = this.props;
    const { url_for, date_xml, date } = helper;


    function getSeason(month) {
      if (month >= 2 && month <= 4) return "Spring";
      if (month >= 5 && month <= 7) return "Summer";
      if (month >= 8 && month <= 10) return "Autumn";
      return "Winter";
    }

    function renderArticleList(posts, year, month = null, sectionTitle = null, season = null) {
      let time = null;
      if (page.year) {
        const mm = page.month ? String(page.month).padStart(2, "0") : "01";
        time = parseISO(`${page.year}-${mm}-01T00:00:00.000Z`);
      }

      let title = `'${String(year).slice(-2)}`;
      if (sectionTitle) {
        title = sectionTitle;
      } else if (month !== null && isValid(time)) {
        title = format(time, "LLLL");
      }

      return (
        <div class="card">
          <div class={["card-content", season ? season.toLowerCase() : null].filter(Boolean).join(" ")}>
            <span class="year">{title}</span>
            <div class="timeline">
              {posts.map((post) => {
                return <ArticleMedia url={url_for(post.link || post.path)} title={post.title} date={date(post.date)} dateXml={date_xml(post.date)} />;
              })}
            </div>
          </div>
        </div>
      );
    }

    let articleList;
    if (!page.year) {
      const groups = [];
      page.posts.each((p) => {
        const year = p.date.year();
        const month = p.date.month(); // 0-11
        const season = getSeason(month);

        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.year === year && lastGroup.season === season) {
          lastGroup.posts.push(p);
        } else {
          groups.push({
            year,
            season,
            posts: [p],
          });
        }
      });

      articleList = groups.map((group) => {
        const title = `'${String(group.year).slice(-2)} ${group.season}`;
        return renderArticleList(group.posts, group.year, null, title, group.season);
      });
    } else {
      const season = page.month ? getSeason(page.month - 1) : null;
      articleList = renderArticleList(page.posts, page.year, page.month, null, season);
    }

    const archiveDir = config?.archive_dir || "archives";
    const archiveBasePath = url_for(`/${archiveDir}/`);
    const currentYear = page.year ? Number(page.year) : null;
    const currentMonth = page.month ? Number(page.month) : null;

    const yearToMonths = new Map();
    const allPosts = site?.posts ? site.posts.sort("date", -1) : page.posts;
    if (allPosts?.each) {
      allPosts.each((p) => {
        const y = p.date.year();
        const m = p.date.month() + 1;
        const existing = yearToMonths.get(y);
        if (existing) {
          existing.add(m);
        } else {
          yearToMonths.set(y, new Set([m]));
        }
      });
    }
    const years = Array.from(yearToMonths.keys()).sort((a, b) => b - a);
    const monthsForCurrentYear = currentYear && yearToMonths.get(currentYear) ? Array.from(yearToMonths.get(currentYear)).sort((a, b) => a - b) : [];

    return (
      <Fragment>
        <script data-swup-ignore-script defer src="/js/archive-breadcrumb.js"></script>
        <link rel="stylesheet" href="/css/archive.css" />
        <nav class="archive-breadcrumb" aria-label="archive breadcrumb" data-archive-breadcrumb data-archive-dir={archiveDir}>
          <span class="prompt">$</span>{" "}
          <span class="archive-breadcrumb__cmd" style="color: var(--blue)">
            ls
          </span>{" "}
          <span class="archive-breadcrumb__cmd" style="color: var(--yellow)">
            posts
          </span>
          <span class="archive-breadcrumb__cmd" style="padding: 0">
            /
          </span>
          <span class="archive-breadcrumb__picker" data-picker="year">
            <button type="button" class="archive-breadcrumb__trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Select year">
              <span data-label="year">{currentYear ? String(currentYear) : "*"}</span>
            </button>
            <div class="archive-breadcrumb__menu" role="listbox" tabindex="-1" data-menu="year">
              <button type="button" class="archive-breadcrumb__option" role="option" data-href={archiveBasePath} aria-selected={!currentYear ? "true" : "false"}>
                *
              </button>
              {years.map((y) => (
                <button type="button" class="archive-breadcrumb__option" role="option" data-href={url_for(`/${archiveDir}/${y}/`)} aria-selected={currentYear === y ? "true" : "false"}>
                  {y}
                </button>
              ))}
            </div>
          </span>
          <span class="archive-breadcrumb__cmd" style="padding: 0">
            /
          </span>
          <span class="archive-breadcrumb__picker" data-picker="month">
            <button type="button" class="archive-breadcrumb__trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Select month" disabled={!currentYear}>
              <span data-label="month">{currentMonth ? String(String(currentMonth).padStart(2, "0")) : "*"}</span>
            </button>
            <div class="archive-breadcrumb__menu" role="listbox" tabindex="-1" data-menu="month">
              <button
                type="button"
                class="archive-breadcrumb__option"
                role="option"
                data-href={currentYear ? url_for(`/${archiveDir}/${currentYear}/`) : archiveBasePath}
                aria-selected={!currentMonth ? "true" : "false"}
              >
                *
              </button>
              {monthsForCurrentYear.map((m) => (
                <button
                  type="button"
                  class="archive-breadcrumb__option"
                  role="option"
                  data-href={url_for(`/${archiveDir}/${currentYear}/${String(m).padStart(2, "0")}/`)}
                  aria-selected={currentMonth === m ? "true" : "false"}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </span>
          <span class="cursor">_</span>
        </nav>
        {articleList}
      </Fragment>
    );
  }
};
