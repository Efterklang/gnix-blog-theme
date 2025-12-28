const { Component, cacheComponent } = require("../include/util/common");

class Tags extends Component {
  render() {
    const { tags, showCount } = this.props;

    const inlineCSS = `
    .tags {
      font-family: var(--font-monospace);
      flex-wrap: wrap;
      justify-content: flex-start;
      padding: 0.5rem 0.5rem;
      display: inline-flex;
      align-items: center;
      transition: all 0.3s ease;
    }

    .tags:hover {
      transform: translateY(-2px);
    }

    .tag {
      padding: 0 0.75em;
      transition: all 0.3s ease;
      border-style: solid;
      align-items: center;
      border-radius: 5px;
      display: inline-flex;
      font-size: 0.75rem;
      height: 2em;
      white-space: nowrap;
    }

    .tag:first-child {
      border-width: 1px 0 1px 1px;
      border-radius: 5px 0 0 5px;
    }

    .tag:first-child::before {
      content: "#";
      opacity: 0.7;
      margin-right: 0.25em;
    }

    .tag:last-child {
      border-width: 1px 1px 1px 0;
      border-radius: 0 5px 5px 0;
    }
    `;

    return (
      <div class="card widget" data-type="tags">
        <style>{inlineCSS}</style>
        <div class="card-content">
          <div class="menu">
            {tags.map((tag) => (
              <a class="tags" href={tag.url}>
                <span class="tag">{tag.name}</span>
                {showCount ? <span class="tag">{tag.count}</span> : null}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

Tags.Cacheable = cacheComponent(Tags, "widget.tags", (props) => {
  const { helper, widget = {} } = props;
  const { order_by = "name", amount, show_count = true } = widget;
  let tags = props.tags || props.site.tags;
  const { url_for, _p } = helper;

  if (!tags || !tags.length) {
    return null;
  }

  tags = tags.sort(order_by).filter((tag) => tag.length);
  if (amount) {
    tags = tags.limit(amount);
  }

  return {
    showCount: show_count,
    title: _p("common.tag", Infinity),
    tags: tags.map((tag) => ({
      name: tag.name,
      count: tag.length,
      url: url_for(tag.path),
    })),
  };
});
module.exports = class extends Component {
  render() {
    const { site, helper } = this.props;

    return <Tags.Cacheable site={site} helper={helper} />;
  }
};
