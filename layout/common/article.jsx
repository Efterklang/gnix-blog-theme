const { Component, Fragment } = require("../../include/util/common");
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
  return content
    ? (content.match(/[\u00ff-\uffff]|[a-zA-Z]+/g) || []).length
    : 0;
}

module.exports = class extends Component {
  render() {
    // index: true if in article list, false if in article page
    const { config, helper, page, index } = this.props;

    const { article } = config;
    const { url_for, date, _p } = helper;

    const cover = page.cover ? url_for(page.cover) : null;

    return (
      <Fragment>
        {/* Main content */}
        <div class="card">
          {/* Cover image */}
          {cover ? (
            <ArticleCover
              page={page}
              cover={cover}
              index={index}
              helper={helper}
            />
          ) : null}
          <article
            class={`card-content article${"direction" in page ? ` ${page.direction}` : ""}`}
          >
            {/* Metadata */}
            {page.layout !== "page" ? (
              <div class="article-meta">
                <p>
                  {page.date && <span>{date(page.date)}</span>}
                  {page.categories?.length ? (
                    <span>
                      {page.categories.map((category) => (
                        <a href={url_for(category.path)}>/{category.name}</a>
                      ))}
                    </span>
                  ) : null}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: _p(
                        "article.word_count",
                        getWordCount(page._content),
                      ),
                    }}
                  ></span>
                  {/* Visitor counter */}
                  {!index ? (
                    <span
                      id={url_for(page.link || page.path)}
                      data-flag-title={page.title}
                      dangerouslySetInnerHTML={{
                        __html: _p(
                          "plugin.visit_count",
                          '<span id="busuanzi_page_pv" style="padding-right: 0"></span>',
                        ),
                      }}
                    ></span>
                  ) : null}
                </p>
              </div>
            ) : null}
            {/* Title */}
            {page.title !== "" && index ? (
              <p class="title">
                <a href={url_for(page.link || page.path)}>{page.title}</a>
              </p>
            ) : null}
            {page.title !== "" && !index ? (
              <h1 class="title">{page.title}</h1>
            ) : null}
            {/* Content/Excerpt */}
            <div
              class="content"
              dangerouslySetInnerHTML={{
                __html: index && page.excerpt ? page.excerpt : page.content,
              }}
            ></div>
            {/* Tags */}
            {!index && page.tags && page.tags.length ? (
              <div class="article-tags">
                {page.tags.map((tag) => {
                  return (
                    <a class="tags" rel="tag" href={url_for(tag.path)}>
                      <span class="tag">{tag.name}</span>
                      <span class="tag">{tag.length}</span>
                    </a>
                  );
                })}
              </div>
            ) : null}
            {/* Licensing block */}
            {!index &&
            article &&
            article.licenses &&
            Object.keys(article.licenses) ? (
              <ArticleLicensing.Cacheable
                page={page}
                config={config}
                helper={helper}
              />
            ) : null}
          </article>
        </div>
        {/* Comment */}
        {!index ? (
          <Comment config={config} page={page} helper={helper} />
        ) : null}
      </Fragment>
    );
  }
};
