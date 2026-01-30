const { format, isValid, parseISO } = require("date-fns");
const { Component, Fragment } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");

module.exports = class extends Component {
  render() {
    const { page, helper } = this.props;
    const { url_for, date_xml, date } = helper;

    const inlineCSS = `
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

            span.year {
                position: absolute;
                top: 1.5rem;
                right: 1.5rem;
                z-index: 0;
                font-weight: bolder;
                font-family: var(--font-handwriting);
                font-size: 4em;
                font-style: italic;
                color: hsl(from var(--accent) h s l / 0.3);
                line-height: 1;
                user-select: none;
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
        title = format(time, "LLLL 'yy");
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

    return (
      <Fragment>
        <style dangerouslySetInnerHTML={{ __html: inlineCSS }}></style>
        {articleList}
      </Fragment>
    );
  }
};
