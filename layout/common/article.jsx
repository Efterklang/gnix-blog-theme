const { Component, Fragment, formatMonthDay, getWordCount, isValidDate } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const Comment = require("./comment");
const ArticleCover = require("./article_cover");
const Toc = require("./toc");

// 文末「Send me an email」的收件人（主题只给一个人用，与首页 home.jsx 同一个地址）
const AUTHOR_EMAIL = "gjx@linux.do";

// 首屏日期：「缩写月 + 日, 年」，与归档、Info 同一个格式
function formatDate(value, helper) {
  const parsed = new Date(helper.date_xml(value));
  return isValidDate(parsed) ? `${formatMonthDay(parsed)}, ${parsed.getFullYear()}` : helper.date(value, "MMM DD, YYYY");
}

// 标题的「排版长度」：中日韩字按两个拉丁字母计。长标题在首屏降一档字号，免得大字排成四五行
function titleMeasure(title) {
  let width = 0;
  for (const char of String(title || "")) width += /[⺀-鿿가-힯豈-﫿＀-￯]/.test(char) ? 2 : 1;
  return width;
}

// 文章页的网格（见 article.css 的 .article）：
//
//   余白 │ index 11rem │ gap │ text（阅读栏，居中）│ gap │ margin 11rem │ 余白
//
// - text：阅读栏，居中。封面、日期栏、标题、导语、正文与文末都落在它的左右两缘之内——整页只有这一条阅读轴；
// - index / margin：左右两条同宽的边栏，让阅读栏居中；宽表格与 side note 伸进右手的 margin。
// <1280 两条边栏收起，只剩 text 一栏。
// 首屏：有封面 6:6（左标题、导语、规格行，右封面）；无封面 8:4（左大标题与导语，右一张规格表）。
// 目录 #article-panel：<1280 由顶栏语境钮弹出；≥1280 常驻在左手 index 栏，随页面吸顶
module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const { url_for } = helper;

    const cover = page.cover ? url_for(page.cover) : null;
    const hasComment = config.comment && typeof config.comment.type === "string";
    const closeLabel = helper.__("article.close");
    const isPost = page.layout !== "page";

    const tocContent = isPost ? helper.toc(page.content, { class: "toc", list_number: false }) : "";
    const hasToc = !!tocContent || !!page.encrypt;

    // 首屏底部的规格行：发布日期、阅读时长、标签——读者落座前要看的几项；有封面时排在标题下，无封面时是右侧的规格表
    const tags = typeof page.tags?.toArray === "function" ? page.tags.toArray().filter((tag) => tag?.name) : [];
    const wordCount = getWordCount(page._content);
    const readMinutes = Math.ceil(wordCount / 200);
    const wordLabel = wordCount >= 1000 ? `${(wordCount / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(wordCount);
    const tagLink = (tag) => (
      <a key={tag.name} rel="tag" href={helper.localized_tag_url(tag, helper.language_key(page))}>
        {tag.name}
      </a>
    );
    const dateline = isPost
      ? [
          page.date ? ["Published", <time datetime={helper.date_xml(page.date)}>{formatDate(page.date, helper)}</time>] : null,
          readMinutes > 0 ? ["Reading", `${readMinutes} min · ${wordLabel}`] : null,
          tags.length
            ? [
                "Tags",
                <span class="article-dateline__tags">
                  {tags.slice(0, 3).map(tagLink)}
                  {/* 超过 3 个的标签折叠进「+N」，点开就地展开 */}
                  {tags.length > 3 ? (
                    <details class="article-dateline__more">
                      <summary aria-label={`${tags.length - 3} more tags`}>+{tags.length - 3}</summary>
                      {tags.slice(3).map(tagLink)}
                    </details>
                  ) : null}
                </span>,
              ]
            : null,
        ].filter(Boolean)
      : [];

    const datelineList = dateline.length ? (
      <dl class="article-dateline">
        {dateline.map(([label, value]) => (
          <div key={label} class="article-dateline__item">
            <dt class="article-dateline__label">{label}</dt>
            <dd class="article-dateline__value">{value}</dd>
          </div>
        ))}
      </dl>
    ) : null;

    const articleClass = [
      "article",
      isPost ? "article--post" : "article--page",
      cover ? "article--cover" : "article--plain",
      titleMeasure(page.title) > 44 ? "article--long-title" : null,
      "direction" in page ? page.direction : null,
    ]
      .filter(Boolean)
      .join(" ");

    const mailto = `mailto:${AUTHOR_EMAIL}?subject=${encodeURIComponent(`Re: ${page.title || ""}`)}`;

    return (
      <Fragment>
        <article class={articleClass}>
          <header class="article-opening">
            <div class="article-opening__main">
              {page.title !== "" ? <h1 class="article-title">{page.title}</h1> : null}
              {page.excerpt && <div class="article-lead" dangerouslySetInnerHTML={{ __html: page.excerpt }}></div>}
              {cover ? datelineList : null}
            </div>
            {cover ? (
              <div class="article-opening__side">
                <ArticleCover page={page} cover={cover} helper={helper} />
              </div>
            ) : dateline.length ? (
              <div class="article-opening__side article-opening__sheet">
                <span class="article-opening__sheet-label">Metadata</span>
                {datelineList}
              </div>
            ) : null}
          </header>

          {/* 目录：<1280 是顶栏语境钮弹出的卡片；≥1280 常驻在左手 index 栏 */}
          {isPost && hasToc && (
            <aside id="article-panel" popover="auto" class="article-panel popup-card" aria-label="Table of contents">
              <span class="article-panel__label">Contents</span>
              <div class="article-panel__page">
                <Toc content={tocContent} encrypt={page.encrypt} />
              </div>
            </aside>
          )}

          <div id="article-content" class="content" dangerouslySetInnerHTML={{ __html: page.content }}></div>

          {isPost && (
            <footer class="article-end">
              <p class="article-end__thanks">Thanks for reading.</p>
              <nav class="article-end__actions" aria-label="After reading">
                {hasComment && (
                  <button type="button" class="article-end__action article-end__action--comments" popovertarget="article-comment-popover">
                    Comments
                    <Icon name="arrow-right" size={12} />
                  </button>
                )}
                <a class="article-end__action article-end__action--email" href={mailto}>
                  Send me an email
                  <Icon name="arrow-up-right" size={12} />
                </a>
                <button type="button" class="article-end__action article-end__action--top" data-action="scroll-top">
                  Go to top
                  <Icon name="arrow-up" size={12} />
                </button>
              </nav>
            </footer>
          )}
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
