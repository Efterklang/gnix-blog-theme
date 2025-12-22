const { Component, cacheComponent } = require("../include/util/common");

class Categories extends Component {
  renderList(categories, showCount) {
    return categories.map((category) => (
      <li>
        <a
          class={`level is-mobile${category.isCurrent ? " is-active" : ""}`}
          href={category.url}
        >
          <span class="level-start">
            <span class="level-item">{category.name}</span>
          </span>
          {showCount ? (
            <span class="level-end">
              <span class="level-item" style="font-family: monospace">
                {category.count}
              </span>
            </span>
          ) : null}
        </a>
        {category.children.length ? (
          <ul>{this.renderList(category.children, false)}</ul>
        ) : null}
      </li>
    ));
  }

  render() {
    const { showCount, categories } = this.props;
    const categoriesListCSS = `
    .card-content a {
      padding: 0.5em 0.75em;
      color: var(--text);
    }
    .card-content a.level:hover {
      background-color: var(--base);
    }
    .card-content li ul {
      border-left: 1px solid var(--surface0);
      margin: 0.75em;
      padding-left: 0.75em;
    }`;
    return (
      <div class="card widget" data-type="categories">
        <style>{categoriesListCSS}</style>
        <div class="card-content">
          <ul>{this.renderList(categories, showCount)}</ul>
        </div>
      </div>
    );
  }
}

Categories.Cacheable = cacheComponent(
  Categories,
  "widget.categories",
  (props) => {
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

    let depth = 0;
    try {
      depth = parseInt(props.depth, 10);
    } catch (_e) {}

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
  },
);

module.exports = class extends Component {
  render() {
    const { site, page, helper } = this.props;

    return <Categories.Cacheable site={site} page={page} helper={helper} />;
  }
};
