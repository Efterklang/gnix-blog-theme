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
    // index: true if in article list, false if in article page
    const { config, helper, page, index } = this.props;

    const { url_for } = helper;

    const cover = page.cover ? url_for(page.cover) : null;
    const wordCount = getWordCount(page._content);
    const readTime = Math.ceil(wordCount / 200); // 假设每分钟阅读200字
    const hasComment = !index && config.comment && typeof config.comment.type === "string";
    const translatedCommentsLabel = helper.__("article.comments");
    const commentsLabel = translatedCommentsLabel === "article.comments" ? "Comments" : translatedCommentsLabel;

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

            {!index && page.excerpt && <div class="article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}

            {(index || !page.excerpt) && (
              <div
                class={index && page.excerpt ? "article-excerpt" : "content"}
                dangerouslySetInnerHTML={{
                  __html: index && page.excerpt ? page.excerpt : page.content,
                }}
              ></div>
            )}

            {!index && (
              <div class="article-footer article-meta-bar">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label={commentsLabel}>
                        <title>{commentsLabel}</title>
                        <g fill="none">
                          <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                          <path
                            fill="currentColor"
                            d="M16 4a3 3 0 0 1 2.995 2.824L19 7v2a3 3 0 0 1 2.995 2.824L22 12v4a3 3 0 0 1-2.824 2.995L19 19v.966c0 1.02-1.143 1.594-1.954 1.033l-.096-.072L14.638 19H11a3 3 0 0 1-1.998-.762l-.14-.134L7 19.5c-.791.593-1.906.075-1.994-.879L5 18.5V17a3 3 0 0 1-2.995-2.824L2 14V7a3 3 0 0 1 2.824-2.995L5 4zm3 7h-8a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3.638a2 2 0 0 1 1.28.464l1.088.906A1.5 1.5 0 0 1 18.5 17h.5a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1m-3-5H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5A1.5 1.5 0 0 1 7 16.5v.5l1.01-.757A3 3 0 0 1 8 16v-4a3 3 0 0 1 3-3h6V7a1 1 0 0 0-1-1"
                          />
                        </g>
                      </svg>
                    </button>
                  )}
                  <button type="button" class="article-action-btn" popovertarget="article-font-settings" aria-label={helper.__("article.font_settings")} title={helper.__("article.font_settings")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label={helper.__("article.font_settings")}>
                      <title>{helper.__("article.font_settings")}</title>
                      <g fill="none" fill-rule="evenodd">
                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                        <path
                          fill="currentColor"
                          d="M21 12a1 1 0 0 1 1 1v6a1 1 0 0 1-1.911.412a4 4 0 1 1 0-6.824A1 1 0 0 1 21 12M8 4c.732 0 1.381.473 1.605 1.17l4.347 13.524a1 1 0 0 1-1.904.612L10.664 15H5.336l-1.384 4.306a1 1 0 0 1-1.904-.612L6.395 5.17A1.69 1.69 0 0 1 8 4m10 10a2 2 0 1 0 0 4a2 2 0 0 0 0-4M8 6.712L5.979 13h4.042z"
                        />
                      </g>
                    </svg>
                  </button>
                  <button type="button" class="article-action-btn" popovertarget="article-info-popover" aria-label={helper.__("article.article_info")} title={helper.__("article.article_info")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label={helper.__("article.article_info")}>
                      <title>{helper.__("article.article_info")}</title>
                      <g fill="none">
                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                        <path
                          fill="currentColor"
                          d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16m-.01 6c.558 0 1.01.452 1.01 1.01v5.124A1 1 0 0 1 12.5 18h-.49A1.01 1.01 0 0 1 11 16.99V12a1 1 0 1 1 0-2zM12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2"
                        />
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {index && page.tags?.length && (
              <div class="article-footer">
                <div class="article-tags">
                  {page.tags.map((tag, i) => (
                    <Fragment>
                      {i > 0 && <span class="meta-separator">·</span>}
                      <a class="article-tag" rel="tag" href={helper.localized_tag_url(tag, helper.language_key(page))}>
                        {tag.name}
                      </a>
                    </Fragment>
                  ))}
                </div>
                <a class="article-read-more" href={url_for(page.link || page.path)}>
                  Read More →
                </a>
              </div>
            )}

            {!index && page.excerpt && <div class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>}
          </article>

          {!index && (
            <div id="article-font-settings" popover="auto" class="article-popover article-font-popover">
              <div class="article-popover-header">
                <h3>Display Settings</h3>
                <button type="button" class="article-popover-close" popovertarget="article-font-settings" popovertargetaction="hide" aria-label="Close">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    role="img"
                    aria-label="Close"
                  >
                    <title>Close</title>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
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
          )}

          {hasComment && (
            <div id="article-comment-popover" popover="auto" class="article-popover article-comment-popover">
              <div class="article-popover-header">
                <h3>{commentsLabel}</h3>
                <button type="button" class="article-popover-close" popovertarget="article-comment-popover" popovertargetaction="hide" aria-label={helper.__("article.close")}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    role="img"
                    aria-label="Close"
                  >
                    <title>Close</title>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <div class="article-popover-body article-comment-popover-body">
                <Comment config={config} page={page} helper={helper} embedded />
              </div>
            </div>
          )}

          {!index && <ArticleInfo page={page} config={config} helper={helper} />}
        </div>
      </Fragment>
    );
  }
};
