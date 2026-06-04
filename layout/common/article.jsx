const { Component, Fragment, dateFormatters } = require("../../include/util/common");
const Comment = require("./comment");
const ArticleCover = require("./article_cover");
const ArticleInfo = require("./article_info");

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
    const { config, helper, page } = this.props;

    const { url_for } = helper;

    const cover = page.cover ? url_for(page.cover) : null;
    const wordCount = getWordCount(page._content);
    const readTime = Math.ceil(wordCount / 200); // 假设每分钟阅读200字
    const hasComment = config.comment && typeof config.comment.type === "string";
    const translatedCommentsLabel = helper.__("article.comments");
    const commentsLabel = translatedCommentsLabel === "article.comments" ? "Comments" : translatedCommentsLabel;

    return (
      <Fragment>
        {/* Main content */}
        <div class="card">
          {/* Cover image */}
          {cover ? <ArticleCover page={page} cover={cover} helper={helper} /> : null}
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
                  {page.date && <span class="meta-separator">·</span>}
                  {wordCount > 0 && <span class="article-reading-time">{readTime} min</span>}
                  <span class="meta-separator">·</span>
                  <span
                    class="article-visit-count"
                    data-flag-title={page.title}
                    dangerouslySetInnerHTML={{
                      __html: '<span id="busuanzi_page_pv"></span> PV',
                    }}
                  ></span>
                </div>
              </div>
            ) : null}

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
                <button type="button" class="article-action-btn" popovertarget="article-font-settings" aria-label={helper.__("article.font_settings")} title={helper.__("article.font_settings")}>
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
                    aria-label={helper.__("article.font_settings")}
                  >
                    <title>{helper.__("article.font_settings")}</title>
                    <path d="M12 4v16" />
                    <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
                    <path d="M9 20h6" />
                  </svg>
                </button>
                <button type="button" class="article-action-btn" popovertarget="article-info-popover" aria-label={helper.__("article.article_info")} title={helper.__("article.article_info")}>
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
                    aria-label={helper.__("article.article_info")}
                  >
                    <title>{helper.__("article.article_info")}</title>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>

          </article>

          <div id="article-font-settings" popover="auto" class="article-popover article-font-popover">
            <button class="article-popover-backdrop" type="button" popovertarget="article-font-settings" popovertargetaction="hide" tabindex="-1" aria-label="Close article panel"></button>
              <div class="article-popover-body">
                <div class="font-settings-column">
                  <div class="font-setting-group font-size-group">
                    <div class="font-size-selector">
                      <button type="button" class="font-size-btn" data-size="small" aria-label="Small">
                        <span class="font-size-preview">A</span>
                      </button>
                      <button type="button" class="font-size-btn" data-size="medium-small" aria-label="Medium Small">
                        <span class="font-size-preview">A</span>
                      </button>
                      <button type="button" class="font-size-btn is-active" data-size="medium" aria-label="Medium">
                        <span class="font-size-preview">A</span>
                      </button>
                      <button type="button" class="font-size-btn" data-size="medium-large" aria-label="Medium Large">
                        <span class="font-size-preview">A</span>
                      </button>
                      <button type="button" class="font-size-btn" data-size="large" aria-label="Large">
                        <span class="font-size-preview">A</span>
                      </button>
                    </div>
                  </div>
                  <div class="font-setting-group font-line-height-group">
                    <div class="font-line-height-control">
                      <span class="font-line-height-label">Compact</span>
                      <input id="article-line-height-slider" class="font-line-height-slider" type="range" min="1.45" max="1.9" step="0.05" value="1.7" aria-label="Line Height" />
                      <span class="font-line-height-label">Relaxed</span>
                    </div>
                    <div class="font-line-height-meta">
                      <span>Normal</span>
                      <output class="font-line-height-value" for="article-line-height-slider">
                        1.70
                      </output>
                    </div>
                  </div>
                  <div class="font-setting-group font-type-group">
                    <div class="font-type-selector">
                      <button type="button" class="font-type-btn is-active" data-font="serif">
                        <span class="font-type-preview">Aa</span>
                        <span class="font-type-name">Serif</span>
                      </button>
                      <button type="button" class="font-type-btn" data-font="sans-serif">
                        <span class="font-type-preview">Aa</span>
                        <span class="font-type-name">Sans Serif</span>
                      </button>
                      <button type="button" class="font-type-btn" data-font="mono">
                        <span class="font-type-preview">Aa</span>
                        <span class="font-type-name">Monospace</span>
                      </button>
                      <button type="button" class="font-type-btn" data-font="handwriting">
                        <span class="font-type-preview">Aa</span>
                        <span class="font-type-name">Handwriting</span>
                      </button>
                    </div>
                  </div>
                  <div class="font-setting-group font-weight-group">
                    <div class="font-weight-selector">
                      <button type="button" class="font-weight-btn" data-weight="light" aria-label="Light">
                        <span class="font-option-name">Light</span>
                      </button>
                      <button type="button" class="font-weight-btn is-active" data-weight="regular" aria-label="Regular">
                        <span class="font-option-name">Regular</span>
                      </button>
                      <button type="button" class="font-weight-btn" data-weight="medium" aria-label="Medium">
                        <span class="font-option-name">Medium</span>
                      </button>
                    </div>
                  </div>
                  <div class="font-setting-group font-custom-group">
                    <button type="button" class="font-custom-toggle" aria-expanded="false" aria-controls="font-custom-panel" aria-label="Custom Fonts">
                      <span>Custom Fonts</span>
                      <span class="font-custom-toggle-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
                          <path d="M7 2.25v9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                          <path d="M2.25 7h9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                        </svg>
                      </span>
                    </button>
                    <div id="font-custom-panel" class="font-custom-panel" data-expanded="false" aria-hidden="true">
                      <div class="font-custom-panel-inner">
                        <form class="font-custom-form">
                          <label class="font-custom-field font-custom-import-field">
                            <span class="font-custom-label-row">
                              <span>Web Font CSS URL</span>
                              <button type="button" class="font-custom-help-btn" popovertarget="font-custom-help-popover" aria-label="Font CSS help">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
                                  <path d="M12 10.25v5.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                  <circle cx="12" cy="7.9" r="1" fill="currentColor" />
                                </svg>
                              </button>
                            </span>
                            <textarea
                              class="font-custom-imports"
                              name="font-custom-imports"
                              rows="3"
                              placeholder="https://fonts.googleapis.com/css2?family=..."
                              aria-label="Web Font CSS URL"
                            ></textarea>
                          </label>
                          <div class="font-custom-family-grid">
                            <label class="font-custom-field">
                              <span>Serif</span>
                              <input class="font-custom-family-input" name="font-custom-family-serif" type="text" data-font-family="serif" placeholder={'"Noto Serif SC", serif'} autocomplete="off" />
                            </label>
                            <label class="font-custom-field">
                              <span>Sans Serif</span>
                              <input
                                class="font-custom-family-input"
                                name="font-custom-family-sans-serif"
                                type="text"
                                data-font-family="sans-serif"
                                placeholder={'"Inter", sans-serif'}
                                autocomplete="off"
                              />
                            </label>
                            <label class="font-custom-field">
                              <span>Monospace</span>
                              <input class="font-custom-family-input" name="font-custom-family-mono" type="text" data-font-family="mono" placeholder={'"Fira Code", monospace'} autocomplete="off" />
                            </label>
                            <label class="font-custom-field">
                              <span>Handwriting</span>
                              <input
                                class="font-custom-family-input"
                                name="font-custom-family-handwriting"
                                type="text"
                                data-font-family="handwriting"
                                placeholder={'"LXGW WenKai", cursive'}
                                autocomplete="off"
                              />
                            </label>
                          </div>
                          <div class="font-custom-actions">
                            <button type="submit" class="font-custom-apply">
                              Apply
                            </button>
                            <button type="button" class="font-custom-reset">
                              Reset
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                  <div id="font-custom-help-popover" popover="manual" class="font-custom-help-popover" role="tooltip">
                    Paste one web font CSS URL per line. Each URL can load one or more font families.
                  </div>
                </div>
                <aside class="font-preview-column">
                  <div class="font-setting-group font-preview-group">
                    <span class="font-setting-label">Preview</span>
                    <div class="font-preview-box">
                      <p class="font-preview-title">{page.title}</p>
                      {page.excerpt && <p class="font-preview-excerpt" dangerouslySetInnerHTML={{ __html: `${page.excerpt.substring(0, 80)}...` }}></p>}
                    </div>
                  </div>
                </aside>
              </div>
            </div>

          {hasComment && (
            <div id="article-comment-popover" popover="auto" class="article-popover article-comment-popover">
              <button class="article-popover-backdrop" type="button" popovertarget="article-comment-popover" popovertargetaction="hide" tabindex="-1" aria-label="Close article panel"></button>
              <div class="article-popover-body article-comment-popover-body">
                <Comment config={config} page={page} helper={helper} embedded />
              </div>
            </div>
          )}

          <ArticleInfo page={page} config={config} helper={helper} />
        </div>
      </Fragment>
    );
  }
};
