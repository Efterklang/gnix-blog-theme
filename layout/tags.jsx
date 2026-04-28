const { Component, Fragment, cacheComponent } = require("../include/util/common");

function getTagSize(count, maxCount) {
  const ratio = maxCount ? count / maxCount : 0;
  return `${(0.95 + ratio * 0.35).toFixed(3)}rem`;
}

class Tags extends Component {
  render() {
    const { cssUrl, tags, title, showCount, totalPosts, topTag } = this.props;

    return (
      <Fragment>
        <link rel="stylesheet" href={cssUrl} data-page-head />
        <main class="tags-page">
          <header class="tags-hero">
            <div>
              <p class="tags-eyebrow">Topic Index</p>
              <h1>{title}</h1>
              <p class="tags-hero__summary">
                {tags.length ? `Browse ${tags.length} topics across ${totalPosts} tagged ${totalPosts === 1 ? "post" : "posts"}.` : "No tagged posts are available yet."}
              </p>
            </div>
            <dl class="tags-stats" aria-label="Tags summary">
              <div>
                <dt>Tags</dt>
                <dd>{tags.length}</dd>
              </div>
              <div>
                <dt>Posts</dt>
                <dd>{totalPosts}</dd>
              </div>
              <div>
                <dt>Largest</dt>
                <dd>{topTag ? topTag.name : "None"}</dd>
              </div>
            </dl>
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
  const { helper, widget = {} } = props;
  const { order_by = "name", amount, show_count = true } = widget;
  let tags = props.tags || props.site.tags;
  const { url_for, _p } = helper;

  if (!tags?.length) {
    return null;
  }

  tags = tags.sort(order_by).filter((tag) => tag.length);
  if (amount) {
    tags = tags.limit(amount);
  }

  const mappedTags = tags.map((tag) => ({
    name: tag.name,
    count: tag.length,
    url: url_for(tag.path),
  }));
  const maxCount = mappedTags.reduce((max, tag) => Math.max(max, tag.count), 0);
  const totalPosts = mappedTags.reduce((total, tag) => total + tag.count, 0);
  const topTag = mappedTags.reduce((top, tag) => (tag.count > top.count ? tag : top), mappedTags[0]);

  return {
    cssUrl: url_for("/css/tags.css"),
    showCount: show_count,
    title: _p("common.tag", Infinity),
    totalPosts,
    topTag,
    tags: mappedTags.map((tag) => ({
      ...tag,
      size: getTagSize(tag.count, maxCount),
    })),
  };
});

module.exports = class extends Component {
  render() {
    const { site, helper } = this.props;

    return <Tags.Cacheable site={site} helper={helper} />;
  }
};
