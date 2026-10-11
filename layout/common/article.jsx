const { Component, Fragment } = require("../../include/util/common");
const Comment = require("./comment");
const ArticleCover = require("./article_cover");
const ArticleInfo = require("./article_info");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

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
    // 日期固定英文全称格式（August 20, 2026），不随站点语言切换
    const createdDate = isPost && page.date ? page.date.clone().locale("en").format("MMMM D, YYYY") : null;
    // 扉页期间导航条整体隐藏（手机端导航还在屏幕底部），底栏的 Back 是不滚动就能回到归档的入口
    const archiveUrl = helper.localized_url_for(config.archive_generator?.path || "archive", helper.language_key(page));
    const backLabel = translate(helper, "article.back_to_archive", "Back to archive");

    return (
      <Fragment>
        {/* Cover image */}
        {cover && !isPost ? <ArticleCover page={page} cover={cover} helper={helper} /> : null}
        <article class={`article${"direction" in page ? ` ${page.direction}` : ""}`}>
          <div class={fullHero ? "article-intro" : null}>
            <header class={`article-hero${fullHero ? " article-hero-full" : ""}`}>
              {/* 中部：文字与封面——窄屏封面在上，桌面由网格放到右页 */}
              <div class="article-hero-main">
                {fullHero && cover && <ArticleCover page={page} cover={cover} helper={helper} />}
                <div class="article-hero-body">
                  {createdDate && (
                    <p class="article-dateline">
                      <time datetime={page.date.toISOString()}>{createdDate}</time>
                    </p>
                  )}
                  {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}
                  {page.excerpt && <div class="article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}
                  {page.tags?.length ? (
                    <div class="article-colophon">
                      {page.tags.map((tag, i) => (
                        <Fragment>
                          {i > 0 && (
                            <span class="meta-separator" aria-hidden="true">
                              ·
                            </span>
                          )}
                          <a class="article-tag" rel="tag" href={helper.localized_tag_url(tag, helper.language_key(page))}>
                            {tag.name}
                          </a>
                        </Fragment>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {/* 底栏：back / comments / info 成组靠右 */}
              <div class="article-hero-foot">
                <div class="article-hero-actions">
                  {fullHero && (
                    <Fragment>
                      <a class="article-hero-back" href={archiveUrl} title={backLabel} aria-label={backLabel}>
                        Back
                      </a>
                      <span class="meta-separator" aria-hidden="true">
                        /
                      </span>
                    </Fragment>
                  )}
                  {hasComment && (
                    <Fragment>
                      <button type="button" popovertarget="article-comment-popover" aria-label={commentsLabel} title={commentsLabel}>
                        comments
                      </button>
                      <span class="meta-separator" aria-hidden="true">
                        /
                      </span>
                    </Fragment>
                  )}
                  <button type="button" popovertarget="article-info-popover" aria-label={articleInfoLabel} title={articleInfoLabel}>
                    info
                  </button>
                </div>
              </div>
            </header>
          </div>

          <div class={fullHero ? "article-reading" : null}>
            <div id="article-content" class="content" tabindex={fullHero ? "-1" : null} dangerouslySetInnerHTML={{ __html: page.content }}></div>
          </div>
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
