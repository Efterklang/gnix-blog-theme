const { Component } = require("../include/util/common");
const Head = require("./common/head");
const Navbar = require("./common/navbar");
const Footer = require("./common/footer");
const Scripts = require("./common/scripts");
const Search = require("./common/search");
const ThemeSelector = require("./common/theme_selector");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULT_SETTINGS } = require("../include/util/article_font");

function buildLangSwitchScript(page, config, helper) {
  const lswitch = Navbar.getLanguageSwitch(page, config, helper);

  const langKey = helper.language_key(page);
  const menu = {};
  if (config.navbar?.menu) {
    Object.keys(config.navbar.menu).forEach((name) => {
      const rawValue = config.navbar.menu[name];
      menu[name] = { url: helper.localized_url_for(rawValue, langKey) };
    });
  }
  const siteUrl = helper.localized_url_for("/", langKey);

  const payload = lswitch
    ? JSON.stringify({
        mode: lswitch.mode,
        url: lswitch.url || "",
        locale: lswitch.locale,
        title: lswitch.title,
        unavailableMessage: lswitch.unavailableMessage,
      })
    : "null";

  return `<script data-swup-reload-script>
    (function() {
      var d = ${payload};
      var el = document.getElementById('language-switch');
      if (el && d) {
        var icon = ${JSON.stringify(Navbar.LANGUAGE_SWITCH_ICON_HTML)};
        var n;
        if (d.mode === 'missing') {
          n = document.createElement('button');
          n.type = 'button';
          n.disabled = true;
          n.title = d.unavailableMessage;
          n.setAttribute('aria-label', d.unavailableMessage);
        } else {
          n = document.createElement('a');
          n.href = d.url;
          n.title = d.title;
          n.setAttribute('aria-label', d.title);
          n.setAttribute('lang', d.locale);
          n.setAttribute('hreflang', d.locale);
        }
        n.id = 'language-switch';
        n.className = 'navbar-item';
        n.dataset.mode = d.mode;
        n.innerHTML = icon;
        el.replaceWith(n);
      }
      var menu = ${JSON.stringify(menu)};
      Object.keys(menu).forEach(function(name) {
        var link = document.querySelector('a[data-navbar-menu="' + name + '"]');
        if (!link) return;
        link.href = menu[name].url;
      });
      var logo = document.getElementById('navbar-logo-link');
      if (logo) logo.href = ${JSON.stringify(siteUrl)};
    })();
  </script>`;
}

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, body } = this.props;

    const language = helper.language_locale ? helper.language_locale(page) : page.lang || page.language || config.language || "en";
    const langSwitchScript = buildLangSwitchScript(page, config, helper);

    return (
      <html
        lang={language ? language : ""}
        data-article-font-size={ARTICLE_FONT_DEFAULT_SETTINGS.size}
        data-article-font-family={ARTICLE_FONT_DEFAULT_SETTINGS.type}
        data-article-line-height={String(ARTICLE_FONT_DEFAULT_SETTINGS.lineHeight)}
        data-article-font-weight={ARTICLE_FONT_DEFAULT_SETTINGS.weight}
      >
        <Head site={site} config={config} helper={helper} page={page} />
        <body>
          <Navbar site={site} config={config} helper={helper} page={page} />
          <ThemeSelector />
          <section class="section">
            <div class="main-content transition-fade" id="swup" dangerouslySetInnerHTML={{ __html: body + langSwitchScript }}></div>
          </section>
          <Footer site={site} config={config} helper={helper} page={page} />
          <Scripts site={site} config={config} helper={helper} page={page} />
          <Search config={config} helper={helper} />
        </body>
      </html>
    );
  }
};
