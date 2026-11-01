/**
 * Archive list row: title flush left, date flush right. The row also carries the data the
 * inspector panel shows on hover (cover URL, excerpt, tags, read time) in a hidden block —
 * source/js/archive.js copies it into the panel. Rendered as an <li> inside <ol class="archive-list">.
 */
const { Component, formatMonthDay, isValidDate, parseISO } = require("../../include/util/common");

function formatDate(date, dateXml) {
  if (date) return date;

  const parsedDate = parseISO(dateXml);
  return isValidDate(parsedDate) ? formatMonthDay(parsedDate) : "";
}

module.exports = class extends Component {
  render() {
    const { url, title, date, dateXml, excerpt, readTime, cover, tags = [] } = this.props;
    const formattedDate = formatDate(date, dateXml);
    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];

    return (
      <li class="archive-item" data-cover={cover || null}>
        <a class="archive-title" href={url}>
          {/* 两列：标题占满剩余宽度、贴左缘，日期贴右缘。长标题折行时日期留在首行 */}
          <span class="archive-title__text">{title}</span>
          <time class="archive-title__date" dateTime={dateXml || null}>
            {formattedDate}
          </time>
        </a>
        <div class="archive-item__data" hidden>
          {excerpt ? <div class="archive-item__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></div> : null}
          {tagList.map((tag) => (
            <span key={tag} class="archive-item__tag">
              {tag}
            </span>
          ))}
          {readTime ? <span class="archive-item__read">{readTime}</span> : null}
        </div>
      </li>
    );
  }
};
