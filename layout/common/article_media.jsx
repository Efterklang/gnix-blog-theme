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
    const { url, title, date, dateXml, excerpt, readTime, order, encrypted = false, encryptedLabel = "This article is encrypted" } = this.props;
    const formattedDate = formatDate(date, dateXml);

    return (
      <article class="archive-item" style={typeof order === "number" ? `--i:${order}` : null}>
        <a class="archive-title" href={url}>
          <time class="archive-title__date" dateTime={dateXml || null}>
            {formattedDate}
          </time>
          <span class="archive-title__content">
            <span class="archive-title__text">{title}</span>
            {encrypted && (
              <svg
                class="archive-title__lock"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label={encryptedLabel}
                focusable="false"
              >
                <title>{encryptedLabel}</title>
                <rect x="5" y="11" width="14" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </span>
        </a>
        {excerpt && (
          <div class="archive-popup" inert>
            <div class="archive-popup__excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}></div>
            {readTime && <p class="archive-popup__read">{readTime}</p>}
          </div>
        )}
      </article>
    );
  }
};
