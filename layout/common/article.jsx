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

    return (
      <Fragment>
        {/* Cover image */}
        {cover ? <ArticleCover page={page} cover={cover} helper={helper} /> : null}
        <article class={`article${"direction" in page ? ` ${page.direction}` : ""}`}>
          {/* Title */}
          {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}

          {page.excerpt && <div class="article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}

          <div class="article-meta-bar">
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
            <div class="article-title-actions">
              {hasComment && (
                <button type="button" class="article-action-btn" popovertarget="article-comment-popover" aria-label={commentsLabel} title={commentsLabel}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    role="img"
                    aria-label={commentsLabel}
                  >
                    <title>{commentsLabel}</title>
                    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
                    <path d="M8 12h.01" />
                    <path d="M12 12h.01" />
                    <path d="M16 12h.01" />
                  </svg>
                </button>
              )}
              <button type="button" class="article-action-btn" popovertarget="article-info-popover" aria-label={articleInfoLabel} title={articleInfoLabel}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  role="img"
                  aria-label={articleInfoLabel}
                >
                  <title>{articleInfoLabel}</title>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </button>
            </div>
          </div>

          <div class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>
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
