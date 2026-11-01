const { Component, cacheComponent } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");

// 一条顶栏，所有尺寸同一份标记：站名在左、右侧一排图标钮（目录 · 偏好 · 搜索 · 菜单）。
// 栏目清单收进菜单钮的小卡片里；目录钮只在窄屏出现（桌面的目录在文章左侧的工具栏，见 toc.jsx）。
// 顶栏不吸顶、不画线，随页面滚走
class Navbar extends Component {
  render() {
    const { menu, brand, brandUrl, preferencesTitle, searchTitle, menuTitle, isSearchEnabled } = this.props;
    const names = Object.keys(menu);

    return (
      <nav class="navbar">
        <a class="navbar-brand" href={brandUrl}>
          {brand}
        </a>
        <div class="navbar-actions">
          <button type="button" class="navbar-item navbar-toc" popovertarget="toc-body" title="TOC" aria-label="TOC">
            <Icon name="table-of-contents" size={18} />
          </button>
          <button type="button" id="preferences-link" class="navbar-item" title={preferencesTitle} aria-label={preferencesTitle} popovertarget="preference-popup">
            <Icon name="type" size={18} />
          </button>
          {isSearchEnabled ? (
            <button type="button" class="navbar-item search" popovertarget="command-palette" title={searchTitle} aria-label={searchTitle}>
              <Icon name="search" size={18} />
            </button>
          ) : null}
          {names.length ? (
            <button type="button" class="navbar-item navbar-burger" popovertarget="navbar-menu" title={menuTitle} aria-label={menuTitle}>
              <Icon name="menu" size={18} />
            </button>
          ) : null}
        </div>
        {names.length ? (
          <div class="navbar-menu surface" id="navbar-menu" popover="auto">
            {names.map((name, index) => {
              const item = menu[name];
              return (
                <a class={`navbar-menu__item${item.active ? " is-active" : ""}`} href={item.url} aria-current={item.active ? "page" : null}>
                  {/* 坐标式编号（01、02…）：菜单项在导航里的位次 */}
                  <span class="navbar-menu__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span class="navbar-menu__name">{name}</span>
                </a>
              );
            })}
          </div>
        ) : null}
      </nav>
    );
  }
}

module.exports = cacheComponent(Navbar, "common.navbar", (props) => {
  const { config, helper, page } = props;
  const { __ } = helper;
  const { navbar } = config;
  const langKey = helper.language_key(page);

  // 当前栏目：页路径去掉 index.html 后与菜单项比对。首页只在根路径点亮，
  // 其余按前缀匹配；外链（travellings）不是路径，永远不会亮
  const currentPath = `/${(page.path || "").replace(/index\.html$/, "")}`;
  const menu = {};
  if (navbar?.menu) {
    Object.keys(navbar.menu).forEach((name) => {
      const rawValue = navbar.menu[name];
      const url = helper.localized_url_for(rawValue, langKey);
      const active = rawValue === "/" ? currentPath === url : currentPath === url || currentPath.startsWith(url);
      menu[name] = { url, active };
    });
  }

  return {
    menu,
    // 站名字标：首页标题
    brand: config.home?.title || "",
    brandUrl: helper.localized_url_for("/", langKey),
    preferencesTitle: __("preferences.title"),
    searchTitle: __("palette.title"),
    menuTitle: __("navbar.menu"),
    isSearchEnabled: !!config.search,
  };
});
