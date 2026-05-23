const { Component } = require("../../include/util/common");

function getTranslationInfo(page, helper) {
  if (!page.i18n) return null;
  const t = page.i18n.translation;
  if (t === 1) return helper.__("article.translation_llm_reviewed");
  if (t === 2) return helper.__("article.translation_llm_unreviewed");
  return helper.__("article.translation_original");
}

function LanguageIcon({ title }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label={title}>
      <title>{title}</title>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}

module.exports = class extends Component {
  render() {
    const { page, config, helper } = this.props;
    const { article } = config;
    const translationInfo = getTranslationInfo(page, helper);

    const markdownSourceUrl = page.markdown_path ? helper.url_for(page.markdown_path) : null;
    const markdownSourceLabel = helper.__("article.markdown_source");
    const markdownSourceType = "text/markdown; charset=utf-8";

    return (
      <div id="article-info-popover" popover="auto" class="article-popover article-info-popover">
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
            {translationInfo && (
              <div class="article-info-item">
                <div class="article-info-icon">
                  <LanguageIcon title={helper.__("article.translation_info")} />
                </div>
                <div class="article-info-content">
                  <span class="article-info-label">{helper.__("article.translation_info")}</span>
                  <span class="article-info-value">{translationInfo}</span>
                </div>
              </div>
            )}
            {markdownSourceUrl && (
              <div class="article-info-item">
                <div class="article-info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 640 512" role="img" aria-label={markdownSourceLabel}>
                    <title>{markdownSourceLabel}</title>
                    <path
                      fill="currentColor"
                      d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.1-46.1V105.2c0-25.4-20.7-46.1-46.2-46.1M338.5 360.6H277v-120l-61.5 76.9l-61.5-76.9v120H92.3V151.4h61.5l61.5 76.9l61.5-76.9h61.5v209.2zm135.3 3.1L381.5 256H443V151.4h61.5V256H566z"
                    />
                  </svg>
                </div>
                <div class="article-info-content">
                  <span class="article-info-label">{markdownSourceLabel}</span>
                  <span class="article-info-value">
                    <a href={markdownSourceUrl} target="_blank" rel="noopener" type={markdownSourceType}>
                      {decodeURI(markdownSourceUrl)}
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
                    <path fill="none" d="M15 21H6a3 3 0 0 1-3-3v-1h10v2a2 2 0 0 0 4 0V5a2 2 0 1 1 2 2h-2m2-4H8a3 3 0 0 0-3 3v11M9 7h4m-4 4h4" />
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
    );
  }
};
