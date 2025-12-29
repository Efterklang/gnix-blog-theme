const { format, isValid, parseISO } = require("date-fns");
const { Component, Fragment } = require("../include/util/common");
const Paginator = require("./misc/paginator");
const ArticleMedia = require("./common/article_media");

module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;
    const { url_for, __, date_xml, date } = helper;

    const inlineCSS = `
            .article-meta {
              font-size: 0.8rem;
              color: var(--subtext1);
              margin-bottom: 0.1rem;
            }

            a.archive-title {
              color: var(--text);

              &:hover {
                color: var(--peach);
              }
            }

            span.year {
                position: absolute;
                top: 1.5rem;
                right: 1.5rem;
                z-index: 0;
                font-size: 7.5rem;
                font-weight: bolder;
                font-family: Paris2024;
                color: hsl(from var(--lavender) h s l / 0.15);
                line-height: 1;
                user-select: none;
            }
            .timeline .archive-item {
                display: flex;
                text-align: left;
                align-items: flex-start;
            }
            .timeline .archive-item a {
                color: var(--text);
                transition: color 0.2s;
            }
            .timeline .archive-item a:hover {
                color: var(--peach);
            }
            .archive-item + .archive-item {
                border: none;
                margin-top: 0;
                padding-top: .5rem;
            }
        `;
    function renderArticleList(posts, year, month = null) {
      let time = null;
      if (page.year) {
        const mm = page.month ? String(page.month).padStart(2, "0") : "01";
        time = parseISO(`${page.year}-${mm}-01T00:00:00.000Z`);
      }
      return (
        <div class="card">
          <div class="card-content">
            <span class="year">
              {month === null ? year : isValid(time) ? format(time, "LLLL yyyy") : year}
            </span>
            <div class="timeline">
              {posts.map((post) => {
                return (
                  <ArticleMedia
                    url={url_for(post.link || post.path)}
                    title={post.title}
                    date={date(post.date)}
                    dateXml={date_xml(post.date)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    let articleList;
    if (!page.year) {
      const years = {};
      page.posts.each((p) => {
        years[p.date.year()] = null;
      });
      articleList = Object.keys(years)
        .sort((a, b) => b - a)
        .map((year) => {
          const posts = page.posts.filter((p) => p.date.year() === parseInt(year, 10));
          return renderArticleList(posts, year, null);
        });
    } else {
      articleList = renderArticleList(page.posts, page.year, page.month);
    }

    return (
      <Fragment>
        <style dangerouslySetInnerHTML={{ __html: inlineCSS }}></style>
        {articleList}
        {page.total > 1 ? (
          <Paginator
            current={page.current}
            total={page.total}
            baseUrl={page.base}
            path={config.pagination_dir}
            urlFor={url_for}
            prevTitle={__("common.prev")}
            nextTitle={__("common.next")}
          />
        ) : null}
      </Fragment>
    );
  }
};
