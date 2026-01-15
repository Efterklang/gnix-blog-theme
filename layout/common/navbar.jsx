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
  // start with '<' means svg icon
  if (link.icon === "travellings") {
    return (
      <svg viewBox="0 0 448 512" role="img" aria-label="Travellings Icon">
        <path
          fill="var(--text)"
          d="M96 0C43 0 0 43 0 96v256c0 48 35.2 87.7 81.1 94.9l-46 46c-7 7-2 19.1 7.9 19.1h39.7c8.5 0 16.6-3.4 22.6-9.4L160 448h128l54.6 54.6c6 6 14.1 9.4 22.6 9.4h39.7c10 0 15-12.1 7.9-19.1l-46-46c46-7.1 81.1-46.9 81.1-94.9V96c0-53-43-96-96-96zM64 128c0-17.7 14.3-32 32-32h80c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32zm208-32h80c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32h-80c-17.7 0-32-14.3-32-32v-96c0-17.7 14.3-32 32-32M64 352a32 32 0 1 1 64 0a32 32 0 1 1-64 0m288-32a32 32 0 1 1 0 64a32 32 0 1 1 0-64"
        ></path>
      </svg>
    );
  }
  return <iconify-icon icon={link.icon}></iconify-icon>;
};

class Navbar extends Component {
  render() {
    const { siteUrl, menu, links, showSearch, searchTitle } = this.props;

    return (
      <nav class="navbar navbar-main" onclick="handleNavbarClick(event);">
        <div class="navbar-container">
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
              <button
                type="button"
                class="navbar-item theme-selector-trigger"
                title="Choose Theme"
                onclick="window.openThemeModal?.()"
              >
                <svg viewBox="0 0 14 14" role="img" aria-label="Theme Selector">
                  <g fill="none">
                    <path
                      fill="var(--red)"
                      d="M14 12.5v-3A1.5 1.5 0 0 0 12.5 8H3a3 3 0 1 0 0 6h9.5a1.5 1.5 0 0 0 1.5-1.5"
                    ></path>
                    <path
                      fill="var(--blue)"
                      d="M12.339 3.783L10.218 1.66a1.5 1.5 0 0 0-2.122 0L.88 8.88a3 3 0 0 0 4.24 4.24l7.218-7.217a1.5 1.5 0 0 0 0-2.121"
                    ></path>
                    <path
                      fill="var(--green)"
                      d="M4.5 0h-3A1.5 1.5 0 0 0 0 1.5V11a3 3 0 0 0 6 0V1.5A1.5 1.5 0 0 0 4.5 0"
                    ></path>
                    <path
                      fill="var(--base)"
                      fill-rule="evenodd"
                      d="M1.395 3.375a.625.625 0 1 0 0 1.25h3.21a.625.625 0 1 0 0-1.25zm0 4.5a.625.625 0 1 0 0 1.25h3.21a.625.625 0 1 0 0-1.25z"
                      clip-rule="evenodd"
                    ></path>
                  </g>
                </svg>
              </button>
              {Object.keys(links).length ? (
                <Fragment>
                  {Object.keys(links).map((name) => {
                    const link = links[name];
                    return (
                      <a
                        class="navbar-item"
                        target="_blank"
                        rel="noopener"
                        title={name}
                        href={link.url}
                      >
                        {renderLinkIcon(link)}
                      </a>
                    );
                  })}
                </Fragment>
              ) : null}
              {showSearch ? (
                <button
                  type="button"
                  class="navbar-item search"
                  title={searchTitle}
                >
                  <svg viewBox="0 0 14 14" role="img" aria-label="Search Icon">
                    <g fill="none" fill-rule="evenodd" clip-rule="evenodd">
                      <path
                        fill="var(--text)"
                        d="M.5.125a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h4.756A4.5 4.5 0 0 1 5 9.625c0-1.271.527-2.42 1.375-3.238v-4.96A2 2 0 0 0 4.5.126zm7.125 1.303v4.105a4.5 4.5 0 0 1 6.347 3.584H14V.625a.5.5 0 0 0-.5-.5h-4a2 2 0 0 0-1.875 1.303"
                      />
                      <path
                        fill="var(--blue)"
                        d="M7.75 9.625a1.75 1.75 0 1 1 3.5 0a1.75 1.75 0 0 1-3.5 0m1.75-3.25a3.25 3.25 0 1 0 1.706 6.017l1.263 1.263a.75.75 0 0 0 1.06-1.06l-1.262-1.264A3.25 3.25 0 0 0 9.5 6.375"
                      />
                    </g>
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            class="navbar-burger"
            aria-label="menu"
            aria-expanded="false"
          >
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
  const { logo, title, navbar, widgets, search } = config;

  const hasTocWidget =
    Array.isArray(widgets) && widgets.find((widget) => widget.type === "toc");
  const showToc =
    (config.toc === true || page.toc) &&
    hasTocWidget &&
    ["page", "post"].includes(page.layout);

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
    showSearch: search?.type,
    searchTitle: __("search.search"),
  };
});
