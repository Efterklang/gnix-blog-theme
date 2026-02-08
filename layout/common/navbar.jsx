const { Component, Fragment, cacheComponent } = require("../../include/util/common");

function isSameLink(a, b) {
  function santize(url) {
    let paths = url
      .replace(/(^\w+:|^)\/\//, "")
      .split("#")[0]
      .split("/")
      .filter((p) => p.trim() !== "");
    if (paths.length > 0 && paths[paths.length - 1].trim() === "index.html") {
      paths = paths.slice(0, paths.length - 1);
    }
    return paths.join("/");
  }
  return santize(a) === santize(b);
}

const renderLinkIcon = (link) => {
  if (!link.icon) return null;
  if (link.icon === "travellings") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <title>train_4_line</title>
        <g id="train_4_line" fill="currentColor">
          <path d="M14.72 2a5 5 0 0 1 4.855 3.802l.049.217 1.4 7c.496 2.482-.929 4.83-3.14 5.663l-.21.073L19.6 20.2a1 1 0 0 1-1.095 1.669L18.4 21.8 14.667 19H9.333L5.6 21.8a1 1 0 0 1-1.296-1.518L4.4 20.2l1.926-1.445c-2.26-.735-3.768-3.031-3.39-5.503l.04-.233 1.4-7a5 5 0 0 1 4.68-4.014L9.28 2h5.442Zm0 2H9.28a3 3 0 0 0-2.943 2.412l-1.4 7A3 3 0 0 0 7.88 17h8.242a3 3 0 0 0 2.942-3.588l-1.4-7A3 3 0 0 0 14.72 4m-6.47 9.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m7.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M14.61 6a1.5 1.5 0 0 1 1.416 1.005l.039.131.75 3a1.5 1.5 0 0 1-1.324 1.858L15.36 12H8.64a1.5 1.5 0 0 1-1.481-1.735l.026-.129.75-3a1.5 1.5 0 0 1 1.319-1.13L9.39 6zm-.39 2H9.78l-.5 2h5.44z"></path>
        </g>
      </svg>
    );
  }
  return <iconify-icon icon={link.icon}></iconify-icon>;
};

class Navbar extends Component {
  render() {
    const { siteUrl, menu, links, searchTitle } = this.props;

    return (
      <nav class="navbar navbar-main">
        <div
          class="navbar-container"
          onclick="
            const burger = this.querySelector('.navbar-burger');
            const menu = this.querySelector('.navbar-menu');
            const target = event.target;

            if (target.closest('.navbar-burger')) {
              burger.classList.toggle('is-active');
              menu.classList.toggle('is-active');
            } else if (target.closest('.navbar-item')) { // 点击菜单项：自动关闭菜单
              burger.classList.remove('is-active');
              menu.classList.remove('is-active');
            }
          "
        >
          <a href={siteUrl} style={"font-family: homemade-apple; color: var(--text); display: flex; align-items: center; padding: 0 1em;"}>
            GnixAij
          </a>
          <div class="navbar-menu">
            {Object.keys(menu).length ? (
              <div class="navbar-start">
                {Object.keys(menu).map((name) => {
                  const item = menu[name];
                  const navbar_item_class = `navbar-item ${item.active ? "is-active" : ""}`;
                  return (
                    <a class={navbar_item_class} href={item.url}>
                      {name}
                    </a>
                  );
                })}
              </div>
            ) : null}
            <div class="navbar-end">
              {Object.keys(links).length ? (
                <Fragment>
                  {Object.keys(links).map((name) => {
                    const link = links[name];
                    return (
                      <a class="navbar-item" target="_blank" rel="noopener" title={name} href={link.url}>
                        {renderLinkIcon(link)}
                      </a>
                    );
                  })}
                </Fragment>
              ) : null}
              <button type="button" class="navbar-item" id="theme-selector-trigger" title="Choose Theme" onclick="window.openThemeModal?.()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <title>brightness_fill</title>
                  <g id="brightness_fill" fill="currentColor">
                    <path d="M12 18.5a1.5 1.5 0 0 1 1.493 1.356L13.5 20v1a1.5 1.5 0 0 1-2.993.144L10.5 21v-1a1.5 1.5 0 0 1 1.5-1.5m4.596-1.904a1.5 1.5 0 0 1 2.008-.103l.114.103.707.707a1.5 1.5 0 0 1-2.008 2.225l-.114-.103-.707-.707a1.5 1.5 0 0 1 0-2.122m-11.314 0a1.5 1.5 0 0 1 2.225 2.008l-.103.114-.707.707a1.5 1.5 0 0 1-2.225-2.008l.103-.114zM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12m0 3a3 3 0 0 0-.176 5.995L12 15zm-8 1.5a1.5 1.5 0 0 1 .144 2.993L4 13.5H3a1.5 1.5 0 0 1-.144-2.993L3 10.5zm17 0a1.5 1.5 0 0 1 .144 2.993L21 13.5h-1a1.5 1.5 0 0 1-.144-2.993L20 10.5zM4.575 4.575a1.5 1.5 0 0 1 2.008-.103l.114.103.707.707a1.5 1.5 0 0 1-2.008 2.225l-.114-.103-.707-.707a1.5 1.5 0 0 1 0-2.122m12.728 0a1.5 1.5 0 0 1 2.225 2.008l-.103.114-.707.707a1.5 1.5 0 0 1-2.225-2.008l.103-.114zM12 1.5a1.5 1.5 0 0 1 1.493 1.356L13.5 3v1a1.5 1.5 0 0 1-2.993.144L10.5 4V3A1.5 1.5 0 0 1 12 1.5"></path>
                  </g>
                </svg>
              </button>
              <button type="button" class="navbar-item search" title={searchTitle}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <title>search_line</title>
                  <g id="search_line" fill="currentColor">
                    <path d="M10.5 2a8.5 8.5 0 1 0 5.262 15.176l3.652 3.652a1 1 0 0 0 1.414-1.414l-3.652-3.652A8.5 8.5 0 0 0 10.5 2M4 10.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0"></path>
                  </g>
                </svg>
              </button>
            </div>
          </div>
          <button type="button" class="navbar-burger" aria-label="menu" aria-expanded="false">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>
      </nav>
    );
  }
}

module.exports = cacheComponent(Navbar, "common.navbar", (props) => {
  const { config, helper, page } = props;
  const { url_for, _p, __ } = helper;
  const { logo, title, navbar, widgets } = config;

  const hasTocWidget = Array.isArray(widgets) && widgets.find((widget) => widget.type === "toc");
  const showToc = (config.toc === true || page.toc) && hasTocWidget && ["page", "post"].includes(page.layout);

  const menu = {};
  if (navbar?.menu) {
    const pageUrl = typeof page.path !== "undefined" ? url_for(page.path) : "";
    Object.keys(navbar.menu).forEach((name) => {
      const url = url_for(navbar.menu[name]);
      const active = isSameLink(url, pageUrl);
      menu[name] = { url, active };
    });
  }

  const links = {};
  if (navbar?.links) {
    Object.keys(navbar.links).forEach((name) => {
      const link = navbar.links[name];
      links[name] = {
        url: url_for(typeof link === "string" ? link : link.url),
        icon: link.icon,
      };
    });
  }

  return {
    logo: url_for(logo),
    siteUrl: url_for("/"),
    siteTitle: title,
    menu,
    links,
    showToc,
    tocTitle: _p("widget.catalogue", Infinity),
    searchTitle: __("search.search"),
  };
});
