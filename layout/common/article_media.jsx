/**
 * Article media component, used in article lists such as archive page and recent posts widget
 */
const { Component, dateFormatters, parseISO } = require("../../include/util/common");

module.exports = class extends Component {
  render() {
    const { url, title, date } = this.props;
    const formattedDate = dateFormatters.shortDay.format(parseISO(date));

    return (
      <article class="archive-item">
        <div>
          <p class="article-meta">
            <span>{formattedDate}</span>
          </p>
          <a class="archive-title" href={url}>
            {title}
          </a>
        </div>
      </article>
    );
  }
};
