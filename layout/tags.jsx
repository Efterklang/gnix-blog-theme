const { Component, Fragment, cacheComponent } = require("../include/util/common");
const { filterByLanguage } = require("../include/util/i18n");

function toRoman(num) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [value, sym] of map) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out;
}

function getTagSize(count, maxCount) {
  const ratio = maxCount ? count / maxCount : 0;
  return `${(0.95 + ratio * 0.35).toFixed(3)}rem`;
}

class Tags extends Component {
  render() {
    const { cssUrl, tags, title, showCount } = this.props;

    return (
      <Fragment>
        <link rel="stylesheet" href={cssUrl} data-page-head />
        <main class="tags-page">
          <header class="tags-hero">
            <div>
              <p class="tags-eyebrow">
                <span>Topic Index</span>
                <span class="tags-hero__sep" aria-hidden="true">·</span>
                <span>{tags.length} {tags.length === 1 ? "topic" : "topics"}</span>
              </p>
              <h1>{title}</h1>
            </div>
            {tags.length > 0 && (
              <span class="tags-hero__roman" aria-hidden="true">{toRoman(tags.length)}</span>
            )}
          </header>

          <nav class="tags-index" aria-label={title}>
            {tags.map((tag) => (
              <a key={tag.url} class="tags-index__item" href={tag.url} style={`--tag-size:${tag.size};`}>
                <span class="tags-index__name">{tag.name}</span>
                {showCount ? <span class="tags-index__count">{tag.count}</span> : null}
              </a>
            ))}
          </nav>
        </main>
      </Fragment>
    );
  }
}

Tags.Cacheable = cacheComponent(Tags, "page.tags", (props) => {
  const { helper, page, widget = {} } = props;
  const { order_by = "name", amount, show_count = true } = widget;
  let tags = props.tags || page?.tags || props.site.tags;
  const { _p } = helper;

  if (!tags?.length) {
    return null;
  }

  if (Array.isArray(tags)) {
    tags = tags
      .filter((tag) => tag.length)
      .sort((a, b) => {
        const aValue = a[order_by] || a.name || "";
        const bValue = b[order_by] || b.name || "";
        return String(aValue).localeCompare(String(bValue));
      });
  } else {
    tags = tags.sort(order_by).filter((tag) => tag.length);
  }
  if (amount) {
    tags = typeof tags.limit === "function" ? tags.limit(amount) : tags.slice(0, amount);
  }

  const langKey = helper.language_key(page);
  const mappedTags = tags.map((tag) => {
    const posts = helper.is_i18n_enabled() ? filterByLanguage(tag.posts, langKey, props.config || {}, helper) : tag.posts;
    return {
      name: tag.name,
      count: posts.length,
      url: helper.localized_tag_url(tag, langKey),
    };
  });
  const maxCount = mappedTags.reduce((max, tag) => Math.max(max, tag.count), 0);

  return {
    cssUrl: helper.url_for("/css/tags.css"),
    showCount: show_count,
    title: _p("common.tag", Infinity),
    tags: mappedTags.map((tag) => ({
      ...tag,
      size: getTagSize(tag.count, maxCount),
    })),
  };
});

module.exports = class extends Component {
  render() {
    const { config, page, site, helper } = this.props;

    return <Tags.Cacheable config={config} page={page} site={site} helper={helper} />;
  }
};
