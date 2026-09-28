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

    const isPost = page.layout !== "page";
    /* 无图文章保留扉页，有图文章使用自适应图文布局。 */
    const fullHero = isPost;
    const createdDate = isPost && page.date ? helper.date(page.date, "YYYY.MM.DD") : null;
    // 移动端扉页右上的描边巨字：发布日的「日」
    const createdDay = createdDate ? createdDate.slice(8) : null;

    return (
      <Fragment>
        {/* Cover image */}
        {cover && !isPost ? <ArticleCover page={page} cover={cover} helper={helper} /> : null}
        <article class={`article${"direction" in page ? ` ${page.direction}` : ""}`}>
          <header class={`article-hero${fullHero ? " article-hero-full" : ""}${fullHero && cover ? " article-hero-with-cover" : ""}`}>
            {isPost && cover && <ArticleCover page={page} cover={cover} helper={helper} />}
            {fullHero && !cover && createdDay && (
              <span class="article-hero-numeral" aria-hidden="true">
                {createdDay}
              </span>
            )}
            <div class="article-hero-body">
              {page.tags?.length ? (
                <p class="article-kicker">
                  {page.tags.map((tag, i) => (
                    <Fragment>
                      {i > 0 && <span class="meta-separator">·</span>}
                      <a class="article-tag" rel="tag" href={helper.localized_tag_url(tag, helper.language_key(page))}>
                        {tag.name}
                      </a>
                    </Fragment>
                  ))}
                </p>
              ) : null}
              {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}
              {page.excerpt && <div class="article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}
            </div>

            <div class="article-hero-foot">
              <div class="article-colophon">
                {createdDate && (
                  <time datetime={page.date.toISOString()}>{createdDate}</time>
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
            <div class="article-popover-body article-comment-popover-body glass glass-scroll">
              <Comment config={config} page={page} helper={helper} />
            </div>
          </div>
        )}

        <ArticleInfo page={page} config={config} helper={helper} />
      </Fragment>
    );
  }
};
