const { Component, cacheComponent } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");

// 桌面与移动的导航形态差异大，拆成两个 nav、由媒体查询整只切换（见 responsive.css）：
// 桌面：链接行在左、动作胶囊在右；移动：底部拇指工具条（burger + 目录 / 偏好 / 搜索）。
// 两边的动作按钮共用同一批弹层：popovertarget 指向的 id 都在弹层上，按钮可以有多份；
// 偏好按钮的 id 只保留在桌面一份，避免重复 id
class Navbar extends Component {
  render() {
    const { menu, preferencesTitle, searchTitle, menuTitle, tocTitle, isSearchEnabled } = this.props;
    const names = Object.keys(menu);

    const linkNodes = names.length ? (
      <div class="navbar-start">
        {names.map((name) => {
          const item = menu[name];
          return (
            <a class="navbar-item glass glass-button" href={item.url} data-glass-lens>
              {name}
            </a>
          );
        })}
      </div>
    ) : null;

    const actionNodes = (withPreferenceId) => (
      <div class="navbar-actions glass" data-glass-lens>
        <button type="button" class="navbar-item navbar-toc glass-button" popovertarget="toc-body" title={tocTitle} aria-label={tocTitle}>
          <Icon name="list-tree" size={20} />
        </button>
        <button
          type="button"
          id={withPreferenceId ? "preferences-link" : undefined}
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
    );

    return (
      <>
        <nav class="navbar navbar-desktop">
          <div class="navbar-menu">{linkNodes}</div>
          {actionNodes(true)}
        </nav>
        <nav class="navbar navbar-mobile">
          <button type="button" class="navbar-burger glass glass-button" popovertarget="navbar-menu" aria-label={menuTitle} data-glass-lens>
            <Icon name="layout-grid" size={20} />
          </button>
          <div class="navbar-menu" id="navbar-menu" popover="auto">
            {linkNodes}
          </div>
          {actionNodes(false)}
        </nav>
      </>
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
