const { Component, Fragment, cacheComponent } = require("../../include/util/common");
const { getI18nKey, getLanguage, getLanguageKeys, getPageLanguageKey, isExternalUrl, isI18nEnabled, toArray } = require("../../include/util/i18n");

function isActiveMenuLink(menuUrl, pageUrl) {
  const menuPath = sanitizeLink(menuUrl);
  const pagePath = sanitizeLink(pageUrl);
  if (menuPath === pagePath) return true;
  if (!menuPath) return false;
  return pagePath.startsWith(`${menuPath}/`);
}

function sanitizeLink(url) {
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

function collectDocuments(site) {
  return [...toArray(site?.posts), ...toArray(site?.pages)];
}

function getDocumentUrl(helper, document) {
  const href = document?.path || document?.permalink;
  if (!href) return null;
  return isExternalUrl(href) ? href : helper.url_for(href);
}

function getTargetLanguageKey(config, currentLanguageKey) {
  const languageKeys = getLanguageKeys(config);
  if (currentLanguageKey === "en" && languageKeys.includes("cn")) return "cn";
  if (currentLanguageKey !== "en" && languageKeys.includes("en")) return "en";
  return languageKeys.find((key) => key !== currentLanguageKey) || null;
}

function getTargetLanguageDisplayName(currentLanguageKey, targetLanguageKey, targetLanguage) {
  if (currentLanguageKey === "en" && targetLanguageKey === "cn") return "Chinese";
  if (currentLanguageKey !== "en" && targetLanguageKey === "en") return "英文";
  return targetLanguage.label;
}

function getLanguageSwitch(site, page, config, helper) {
  if (!isI18nEnabled(config)) return null;

  const languageKeys = getLanguageKeys(config);
  if (languageKeys.length < 2) return null;

  const currentLanguageKey = getPageLanguageKey(page, config);
  const targetLanguageKey = getTargetLanguageKey(config, currentLanguageKey);
  const targetLanguage = getLanguage(config, targetLanguageKey);
  if (!targetLanguage || targetLanguageKey === currentLanguageKey) return null;
  const targetLanguageName = getTargetLanguageDisplayName(currentLanguageKey, targetLanguageKey, targetLanguage);

  const pageKey = getI18nKey(page);
  let url = null;

  if (pageKey) {
    const alternate = collectDocuments(site).find((item) => getI18nKey(item) === pageKey && getPageLanguageKey(item, config) === targetLanguageKey);
    url = getDocumentUrl(helper, alternate);
  }

  const isDocumentPage = ["page", "post"].includes(page?.layout);
  const title = helper.__("navbar.language_switch", targetLanguageName);

  if (!url && isDocumentPage) {
    return {
      mode: "missing",
      homeUrl: helper.localized_url_for("/", targetLanguageKey),
      locale: targetLanguage.locale,
      label: targetLanguageName,
      title,
      unavailableTitle: helper.__("navbar.language_unavailable_title"),
      unavailableMessage: helper.__("navbar.language_unavailable", targetLanguageName),
      stayLabel: helper.__("navbar.language_stay"),
      homeLabel: helper.__("navbar.language_home"),
      closeLabel: helper.__("navbar.language_close"),
    };
  }

  if (!url) {
    url = helper.localized_url_for(page?.path || "/", targetLanguageKey);
  }

  return {
    mode: "link",
    url,
    locale: targetLanguage.locale,
    label: targetLanguageName,
    title,
  };
}

class Navbar extends Component {
  render() {
    const { siteUrl, menu, links, languageSwitch, searchTitle } = this.props;

    const languageIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <title>translate_2_line</title>
        <g id="translate_2_line" fill="currentColor">
          <path d="M12.87 15.07c-1.01-.28-1.93-.79-2.72-1.48l-.16-.14-.19.18a9.96 9.96 0 0 1-3.27 1.98 1 1 0 0 1-.71-1.87 7.96 7.96 0 0 0 2.58-1.55 9.5 9.5 0 0 1-1.54-2.69 1 1 0 1 1 1.88-.69c.29.79.71 1.52 1.24 2.16A7.95 7.95 0 0 0 11.66 8H5a1 1 0 1 1 0-2h4V4a1 1 0 1 1 2 0v2h4a1 1 0 1 1 0 2h-1.29a9.95 9.95 0 0 1-2.27 4.44l.05.04c.55.38 1.18.67 1.86.86a1 1 0 1 1-.48 1.94z"></path>
          <path d="M17.5 10a1 1 0 0 1 .93.63l3.5 8.75a1 1 0 0 1-1.86.74L19.42 18h-3.84l-.65 2.12a1 1 0 0 1-1.86-.74l3.5-8.75A1 1 0 0 1 17.5 10m-1.15 6h2.3l-1.15-3.03z"></path>
        </g>
      </svg>
    );

    return (
      <Fragment>
        <nav class="navbar navbar-main">
          <div class="navbar-container" onclick="toggleNav(event)">
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
                      <a class={navbar_item_class} href={item.url} aria-current={item.active ? "page" : null}>
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
                {languageSwitch?.mode === "link" ? (
                  <a class="navbar-item" href={languageSwitch.url} title={languageSwitch.title} aria-label={languageSwitch.title} lang={languageSwitch.locale} hreflang={languageSwitch.locale}>
                    {languageIcon}
                  </a>
                ) : null}
                {languageSwitch?.mode === "missing" ? (
                  <button type="button" class="navbar-item" title={languageSwitch.title} aria-label={languageSwitch.title} lang={languageSwitch.locale} popovertarget="language-switch-popover">
                    {languageIcon}
                  </button>
                ) : null}
                <button type="button" class="navbar-item" title="Choose Theme" popovertarget="theme-selector-popover">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <title>brightness_fill</title>
                    <g id="brightness_fill" fill="currentColor">
                      <path d="M12 18.5a1.5 1.5 0 0 1 1.493 1.356L13.5 20v1a1.5 1.5 0 0 1-2.993.144L10.5 21v-1a1.5 1.5 0 0 1 1.5-1.5m4.596-1.904a1.5 1.5 0 0 1 2.008-.103l.114.103.707.707a1.5 1.5 0 0 1-2.008 2.225l-.114-.103-.707-.707a1.5 1.5 0 0 1 0-2.122m-11.314 0a1.5 1.5 0 0 1 2.225 2.008l-.103.114-.707.707a1.5 1.5 0 0 1-2.225-2.008l.103-.114zM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12m0 3a3 3 0 0 0-.176 5.995L12 15zm-8 1.5a1.5 1.5 0 0 1 .144 2.993L4 13.5H3a1.5 1.5 0 0 1-.144-2.993L3 10.5zm17 0a1.5 1.5 0 0 1 .144 2.993L21 13.5h-1a1.5 1.5 0 0 1-.144-2.993L20 10.5zM4.575 4.575a1.5 1.5 0 0 1 2.008-.103l.114.103.707.707a1.5 1.5 0 0 1-2.008 2.225l-.114-.103-.707-.707a1.5 1.5 0 0 1 0-2.122m12.728 0a1.5 1.5 0 0 1 2.225 2.008l-.103.114-.707.707a1.5 1.5 0 0 1-2.225-2.008l.103-.114zM12 1.5a1.5 1.5 0 0 1 1.493 1.356L13.5 3v1a1.5 1.5 0 0 1-2.993.144L10.5 4V3A1.5 1.5 0 0 1 12 1.5"></path>
                    </g>
                  </svg>
                </button>
                <button type="button" class="navbar-item search" popovertarget="searchbox" title={searchTitle}>
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
        {languageSwitch?.mode === "missing" ? (
          <div id="language-switch-popover" class="article-popover language-switch-popover" popover="auto" tabindex="-1">
            <div class="article-popover-header">
              <h3>{languageSwitch.unavailableTitle}</h3>
              <button type="button" class="article-popover-close" popovertarget="language-switch-popover" popovertargetaction="hide" aria-label={languageSwitch.closeLabel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label={languageSwitch.closeLabel}>
                  <title>{languageSwitch.closeLabel}</title>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div class="article-popover-body language-switch-popover-body">
              <p>{languageSwitch.unavailableMessage}</p>
              <div class="language-switch-popover-actions">
                <button type="button" class="language-switch-popover-action" popovertarget="language-switch-popover" popovertargetaction="hide">
                  {languageSwitch.stayLabel}
                </button>
                <a class="language-switch-popover-action is-primary" href={languageSwitch.homeUrl}>
                  {languageSwitch.homeLabel}
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </Fragment>
    );
  }
}

module.exports = cacheComponent(Navbar, "common.navbar", (props) => {
  const { site, config, helper, page } = props;
  const { url_for, _p, __ } = helper;
  const { logo, title, navbar, widgets } = config;
  const langKey = helper.language_key(page);

  const hasTocWidget = Array.isArray(widgets) && widgets.find((widget) => widget.type === "toc");
  const showToc = (config.toc === true || page.toc) && hasTocWidget && ["page", "post"].includes(page.layout);

  const menu = {};
  if (navbar?.menu) {
    const pageUrl = typeof page.path !== "undefined" ? url_for(page.path) : "";
    Object.keys(navbar.menu).forEach((name) => {
      const url = helper.localized_url_for(navbar.menu[name], langKey);
      const active = isActiveMenuLink(url, pageUrl);
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
    siteUrl: helper.localized_url_for("/", langKey),
    siteTitle: title,
    menu,
    links,
    languageSwitch: getLanguageSwitch(site, page, config, helper),
    showToc,
    tocTitle: _p("widget.catalogue", Infinity),
    searchTitle: __("search.search"),
  };
});
