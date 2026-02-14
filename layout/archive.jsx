const { format, isValid, parseISO } = require("date-fns");
const { Component, Fragment } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");

module.exports = class extends Component {
  render() {
    const { page, helper, site, config } = this.props;
    const { url_for, date_xml, date } = helper;

    const inlineCSS = `
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }

            .article-meta {
              font-size: 0.8rem;
              color: var(--subtext1);
              font-family: var(--font-handwriting);
            }
            a.archive-title {
              font-family: var(--font-sans-serif);
              font-weight: 400;
              color: var(--text);

              &:hover {
                color: var(--accent);
              }
            }

            .archive-breadcrumb {
              color: var(--blue);
              font-family: var(--font-mono);
              margin: 0 0 1rem 0;
              padding-left: 1em;
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 0;
            }
            .archive-breadcrumb .prompt {
              color: var(--green);
              user-select: none;
              margin-right: 0.25em;
            }
            .archive-breadcrumb .cursor {
              display: inline-block;
              color: var(--mauve);
              font-weight: bold;
              margin-left: 2px;
              animation: blink 1s step-end infinite;
              user-select: none;
            }
            .archive-breadcrumb__cmd {
              color: var(--yellow);
              user-select: none;
              padding-right: 0.5em;
            }
            .archive-breadcrumb__picker {
              position: relative;
              display: inline-flex;
              align-items: center;
            }
            .archive-breadcrumb__trigger {
              display: inline-flex;
              align-items: center;
              border: none;
              background: transparent;
              color: var(--yellow);
              font-family: var(--font-mono);
              padding: 0.05em 0.15em;
              border-radius: 4px;
              text-decoration: underline;
              text-decoration-color: hsl(from var(--yellow) h s l / 0.6);
              text-decoration-thickness: 1px;
              text-underline-offset: 0.22em;
              cursor: pointer;
              transition: transform 120ms ease, color 120ms ease, background 120ms ease, text-decoration-color 120ms ease;
            }
            .archive-breadcrumb__trigger:hover {
              color: var(--mauve);
              background: hsl(from var(--base) h s l / 0.35);
              text-decoration-color: hsl(from var(--mauve) h s l / 0.75);
            }
            .archive-breadcrumb__trigger:focus-visible {
              outline: 2px solid hsl(from var(--mauve) h s l / 0.7);
              outline-offset: 2px;
              background: hsl(from var(--base) h s l / 0.35);
            }
            .archive-breadcrumb__trigger[aria-expanded="true"] {
              transform: translateY(-1px);
              color: var(--mauve);
              text-decoration-color: hsl(from var(--mauve) h s l / 0.9);
            }
            .archive-breadcrumb__trigger[disabled] {
              opacity: 0.45;
              cursor: not-allowed;
              text-decoration-color: hsl(from var(--subtext1) h s l / 0.4);
            }
            .archive-breadcrumb__menu {
              position: absolute;
              top: calc(100% + 6px);
              left: 0;
              min-width: 12rem;
              max-height: 15rem;
              overflow: auto;
              background: hsl(from var(--base) h s l / 0.9);
              border: 1px solid hsl(from var(--surface1) h s l / 0.9);
              border-radius: 10px;
              padding: 0.35rem;
              box-shadow: 0 18px 50px hsl(from var(--crust) h s l / 0.45);
              opacity: 0;
              transform: translateY(-6px);
              visibility: hidden;
              pointer-events: none;
              transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms;
              z-index: 20;
            }
            .archive-breadcrumb__trigger[aria-expanded="true"] + .archive-breadcrumb__menu {
              opacity: 1;
              transform: translateY(0);
              visibility: visible;
              pointer-events: auto;
              transition: opacity 160ms ease, transform 160ms ease, visibility 0s;
            }
            .archive-breadcrumb__option {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 0.5rem;
              padding: 0.35rem 0.5rem;
              border-radius: 8px;
              border: none;
              background: transparent;
              color: var(--text);
              font-family: var(--font-mono);
              font-size: 0.9rem;
              cursor: pointer;
              transition: background 120ms ease, color 120ms ease;
              text-align: left;
            }
            .archive-breadcrumb__option:hover,
            .archive-breadcrumb__option:focus-visible {
              background: hsl(from var(--surface1) h s l / 0.55);
              color: var(--yellow);
              outline: none;
            }
            .archive-breadcrumb__option[aria-selected="true"] {
              background: hsl(from var(--surface1) h s l / 0.75);
              color: var(--mauve);
            }
            @media (max-width: 480px) {
              .archive-breadcrumb {
                padding-left: 0.5em;
              }
              .archive-breadcrumb__menu {
                min-width: 8rem;
                max-width: calc(100vw - 2rem);
              }
            }

            span.year {
              position: absolute;
              top: 1.5rem;
              right: 1.5rem;
              z-index: 0;
              font-weight: bolder;
              font-family: var(--font-handwriting);
              font-size: 4em;
              font-style: italic;
              color: hsl(from var(--accent, var(--lavender)) h s l / 0.3);
              line-height: 1;
              user-select: none;
            }

            .winter {
              --accent: var(--blue);
            }
            .autumn {
              --accent: var(--red);
            }
            .summer {
              --accent: var(--green);
            }
            .spring {
              --accent: var(--peach);
            }
            .archive-item {
                display: flex;
                text-align: left;
                align-items: flex-start;
            }
            .archive-item > div {
                display: flex;
                align-items: baseline; /* 时间和标题的文字基线对齐 */
                gap: 0.75rem;
            }
            .archive-item + .archive-item {
                border: none;
                margin-top: 0;
                padding-top: 1em;
            }
        `;
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

    const archiveDir = (config && config.archive_dir) || "archives";
    const archiveBasePath = url_for(`/${archiveDir}/`);
    const currentYear = page.year ? Number(page.year) : null;
    const currentMonth = page.month ? Number(page.month) : null;

    const yearToMonths = new Map();
    const allPosts = site && site.posts ? site.posts.sort("date", -1) : page.posts;
    if (allPosts && allPosts.each) {
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
        <style dangerouslySetInnerHTML={{ __html: inlineCSS }}></style>
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
