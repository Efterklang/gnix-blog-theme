const { Component, Fragment, cacheComponent } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");

// 一条顶栏，所有尺寸同一份标记：站名在左、右侧一排图标钮（偏好 · 搜索 · 菜单）。顶栏吸顶常驻，不让位。
// 栏目清单由站名钮打开；首页只渲染这份菜单，由巨字站名触发。
// 文章页的站名后多一节「语境」：站名 / 阅读进度与当前位置（首屏是 Contents，正文显示当前小节名称，
// 由 article.js 更新），点它弹出文章目录 #article-panel（见 common/article.jsx）；
// ≥1280 目录常驻在页面左栏，点它收起 / 展开目录
// 站名缩写：每个词按大写字母切段，只留各段首字母，词与词之间一个点——「GnixAij Oag」→「GA.O」。
// 其余字母包在 .navbar-brand__tail 里收成零宽，悬停（或聚焦）时展开回全名
function renderBrand(brand) {
  const words = String(brand).trim().split(/\s+/).filter(Boolean);
  const nodes = [];
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) {
      nodes.push(
        <span class="navbar-brand__dot" aria-hidden="true">
          <span>.</span>
        </span>,
      );
      nodes.push(
        <span class="navbar-brand__tail">
          <span>{"\u00a0"}</span>
        </span>,
      );
    }
    for (const part of word.match(/[A-Z\u00c0-\u024f]?[^A-Z]*/g).filter(Boolean)) {
      nodes.push(part[0]);
      if (part.length > 1)
        nodes.push(
          <span class="navbar-brand__tail">
            <span>{part.slice(1)}</span>
          </span>,
        );
    }
  });
  return nodes;
}

class Navbar extends Component {
  render() {
    const { menu, menuOnly, brand, brandUrl, preferencesTitle, searchTitle, menuTitle, closeTitle, isSearchEnabled, context } = this.props;
    const names = Object.keys(menu);

    return (
      <Fragment>
        {menuOnly ? null : (
          <nav class="navbar">
            <div class="navbar-material" aria-hidden="true"></div>
            <div class="navbar-lead">
              {/* 站名就是菜单钮：点开整屏的栏目页（#navbar-menu）；没有栏目时退回到首页链接 */}
              {names.length ? (
                <button
                  type="button"
                  class="navbar-brand"
                  data-navbar-menu-trigger
                  popovertarget="navbar-menu"
                  aria-haspopup="dialog"
                  aria-controls="navbar-menu"
                  aria-expanded="false"
                  aria-label={`${brand} · ${menuTitle}`}
                >
                  {renderBrand(brand)}
                </button>
              ) : (
                <a class="navbar-brand" href={brandUrl} aria-label={brand}>
                  {renderBrand(brand)}
                </a>
              )}
              {context ? (
                <Fragment>
                  <span class="navbar-lead__sep" aria-hidden="true">
                    /
                  </span>
                  <button
                    type="button"
                    class="navbar-context"
                    popovertarget="article-panel"
                    aria-haspopup="dialog"
                    aria-controls="article-panel"
                    aria-expanded="false"
                    title={`${context.label} (Ctrl+T)`}
                  >
                    <span class="navbar-context__progress">0%</span>
                    <span class="navbar-context__label" data-default={context.label}>
                      {context.label}
                    </span>
                  </button>
                </Fragment>
              ) : null}
            </div>
            <div class="navbar-actions">
              <button type="button" id="preferences-link" class="navbar-item" title={preferencesTitle} aria-label={preferencesTitle} popovertarget="preference-popup">
                <Icon name="type" size={18} />
              </button>
              {isSearchEnabled ? (
                <button type="button" class="navbar-item search" popovertarget="command-palette" title={searchTitle} aria-label={searchTitle}>
                  <Icon name="search" size={18} />
                </button>
              ) : null}
            </div>
          </nav>
        )}
        {/* 栏目页：整屏的一张纸。顶上一行与顶栏同高——左边站名全称、右边关闭钮；下面是大字栏目名，不编号，
            一律墨色、悬停变灰；外链带一枚斜箭头 */}
        {names.length ? (
          <div class="navbar-menu" id="navbar-menu" popover="auto" role="dialog" aria-label={menuTitle}>
            <div class="navbar-menu__bar">
              <a class="navbar-menu__brand" href={brandUrl}>
                {brand}
              </a>
              <button type="button" class="navbar-item navbar-menu__close" popovertarget="navbar-menu" popovertargetaction="hide" title={closeTitle} aria-label={closeTitle}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <nav class="navbar-menu__links" aria-label={menuTitle}>
              {names.map((name, index) => {
                const item = menu[name];
                const external = /^https?:\/\//.test(item.url);
                return (
                  <a
                    class={`navbar-menu__item${item.active ? " is-active" : ""}`}
                    style={`--i:${index}`}
                    href={item.url}
                    aria-current={item.active ? "page" : null}
                    target={external ? "_blank" : null}
                    rel={external ? "noopener" : null}
                  >
                    <span class="navbar-menu__name">{name}</span>
                    {external ? <Icon name="arrow-up-right" size={28} /> : null}
                  </a>
                );
              })}
            </nav>
          </div>
        ) : null}
      </Fragment>
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

  // 文章页（post）的语境节：只在有目录（有标题，或加密、解密后才有标题）时出现；文章信息已在首屏
  const isPost = page.layout === "post";
  const hasHeadings = /<h[1-6][^>]*\sid=/.test(page.content || "") || !!page.encrypt;
  const context = isPost && hasHeadings ? { label: "Contents" } : null;

  return {
    menu,
    menuOnly: !!props.menuOnly,
    context,
    // 站名字标：首页标题
    brand: config.home?.title || "",
    brandUrl: helper.localized_url_for("/", langKey),
    preferencesTitle: __("preferences.title"),
    searchTitle: __("palette.title"),
    menuTitle: __("navbar.menu"),
    closeTitle: __("article.close"),
    isSearchEnabled: !!config.search,
  };
});
