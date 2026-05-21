/**
 * Article media component, used in article lists such as archive page and recent posts widget
 */
const { Component, dateFormatters, isValidDate, parseISO } = require("../../include/util/common");

function formatDate(date, dateXml) {
  if (date) return date;

  const parsedDate = parseISO(dateXml);
  return isValidDate(parsedDate) ? dateFormatters.shortDay.format(parsedDate) : "";
}

module.exports = class extends Component {
  render() {
    const { url, title, date, dateXml, excerpt, cover, readTime } = this.props;
    const formattedDate = formatDate(date, dateXml);
    const hasPreview = excerpt || cover || readTime;

    return (
      <article
        class={hasPreview ? "archive-item has-preview" : "archive-item"}
        data-cover={cover || null}
        data-read-time={readTime || null}
      >
        <div>
          <p class="article-meta">
            <time dateTime={dateXml || null}>{formattedDate}</time>
          </p>
          <a class="archive-title" href={url}>
            {title}
          </a>
        </div>
        {excerpt && (
          <template class="archive-item__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></template>
        )}
      </article>
    );
  }
};
