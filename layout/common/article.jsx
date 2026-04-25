const { Component, Fragment, dateFormatters } = require("../../include/util/common");
const Comment = require("./comment");
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

            {!index && page.excerpt && <div class="content article-excerpt" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}

            {(index || !page.excerpt) && (
              <div
                class={index && page.excerpt ? "content article-excerpt" : "content"}
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
                          <a class="article-tag" rel="tag" href={url_for(tag.path)}>
                            {tag.name}
                          </a>
                        </Fragment>
                      ))
                    : null}
                </div>
                <div class="article-title-actions">
                  <button type="button" class="article-action-btn" popovertarget="article-font-settings" aria-label={helper.__("article.font_settings")} title={helper.__("article.font_settings")}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      role="img"
                      aria-label="Font settings"
                    >
                      <title>Font settings</title>
                      <text x="4" y="18" font-family="serif" font-size="16" fill="currentColor" stroke="none">
                        Aa
                      </text>
                    </svg>
                  </button>
                  <button type="button" class="article-action-btn" popovertarget="article-info-popover" aria-label={helper.__("article.article_info")} title={helper.__("article.article_info")}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      role="img"
                      aria-label="Article info"
                    >
                      <title>Article info</title>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
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
                      <a class="article-tag" rel="tag" href={url_for(tag.path)}>
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
                <h3>{helper.__("article.display_settings")}</h3>
                <button type="button" class="article-popover-close" popovertarget="article-font-settings" popovertargetaction="hide" aria-label={helper.__("article.close")}>
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
                <div class="font-setting-group">
                  <span class="font-setting-label">{helper.__("article.font_size")}</span>
                  <div class="font-size-selector">
                    <button type="button" class="font-size-btn" data-size="small" aria-label="Small">
                      <span style="font-size: 12px;">A</span>
                    </button>
                    <button type="button" class="font-size-btn" data-size="medium-small" aria-label="Medium Small">
                      <span style="font-size: 14px;">A</span>
                    </button>
                    <button type="button" class="font-size-btn is-active" data-size="medium" aria-label="Medium">
                      <span style="font-size: 16px;">A</span>
                    </button>
                    <button type="button" class="font-size-btn" data-size="medium-large" aria-label="Medium Large">
                      <span style="font-size: 18px;">A</span>
                    </button>
                    <button type="button" class="font-size-btn" data-size="large" aria-label="Large">
                      <span style="font-size: 20px;">A</span>
                    </button>
                  </div>
                  <div class="font-size-labels">
                    <span>{helper.__("article.font_size_small")}</span>
                    <span>{helper.__("article.font_size_large")}</span>
                  </div>
                </div>
                <div class="font-setting-group">
                  <span class="font-setting-label">{helper.__("article.font_type")}</span>
                  <div class="font-type-selector">
                    <button type="button" class="font-type-btn is-active" data-font="serif">
                      <span class="font-type-preview" style="font-family: var(--font-serif);">
                        Aa
                      </span>
                      <span class="font-type-name">Serif ({helper.__("article.font_serif")})</span>
                    </button>
                    <button type="button" class="font-type-btn" data-font="sans-serif">
                      <span class="font-type-preview" style="font-family: var(--font-sans-serif);">
                        Aa
                      </span>
                      <span class="font-type-name">Sans Serif ({helper.__("article.font_sans_serif")})</span>
                    </button>
                    <button type="button" class="font-type-btn" data-font="mono">
                      <span class="font-type-preview" style="font-family: var(--font-mono);">
                        Aa
                      </span>
                      <span class="font-type-name">Mono ({helper.__("article.font_mono")})</span>
                    </button>
                    <button type="button" class="font-type-btn" data-font="handwriting">
                      <span class="font-type-preview" style="font-family: var(--font-handwriting);">
                        Aa
                      </span>
                      <span class="font-type-name">Handwriting ({helper.__("article.font_handwriting")})</span>
                    </button>
                  </div>
                </div>
                <div class="font-setting-group">
                  <span class="font-setting-label">{helper.__("article.preview")}</span>
                  <div class="font-preview-box">
                    <p class="font-preview-title">{page.title}</p>
                    {page.excerpt && <p class="font-preview-excerpt" dangerouslySetInnerHTML={{ __html: `${page.excerpt.substring(0, 80)}...` }}></p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!index && (
            <div id="article-info-popover" popover="auto" class="article-popover article-info-popover">
              <div class="article-popover-header">
                <h3>{helper.__("article.article_info")}</h3>
                <button type="button" class="article-popover-close" popovertarget="article-info-popover" popovertargetaction="hide" aria-label={helper.__("article.close")}>
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
                <div class="article-info-list">
                  {(page.author || config.author) && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="Author"
                        >
                          <title>Author</title>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.author")}</span>
                        <span class="article-info-value">{page.author || config.author}</span>
                      </div>
                    </div>
                  )}
                  {page.title && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="Title"
                        >
                          <title>Title</title>
                          <path d="M4 20h16" />
                          <path d="M6 16h6" />
                          <path d="M6 12h12" />
                          <path d="M6 8h10" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.article_title")}</span>
                        <span class="article-info-value">{page.title}</span>
                      </div>
                    </div>
                  )}
                  {page.permalink && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="URL"
                        >
                          <title>URL</title>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.url")}</span>
                        <span class="article-info-value">
                          <a href={page.permalink} target="_blank" rel="noopener">
                            {decodeURI(page.permalink)}
                          </a>
                        </span>
                      </div>
                    </div>
                  )}
                  {page.date && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="Created time"
                        >
                          <title>Created time</title>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.created_time")}</span>
                        <span class="article-info-value">{helper.date(page.date, "YYYY-MM-DD HH:mm")}</span>
                      </div>
                    </div>
                  )}
                  {page.updated && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="Updated time"
                        >
                          <title>Updated time</title>
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.updated_time")}</span>
                        <span class="article-info-value">{helper.date(page.updated, "YYYY-MM-DD HH:mm")}</span>
                      </div>
                    </div>
                  )}
                  {article?.licenses && Object.keys(article.licenses).length > 0 && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="License"
                        >
                          <title>License</title>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.license")}</span>
                        <span class="article-info-value">
                          {Object.keys(article.licenses).map((name, i) => (
                            <span key={name}>
                              {i > 0 && <span>, </span>}
                              <a href={article.licenses[name]} target="_blank" rel="noopener">
                                {name}
                              </a>
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                  {page.location && (
                    <div class="article-info-item">
                      <div class="article-info-icon">
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
                          aria-label="Location"
                        >
                          <title>Location</title>
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div class="article-info-content">
                        <span class="article-info-label">{helper.__("article.location")}</span>
                        <span class="article-info-value">{page.location}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Comment */}
        {!index ? <Comment config={config} page={page} helper={helper} /> : null}
      </Fragment>
    );
  }
};
