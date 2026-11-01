const { Component, Fragment } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const Comment = require("./comment");
const ArticleCover = require("./article_cover");
const ArticleInfo = require("./article_info");
const Toc = require("./toc");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

// 文章页分两页：首屏（封面按原比例尽量放大、标题、摘要，占满一屏）与下一屏起的正文。
// 左上角一列工具：Back、INFO（规格表）、TOC（目录），后两者是可展开的面板，默认都收起、点开合（面板高度做过渡）。
// 窄屏没有工具栏：Back 排在最上，规格表排在摘要下方，目录由顶栏的目录钮打开弹层
module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const { url_for } = helper;

    const cover = page.cover ? url_for(page.cover) : null;
    const hasComment = config.comment && typeof config.comment.type === "string";
    const commentsLabel = translate(helper, "article.comments", "Comments");
    const closeLabel = helper.__("article.close");
    const isPost = page.layout !== "page";
    const archiveUrl = helper.localized_url_for(config.archive_generator?.path || "archive", helper.language_key(page));
    const backLabel = translate(helper, "article.back_to_archive", "Back to archive");

    return (
      <Fragment>
        <article class={`article${isPost ? " article--post" : " article--page"}${"direction" in page ? ` ${page.direction}` : ""}`}>
          {isPost && (
            <a class="article-back" href={archiveUrl} title={backLabel} aria-label={backLabel}>
              <Icon name="arrow-left" size={14} />
              Back
            </a>
          )}

          <header class={`article-opening${cover ? " article-opening--cover" : ""}`}>
            {/* 首屏的空余按黄金分割分给上下（38.2 : 61.8），内容落在视觉重心上 */}
            <div class="article-opening__inner">
              {cover && <ArticleCover page={page} cover={cover} helper={helper} />}
              {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}
              {page.excerpt && <div class="article-lead" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}
            </div>
          </header>

          {isPost && (
            <aside class="article-rail" aria-label="Article tools">
              <section class="article-rail__section" data-rail="info">
                <button class="article-rail__toggle" type="button" aria-expanded="false" aria-controls="article-info">
                  <Icon name="plus" size={14} class="article-rail__mark article-rail__mark--closed" />
                  <Icon name="minus" size={14} class="article-rail__mark article-rail__mark--open" />
                  Info
                </button>
                <div class="article-rail__panel">
                  <div id="article-info">
                    <ArticleInfo page={page} config={config} helper={helper} hasComment={hasComment} commentsLabel={commentsLabel} />
                  </div>
                </div>
              </section>
              <Toc config={config} page={page} helper={helper} />
            </aside>
          )}

          <div class="article-body">
            <div id="article-content" class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>
          </div>
        </article>

        {hasComment && (
          <div id="article-comment-popover" popover="auto" class="article-popover article-comment-popover">
            <button class="article-popover-backdrop" type="button" popovertarget="article-comment-popover" popovertargetaction="hide" tabindex="-1" aria-label={closeLabel}></button>
            <div class="article-popover-body article-comment-popover-body surface">
              <Comment config={config} page={page} helper={helper} />
            </div>
          </div>
        )}
      </Fragment>
    );
  }
};
