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
    const { url, title, date, dateXml, excerpt, cover, tags, readTime } = this.props;
    const formattedDate = formatDate(date, dateXml);
    const hasPreview = excerpt || cover || readTime || (tags && tags.length);
    const tagsJson = tags && tags.length ? JSON.stringify(tags) : null;

    return (
      <article
        class={hasPreview ? "archive-item has-preview" : "archive-item"}
        data-archive-item={hasPreview ? "" : null}
        data-cover={cover || null}
        data-tags={tagsJson}
        data-read-time={readTime || null}
      >
        <div>
          <p class="article-meta">
            <time dateTime={dateXml || null}>{formattedDate}</time>
          </p>
          <a class="archive-title" href={url}>
            {title}
          </a>
          {hasPreview && (
            <button
              type="button"
              class="archive-item__info"
              aria-label="Preview"
              aria-haspopup="dialog"
              aria-expanded="false"
              tabIndex={-1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
          )}
        </div>
        {excerpt && (
          <template class="archive-item__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></template>
        )}
      </article>
    );
  }
};
