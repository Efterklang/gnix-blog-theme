/**
 * Article media component, used in article lists such as archive page and recent posts widget
 */
const { Component } = require("inferno");
const { format, parseISO, isValid } = require("date-fns");

module.exports = class extends Component {
  render() {
    const { url, title, date, categories } = this.props;
    // Formatted like May.15
    let formattedDate = "";
    const d = typeof date === "string" ? parseISO(date) : date;
    formattedDate = isValid(d) ? format(d, "MMM.dd") : "";
    const categoryTags = [];
    categories.forEach((category, i) => {
      categoryTags.push(<a href={category.url}>{category.name}</a>);
      if (i < categories.length - 1) {
        categoryTags.push("/");
      }
    });

    return (
      <article class="archive-item">
        <div>
          <p class="article-meta">
            <span>{formattedDate}</span>
            {categoryTags.length ? <span>{categoryTags}</span> : null}
          </p>
          <p class="title" style="font-size: 1em;">
            <a href={url}>{title}</a>
          </p>
        </div>
      </article>
    );
  }
};
