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
          {/* 两列：标题贴左缘占前六栏，日期落在第七栏；话题与时长只在检视面板里 */}
          <span class="archive-title__text">{title}</span>
          <time class="archive-title__date" dateTime={dateXml || null}>
            {formattedDate}
          </time>
        </a>
        <div class="archive-item__data" hidden>
          {excerpt ? <div class="archive-item__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></div> : null}
          {tagList.map((tag) => (
            <a key={tag.url} class="archive-item__tag" href={tag.url}>
              {tag.name}
            </a>
          ))}
          {readTime ? <span class="archive-item__read">{readTime}</span> : null}
        </div>
      </li>
    );
  }
};
