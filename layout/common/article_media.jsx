/**
 * Article media component, used in article lists such as archive page and recent posts widget
 */
const { Component } = require("inferno");
const { format, parseISO } = require("date-fns");

module.exports = class extends Component {
  render() {
    const { url, title, date } = this.props;
    // Formatted like May.15
    const formattedDate = format(parseISO(date), "MMM dd");

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
