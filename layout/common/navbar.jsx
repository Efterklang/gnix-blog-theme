const { Component, Fragment, cacheComponent } = require("../../include/util/common");

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
};

class Navbar extends Component {
  render() {
    const { siteUrl, menu, links, preferencesTitle, searchTitle, menuTitle, isSearchEnabled } = this.props;

    return (
      <Fragment>
        <nav class="navbar navbar-main">
          <div class="navbar-container">
            <button type="button" class="navbar-burger" popovertarget="navbar-menu" aria-label={menuTitle}>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
            </button>
            <a id="navbar-logo-link" href={siteUrl}>
              ga.o
            </a>
            <div class="navbar-menu" id="navbar-menu" popover="auto">
              {Object.keys(menu).length ? (
                <div class="navbar-start">
                  {Object.keys(menu).map((name) => {
                    const item = menu[name];
                    return (
                      <a class="navbar-item" href={item.url} data-navbar-menu={name}>
                        {name}
                      </a>
                    );
                  })}
                </div>
              ) : null}
              {Object.keys(links).length ? (
                <div class="navbar-end">
                  {Object.keys(links).map((name) => {
                    const link = links[name];
                    return (
                      <a class="navbar-item" target="_blank" rel="noopener" title={name} href={link.url}>
                        {renderLinkIcon(link)}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div class="navbar-actions">
              <button type="button" id="preferences-link" class="navbar-item" title={preferencesTitle} aria-label={preferencesTitle} data-preference-trigger>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <title>{preferencesTitle}</title>
                  <path d="M14 17H5" />
                  <path d="M19 7h-9" />
                  <circle cx="17" cy="17" r="3" />
                  <circle cx="7" cy="7" r="3" />
                </svg>
              </button>
              {isSearchEnabled ? (
                <button type="button" class="navbar-item search" popovertarget="searchbox" title={searchTitle} aria-label={searchTitle}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <title>{searchTitle}</title>
                    <path d="m21 21-4.34-4.34" />
                    <circle cx="11" cy="11" r="8" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </nav>
      </Fragment>
    );
  }
}

module.exports = cacheComponent(Navbar, "common.navbar", (props) => {
  const { config, helper, page } = props;
  const { url_for, __ } = helper;
  const { navbar } = config;
  const langKey = helper.language_key(page);

  const menu = {};
  if (navbar?.menu) {
    Object.keys(navbar.menu).forEach((name) => {
      const rawValue = navbar.menu[name];
      menu[name] = { url: helper.localized_url_for(rawValue, langKey) };
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
    siteUrl: helper.localized_url_for("/", langKey),
    menu,
    links,
    preferencesTitle: __("preferences.title"),
    searchTitle: __("search.search"),
    menuTitle: __("navbar.menu"),
    isSearchEnabled: !!config.search,
  };
});
