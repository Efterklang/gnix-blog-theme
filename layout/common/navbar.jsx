const { Component, cacheComponent } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");

// 导航只有两部分：左侧 burger 展开的菜单胶囊，右侧常驻的目录 / 偏好 / 搜索玻璃胶囊。
// 图标一律 lucide，颜色用标题色（见 default.css 的 .navbar-item）
class Navbar extends Component {
  render() {
    const { menu, preferencesTitle, searchTitle, menuTitle, tocTitle, isSearchEnabled } = this.props;

    return (
      <nav class="navbar">
        <button type="button" class="navbar-burger glass glass-button" popovertarget="navbar-menu" aria-label={menuTitle} data-glass-lens>
          <Icon name="layout-grid" size={20} />
        </button>
        <div class="navbar-menu" id="navbar-menu" popover="auto">
          {Object.keys(menu).length ? (
            <div class="navbar-start">
              {Object.keys(menu).map((name) => {
                const item = menu[name];
                return (
                  <a class="navbar-item glass glass-button" href={item.url} data-glass-lens>
                    {name}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
        <div class="navbar-actions glass" data-glass-lens>
          <button type="button" class="navbar-item navbar-toc glass-button" popovertarget="toc-body" title={tocTitle} aria-label={tocTitle}>
            <Icon name="list-tree" size={20} />
          </button>
          <button
            type="button"
            id="preferences-link"
            class="navbar-item glass glass-button"
            title={preferencesTitle}
            aria-label={preferencesTitle}
            popovertarget="preference-popup"
            data-glass-lens
          >
            <Icon name="type" size={20} />
          </button>
          {isSearchEnabled ? (
            <button type="button" class="navbar-item search glass glass-button" popovertarget="command-palette" title={searchTitle} aria-label={searchTitle} data-glass-lens>
              <Icon name="search" size={20} />
            </button>
          ) : null}
        </div>
      </nav>
    );
  }
}

module.exports = cacheComponent(Navbar, "common.navbar", (props) => {
  const { config, helper, page } = props;
  const { __ } = helper;
  const { navbar } = config;
  const langKey = helper.language_key(page);

  const menu = {};
  if (navbar?.menu) {
    Object.keys(navbar.menu).forEach((name) => {
      const rawValue = navbar.menu[name];
      menu[name] = { url: helper.localized_url_for(rawValue, langKey) };
    });
  }

  return {
    menu,
    preferencesTitle: __("preferences.title"),
    searchTitle: __("palette.title"),
    menuTitle: __("navbar.menu"),
    tocTitle: __("article.toc"),
    isSearchEnabled: !!config.search,
  };
});
