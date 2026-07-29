/**
 * Article media component, used in article lists such as archive page and recent posts widget
 */
const { Component, formatMonthDay, isValidDate, parseISO } = require("../../include/util/common");

function formatDate(date, dateXml) {
  if (date) return date;

  const parsedDate = parseISO(dateXml);
  return isValidDate(parsedDate) ? formatMonthDay(parsedDate) : "";
}

module.exports = class extends Component {
  render() {
    const { url, title, date, dateXml, excerpt, readTime, order } = this.props;
    const formattedDate = formatDate(date, dateXml);

    return (
      <article class="archive-item" style={typeof order === "number" ? `--i:${order}` : null}>
        <a class="archive-title" href={url}>
          <time class="archive-title__date" dateTime={dateXml || null}>
            {formattedDate}
          </time>
          {title}
        </a>
        <div class="archive-popup">
          <p class="archive-popup__eyebrow">
            <time class="archive-popup__date" dateTime={dateXml || null}>
              {formattedDate}
            </time>
            {readTime && <span class="archive-popup__read">{readTime}</span>}
          </p>
          {excerpt && <div class="archive-popup__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></div>}
        </div>
      </article>
    );
  }
};
