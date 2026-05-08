const { Component } = require("../include/util/common");
const Head = require("./common/head");
const Navbar = require("./common/navbar");
const Footer = require("./common/footer");
const Scripts = require("./common/scripts");
const Search = require("./common/search");
const ThemeSelector = require("./common/theme_selector");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULT_SETTINGS } = require("../include/util/article_font");

function buildLangSwitchScript(site, page, config, helper) {
  const lswitch = Navbar.getLanguageSwitch(site, page, config, helper);
  if (!lswitch) return "";

  const payload = JSON.stringify({
    mode: lswitch.mode,
    url: lswitch.url || "",
    locale: lswitch.locale,
    homeUrl: lswitch.homeUrl,
  });

  return `<script data-swup-reload-script>
    (function() {
      var d = ${payload};
      var l = document.getElementById('language-switch-link');
      var b = document.getElementById('language-switch-button');
      if (!l && !b) return;
      if (d.mode === 'link' && d.url) {
        if (l) { l.href = d.url; l.style.display = ''; l.setAttribute('lang', d.locale); l.setAttribute('hreflang', d.locale); }
        if (b) b.style.display = 'none';
      } else {
        if (l) l.style.display = 'none';
        if (b) { b.style.display = ''; b.setAttribute('lang', d.locale); }
        var h = document.getElementById('language-switch-home-link');
        if (h) h.href = d.homeUrl;
      }
    })();
  <\/script>`;
}

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, body } = this.props;

    const language = helper.language_locale ? helper.language_locale(page) : page.lang || page.language || config.language || "en";
    const langSwitchScript = buildLangSwitchScript(site, page, config, helper);

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
