const { Component, Fragment, formatMonthDay, getWordCount, isValidDate } = require("../../include/util/common");

// 规格表里默认露出的标签数，其余折进「+N」
const VISIBLE_TAGS = 4;

function formatDate(value, helper) {
  const parsed = new Date(helper.date_xml(value));
  return isValidDate(parsed) ? `${formatMonthDay(parsed)}, ${parsed.getFullYear()}` : helper.date(value, "MMM DD, YYYY");
}

// 文章信息：嵌在正文开头左侧的一张规格表（标签在上、取值在下），不再是弹层。
// 标签一律英文——它们是站内的微型标签，不随页面语言切换
module.exports = class extends Component {
  render() {
    const { page, config, helper, hasComment, commentsLabel } = this.props;
    const { article } = config;
    const markdownSourceUrl = page.markdown_path ? helper.url_for(page.markdown_path) : null;

    const wordCount = getWordCount(page._content);
    const readTime = Math.ceil(wordCount / 200); // 假设每分钟阅读 200 字

    const items = [];
    if (page.date) items.push(["Published", formatDate(page.date, helper)]);
    if (page.updated && String(page.updated) !== String(page.date)) items.push(["Updated", formatDate(page.updated, helper)]);
    if (wordCount > 0) items.push(["Reading", `${readTime} min · ${wordCount} words`]);
    if (page.author || config.author) items.push(["Author", page.author || config.author]);
    if (page.tags?.length) {
      // 标签横排；超过 VISIBLE_TAGS 个先折起，点「+N」展开（article.js）
      const tags = page.tags.map((tag) => (
        <a key={tag.name} rel="tag" href={helper.localized_tag_url(tag, helper.language_key(page))}>
          {tag.name}
        </a>
      ));
      const hidden = tags.length - VISIBLE_TAGS;
      items.push([
        "Tags",
        <span class="article-info__list">
          {tags.slice(0, VISIBLE_TAGS)}
          {hidden > 0 && (
            <Fragment>
              <span class="article-info__more" hidden>
                {tags.slice(VISIBLE_TAGS)}
              </span>
              <button type="button" class="article-info__expand" aria-expanded="false" aria-label={`Show ${hidden} more tags`}>
                +{hidden}
              </button>
            </Fragment>
          )}
        </span>,
      ]);
    }
    if (page.location) items.push(["Location", page.location]);
    if (article?.licenses && Object.keys(article.licenses).length > 0) {
      items.push([
        "License",
        <span class="article-info__list">
          {Object.keys(article.licenses).map((name) => (
            <a key={name} href={article.licenses[name]} target="_blank" rel="noopener">
              {name}
            </a>
          ))}
        </span>,
      ]);
    }
    if (markdownSourceUrl) {
      items.push([
        "Source",
        <a href={markdownSourceUrl} target="_blank" rel="noopener" type="text/markdown; charset=utf-8">
          Markdown
        </a>,
      ]);
    }
    items.push(["Views", <span id="busuanzi_page_pv">-</span>]);
    if (hasComment) {
      items.push([
        "Comments",
        <button type="button" class="article-info__action" popovertarget="article-comment-popover" aria-label={commentsLabel}>
          Open
        </button>,
      ]);
    }

    return (
      <dl class="article-info">
        {items.map(([label, value]) => (
          <div class="article-info__item">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
};
