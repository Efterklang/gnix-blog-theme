const { Component, Fragment } = require("../../include/util/common");

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

function getTranslationInfo(page, helper) {
  if (!page.i18n) return null;
  const t = page.i18n.translation;
  if (t === 1) return helper.__("article.translation_llm_reviewed");
  if (t === 2) return helper.__("article.translation_llm_unreviewed");
  return helper.__("article.translation_original");
}

module.exports = class extends Component {
  render() {
    const { page, config, helper } = this.props;
    const { article } = config;
    const translationInfo = getTranslationInfo(page, helper);

    const markdownSourceUrl = page.markdown_path ? helper.url_for(page.markdown_path) : null;
    const closeLabel = helper.__("article.close");

    const wordCount = page.layout !== "page" ? getWordCount(page._content) : 0;
    const readTime = Math.ceil(wordCount / 200); // 假设每分钟阅读200字

    const items = [];
    if (page.title) {
      items.push([helper.__("article.article_title"), page.title]);
    }
    if (page.author || config.author) {
      items.push([helper.__("article.author"), page.author || config.author]);
    }
    if (wordCount > 0) {
      items.push([helper.__("article.reading_time_label"), helper.__("article.reading_time", readTime)]);
    }
    if (page.date) {
      items.push([helper.__("article.created_time"), helper.date(page.date, "YYYY-MM-DD HH:mm")]);
    }
    if (page.updated) {
      items.push([helper.__("article.updated_time"), helper.date(page.updated, "YYYY-MM-DD HH:mm")]);
    }
    if (translationInfo) {
      items.push([helper.__("article.translation_info"), translationInfo]);
    }
    if (markdownSourceUrl) {
      items.push([
        helper.__("article.markdown_source"),
        <a href={markdownSourceUrl} target="_blank" rel="noopener" type="text/markdown; charset=utf-8">
          {decodeURI(markdownSourceUrl)}
        </a>,
      ]);
    }
    if (page.layout !== "page") {
      items.push([helper.__("article.page_views"), <span id="busuanzi_page_pv">-</span>]);
    }
    if (article?.licenses && Object.keys(article.licenses).length > 0) {
      items.push([
        helper.__("article.license"),
        Object.keys(article.licenses).map((name, i) => (
          <span key={name}>
            {i > 0 && <span>, </span>}
            <a href={article.licenses[name]} target="_blank" rel="noopener">
              {name}
            </a>
          </span>
        )),
      ]);
    }
    if (page.location) {
      items.push([helper.__("article.location"), page.location]);
    }

    return (
      <div id="article-info-popover" popover="auto" class="article-popover article-info-popover">
        <button class="article-popover-backdrop" type="button" popovertarget="article-info-popover" popovertargetaction="hide" tabindex="-1" aria-label={closeLabel}></button>
        <dl class="article-popover-body article-info-list">
          {items.map(([label, value]) => (
            <Fragment>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    );
  }
};
