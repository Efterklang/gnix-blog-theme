import { format } from "date-fns";

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
        <div class="card article-wrapper">
          {/* Cover image */}
          {cover ? <ArticleCover page={page} cover={cover} index={index} helper={helper} /> : null}
          <article class={`card-content article${"direction" in page ? ` ${page.direction}` : ""}`}>
            {/* Title */}
            {page.title !== "" && index ? (
              <h2 class="article-title">
                <a href={url_for(page.link || page.path)}>{page.title}</a>
              </h2>
            ) : null}
            {page.title !== "" && !index ? <h1 class="article-title">{page.title}</h1> : null}

            {/* Metadata - Medium style */}
            {page.layout !== "page" ? (
              <div class="article-header-meta">
                <div class="article-meta-info">
                  {page.date && (
                    <time class="article-date" datetime={page.date.toISOString()}>
                      {format(page.date, "LLL dd")}
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
                {page.tags?.length ? (
                  <div class="article-tags-inline">
                    {page.tags.map((tag, idx) => (
                      <Fragment>
                        {idx > 0 && <span class="meta-separator">,</span>}
                        <a class="article-tag" rel="tag" href={url_for(tag.path)}>
                          {tag.name}
                        </a>
                      </Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Content/Excerpt */}
            <div
              class="content"
              dangerouslySetInnerHTML={{
                __html: index && page.excerpt ? page.excerpt : page.content,
              }}
            ></div>
            {/* Licensing block */}
            {!index && article && article.licenses && Object.keys(article.licenses) ? (
              <ArticleLicensing.Cacheable page={page} config={config} helper={helper} />
            ) : null}
          </article>
        </div>
        {/* Comment */}
        {!index ? <Comment config={config} page={page} helper={helper} /> : null}
      </Fragment>
    );
  }
};
