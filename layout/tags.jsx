const { Component, cacheComponent } = require("../include/util/common");

class Tags extends Component {
  render() {
    const { tags, showCount } = this.props;

    return (
      <div class="card widget" data-type="tags">
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
