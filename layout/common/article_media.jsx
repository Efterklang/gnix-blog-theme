/**
 * Archive list row: title flush left, date flush right, preview popup above the row.
 * Rendered as an <li> — it belongs inside the archive's <ol class="archive-list">.
 */
const { Component, formatMonthDay, isValidDate, parseISO } = require("../../include/util/common");

function formatDate(date, dateXml) {
  if (date) return date;

  const parsedDate = parseISO(dateXml);
  return isValidDate(parsedDate) ? formatMonthDay(parsedDate) : "";
}

module.exports = class extends Component {
  render() {
    const { url, title, date, dateXml, excerpt, readTime, tags = [] } = this.props;
    const formattedDate = formatDate(date, dateXml);
    // 摘要可以只有一个词（front-matter 的 excerpt 写「随笔」也算），浮层靠下面这行标签 + 时长撑住
    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];

    return (
      <li class="archive-item">
        <a class="archive-title" href={url}>
          {/* 两列：标题占满剩余宽度、贴左缘，日期贴右缘。长标题折行时日期留在首行，
              全页因此有两条笔直的竖轴 */}
          <span class="archive-title__text">{title}</span>
          <time class="archive-title__date" dateTime={dateXml || null}>
            {formattedDate}
          </time>
        </a>
        {excerpt || tagList.length || readTime ? (
          /* 预览是给鼠标的顺带好处：静态 inert，不拦标题点击，也不进无障碍树（摘要与时长在文章页都读得到） */
          <div class="archive-popup" inert>
            {excerpt ? <div class="archive-popup__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></div> : null}
            {tagList.length || readTime ? (
              <p class="archive-popup__meta">
                {tagList.map((tag) => (
                  <span key={tag} class="archive-popup__tag">
                    {tag}
                  </span>
                ))}
                {readTime ? <span class="archive-popup__read">{readTime}</span> : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  }
};
