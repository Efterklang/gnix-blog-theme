const { Component, Fragment } = require("../../include/util/common");
const Comment = require("./comment");
const ArticleCover = require("./article_cover");
const ArticleInfo = require("./article_info");

module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;

    const { url_for } = helper;

    const cover = page.cover ? url_for(page.cover) : null;
    const hasComment = config.comment && typeof config.comment.type === "string";
    const translatedCommentsLabel = helper.__("article.comments");
    const commentsLabel = translatedCommentsLabel === "article.comments" ? "Comments" : translatedCommentsLabel;
    const articleInfoLabel = helper.__("article.article_info");
    const closeLabel = helper.__("article.close");
    const skipLabel = helper.__("article.skip_to_content");

    const isPost = page.layout !== "page";
    /* 文章页做满高首屏（封面文章由 CSS 扣除封面高度）；独立页面用紧凑版头 */
    const fullHero = isPost;
    const createdDate = isPost && page.date ? helper.date(page.date, "YYYY-MM-DD") : null;
    const updatedDate = isPost && page.updated ? helper.date(page.updated, "YYYY-MM-DD") : null;
    const showUpdated = updatedDate && updatedDate !== createdDate;

    return (
      <Fragment>
        {/* Cover image */}
        {cover ? <ArticleCover page={page} cover={cover} helper={helper} /> : null}
        <article class={`article${"direction" in page ? ` ${page.direction}` : ""}`}>
          <header class={`article-hero${fullHero ? " article-hero-full" : ""}${fullHero && cover ? " article-hero-with-cover" : ""}`}>
            <div class="article-hero-body">
              {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}
              {page.excerpt && <div class="article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}
              {fullHero && (
                <a class="article-hero-arrow" href="#article-content" aria-label={skipLabel} title={skipLabel}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8" />
                    <path d="m8 12 4 4 4-4" />
                  </svg>
                </a>
              )}
            </div>

            <div class="article-hero-meta">
              <div class="article-tags">
                {page.tags?.length
                  ? page.tags.map((tag, i) => (
                      <Fragment>
                        {i > 0 && <span class="meta-separator">·</span>}
                        <a class="article-tag" rel="tag" href={helper.localized_tag_url(tag, helper.language_key(page))}>
                          {tag.name}
                        </a>
                      </Fragment>
                    ))
                  : null}
              </div>
              <div class="article-colophon">
                {createdDate && (
                  <Fragment>
                    <time datetime={page.date.toISOString()}>{createdDate}</time>
                    {showUpdated && (
                      <Fragment>
                        {"/"}
                        <time datetime={page.updated.toISOString()}>{updatedDate}</time>
                      </Fragment>
                    )}
                  </Fragment>
                )}
              </div>
              <div class="article-hero-actions">
                {hasComment && (
                  <button type="button" popovertarget="article-comment-popover" aria-label={commentsLabel} title={commentsLabel}>
                    comments
                  </button>
                )}
                <button type="button" popovertarget="article-info-popover" aria-label={articleInfoLabel} title={articleInfoLabel}>
                  info
                </button>
              </div>
            </div>
          </header>

          <div id="article-content" class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>
        </article>

        {hasComment && (
          <div id="article-comment-popover" popover="auto" class="article-popover article-comment-popover">
            <button class="article-popover-backdrop" type="button" popovertarget="article-comment-popover" popovertargetaction="hide" tabindex="-1" aria-label={closeLabel}></button>
            <div class="article-popover-body article-comment-popover-body">
              <Comment config={config} page={page} helper={helper} />
            </div>
          </div>
        )}

        <ArticleInfo page={page} config={config} helper={helper} />
      </Fragment>
    );
  }
};
