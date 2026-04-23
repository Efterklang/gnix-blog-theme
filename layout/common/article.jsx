const { Component, Fragment, dateFormatters } = require("../../include/util/common");
const Comment = require("./comment");
const ArticleLicensing = require("../misc/article_licensing");
const ArticleCover = require("./article_cover");

/**
 * Get the word count of text.
 */
function getWordCount(content) {
  if (typeof content === "undefined") {
    return 0;
  }
  content = content.replace(/<\/?[a-z][^>]*>/gi, "");
  content = content.trim();
  return content ? (content.match(/[\u00ff-\uffff]|[a-zA-Z]+/g) || []).length : 0;
}

module.exports = class extends Component {
  render() {
    // index: true if in article list, false if in article page
    const { config, helper, page, index } = this.props;

    const { article } = config;
    const { url_for } = helper;

    const cover = page.cover ? url_for(page.cover) : null;
    const wordCount = getWordCount(page._content);
    const readTime = Math.ceil(wordCount / 200); // 假设每分钟阅读200字

    return (
      <Fragment>
        {/* Main content */}
        <div class="card">
          {/* Cover image */}
          {cover ? <ArticleCover page={page} cover={cover} index={index} helper={helper} /> : null}
          <article class={`card-content article${"direction" in page ? ` ${page.direction}` : ""}`}>
            {/* Metadata - Medium style */}
            {page.layout !== "page" ? (
              <div class="article-header-meta">
                <div class="article-meta-info">
                  {page.date && (
                    <time class="article-date" datetime={page.date.toISOString()}>
                      {dateFormatters.shortDay.format(page.date)}
                    </time>
                  )}
                  {page.date && (wordCount > 0 || !index) && <span class="meta-separator">·</span>}
                  {wordCount > 0 && <span class="article-reading-time">{readTime} min</span>}
                  {!index && (
                    <Fragment>
                      <span class="meta-separator">·</span>
                      <span
                        class="article-visit-count"
                        data-flag-title={page.title}
                        dangerouslySetInnerHTML={{
                          __html: '<span id="busuanzi_page_pv"></span> PV',
                        }}
                      ></span>
                    </Fragment>
                  )}
                </div>
              </div>
            ) : null}

            {/* Title */}
            {page.title !== "" && index ? (
              <h2 class="article-title">
                <a href={url_for(page.link || page.path)}>{page.title}</a>
              </h2>
            ) : null}
            {page.title !== "" && !index ? <h1 class="article-title">{page.title}</h1> : null}

            {!index && page.excerpt && <div class="content article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}

            {(index || !page.excerpt) && (
              <div
                class={index && page.excerpt ? "content article-excerpt" : "content"}
                dangerouslySetInnerHTML={{
                  __html: index && page.excerpt ? page.excerpt : page.content,
                }}
              ></div>
            )}

            {page.tags?.length && (
              <div class="article-footer">
                <div class="article-tags">
                  {page.tags.map((tag, i) => (
                    <Fragment>
                      {i > 0 && <span class="meta-separator">·</span>}
                      <a class="article-tag" rel="tag" href={url_for(tag.path)}>
                        {tag.name}
                      </a>
                    </Fragment>
                  ))}
                </div>
                {index && (
                  <a class="article-read-more" href={url_for(page.link || page.path)}>
                    Read More →
                  </a>
                )}
              </div>
            )}

            {!index && page.excerpt && <div class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>}

            {/* Licensing block */}
            {!index && article && article.licenses && Object.keys(article.licenses) ? <ArticleLicensing.Cacheable page={page} config={config} helper={helper} /> : null}
          </article>
        </div>
        {/* Comment */}
        {!index ? <Comment config={config} page={page} helper={helper} /> : null}
      </Fragment>
    );
  }
};
