const { Component, cacheComponent } = require("../include/util/common");

class Categories extends Component {
  renderList(categories, showCount) {
    return categories.map((category) => (
      <li class="category-list-item">
        <a class={`category-link`} href={category.url}>
          <span>{category.name}</span>
          {showCount ? <span class="category-count">{category.count}</span> : null}
        </a>
        {category.children.length ? (
          <ul class="category-sublist">{this.renderList(category.children, false)}</ul>
        ) : null}
      </li>
    ));
  }

  render() {
    const { showCount, categories } = this.props;
    const categoriesCSS = `
      .category-list-item {
        list-style: none;
        margin-bottom: 0.4em;
      }
      .category-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6em 0.8em;
        border-radius: 8px;
        color: var(--text);
        background-color: transparent;
        text-decoration: none;
        transition: all 0.2s ease;
        font-weight: 400;
      }
      .category-link:hover {
        background-color: var(--base) !important;
        transform: translateX(4px);
      }
      .category-link span:first-child {
        flex: 1;
      }
      .category-count {
        padding: 0.15em 0.6em;
        border-radius: 10px;
        min-width: 1.5em;
        text-align: center;
      }
      .category-sublist {
        margin-left: 0.8em;
        padding-left: 0.8em;
        border-left: 2px solid var(--surface0);
        margin-top: 0.4em;
        list-style: none;
      }
    `;

    return (
      <div class="card widget" data-type="categories">
        <style>{categoriesCSS}</style>
        <div class="card-content" style="padding: 1.2em;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            {this.renderList(categories, showCount)}
          </ul>
        </div>
      </div>
    );
  }
}

Categories.Cacheable = cacheComponent(Categories, "widget.categories", (props) => {
  const { page, helper, widget = {} } = props;
  const {
    categories = props.site.categories,
    orderBy = "name",
    order = 1,
    showCurrent = false,
    showCount = true,
  } = widget;
  const { url_for, _p } = helper;

  if (!categories || !categories.length) {
    return null;
  }

  const depth = parseInt(props.depth, 10);

  function prepareQuery(parent) {
    const query = {};

    if (parent) {
      query.parent = parent;
    } else {
      query.parent = { $exists: false };
    }

    return categories
      .find(query)
      .sort(orderBy, order)
      .filter((cat) => cat.length);
  }

  function hierarchicalList(level, parent) {
    return prepareQuery(parent).map((cat, _) => {
      let children = [];
      if (!depth || level + 1 < depth) {
        children = hierarchicalList(level + 1, cat._id);
      }

      let isCurrent = false;
      if (showCurrent && page) {
        for (let j = 0; j < cat.length; j++) {
          const post = cat.posts.data[j];
          if (post && post._id === page._id) {
            isCurrent = true;
            break;
          }
        }
        // special case: category page
        isCurrent = isCurrent || page.base?.startsWith(cat.path);
      }

      return {
        children,
        isCurrent,
        name: cat.name,
        count: cat.length,
        url: url_for(cat.path),
      };
    });
  }

  return {
    showCount,
    categories: hierarchicalList(0),
    title: _p("common.category", Infinity),
  };
});

module.exports = class extends Component {
  render() {
    const { site, page, helper } = this.props;

    return <Categories.Cacheable site={site} page={page} helper={helper} />;
  }
};
