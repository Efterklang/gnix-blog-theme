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
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const postUrl = url_for(page.link || page.path);
    const authorName = page.author || config.author || config.title;
    const authorInitial = authorName ? authorName.trim().charAt(0).toUpperCase() : null;
    const hasTags = Boolean(page.tags?.length);
    const articleClass = ["card", "article-shell", index ? "article-shell--feed" : "article-shell--post"].join(" ");
    const contentHtml = index && page.excerpt ? page.excerpt : page.content;

    return (
      <Fragment>
        <div class={articleClass}>
          <article class={`card-content article${"direction" in page ? ` ${page.direction}` : ""}${index ? " article--feed" : " article--post"}`}>
            {index ? (
              <div class={`article-feed${cover ? " article-feed--with-cover" : ""}`}>
                <div class="article-feed-main">
                  {page.layout !== "page" ? (
                    <div class="article-feed-meta">
                      {authorName ? <span class="article-feed-author">{authorName}</span> : null}
                      {page.date ? (
                        <time class="article-date" datetime={page.date.toISOString()}>
                          {dateFormatters.shortDay.format(page.date)}
                        </time>
                      ) : null}
                      {wordCount > 0 ? <span class="article-reading-time">{readTime} min read</span> : null}
                    </div>
                  ) : null}
                  {page.title !== "" ? (
                    <h2 class="article-title">
                      <a href={postUrl}>{page.title}</a>
                    </h2>
                  ) : null}
                  <div
                    class="content article-excerpt"
                    dangerouslySetInnerHTML={{
                      __html: contentHtml,
                    }}
                  ></div>
                  <div class="article-feed-footer">
                    {hasTags ? (
                      <div class="article-tags-inline">
                        {page.tags.map((tag) => (
                          <a class="article-tag" rel="tag" href={url_for(tag.path)}>
                            {tag.name}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span class="article-feed-rule" aria-hidden="true"></span>
                    )}
                    <a class="article-read-more" href={postUrl}>
                      Continue reading
                    </a>
                  </div>
                </div>
                {cover ? (
                  <div class="article-feed-cover">
                    <ArticleCover page={page} cover={cover} index={index} helper={helper} />
                  </div>
                ) : null}
              </div>
            ) : (
              <Fragment>
                <header class="article-hero">
                  {page.layout !== "page" && authorName ? (
                    <div class="article-byline">
                      {authorInitial ? <span class="article-byline-avatar">{authorInitial}</span> : null}
                      <div class="article-byline-text">
                        <span class="article-byline-name">{authorName}</span>
                        <div class="article-header-meta">
                          {page.date ? (
                            <time class="article-date" datetime={page.date.toISOString()}>
                              {dateFormatters.shortDay.format(page.date)}
                            </time>
                          ) : null}
                          {wordCount > 0 ? <span class="article-reading-time">{readTime} min read</span> : null}
                          <span
                            class="article-visit-count"
                            data-flag-title={page.title}
                            dangerouslySetInnerHTML={{
                              __html: '<span id="busuanzi_page_pv"></span> views',
                            }}
                          ></span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}
                  {hasTags ? (
                    <div class="article-tags-inline">
                      {page.tags.map((tag) => (
                        <a class="article-tag" rel="tag" href={url_for(tag.path)}>
                          {tag.name}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {cover ? <ArticleCover page={page} cover={cover} index={index} helper={helper} /> : null}
                </header>
                <div
                  class="content"
                  dangerouslySetInnerHTML={{
                    __html: contentHtml,
                  }}
                ></div>
                {!index && article && article.licenses && Object.keys(article.licenses) ? <ArticleLicensing.Cacheable page={page} config={config} helper={helper} /> : null}
              </Fragment>
            )}
          </article>
        </div>
        {!index ? <Comment config={config} page={page} helper={helper} /> : null}
      </Fragment>
    );
  }
};
