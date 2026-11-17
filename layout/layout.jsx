const { Component } = require("../include/util/common");
const Head = require("./common/head");
const Navbar = require("./common/navbar");
const Footer = require("./common/footer");
const Scripts = require("./common/scripts");
const CommandPalette = require("./common/command_palette");
const PreferencesPopup = require("./common/preferences_popup");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULT_SETTINGS } = require("../include/util/article_font");

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, body } = this.props;

    const language = helper.language_locale ? helper.language_locale(page) : page.lang || page.language || config.language || "en";
    // 首页是一张落地扉页，不挂顶栏；页名在跨页过渡里落进其它页的站名（见 default.css @view-transition）
    const isHome = page.home === true;

    return (
      <html
        lang={language ? language : ""}
        data-article-font-size={ARTICLE_FONT_DEFAULT_SETTINGS.size}
        data-article-font-family={ARTICLE_FONT_DEFAULT_SETTINGS.type}
        data-article-font-weight={ARTICLE_FONT_DEFAULT_SETTINGS.weight}
        data-article-width={ARTICLE_FONT_DEFAULT_SETTINGS.width}
      >
        <Head site={site} config={config} helper={helper} page={page} />
        <body>
          <a class="skip-link" href="#main-content">
            {String(language).toLowerCase().startsWith("zh") ? "跳到主要内容" : "Skip to content"}
          </a>
          <Navbar site={site} config={config} helper={helper} page={page} menuOnly={isHome} />
          <div class="main-content" id="main-content" tabindex="-1" dangerouslySetInnerHTML={{ __html: body }}></div>
          <Footer site={site} config={config} helper={helper} page={page} />
          <PreferencesPopup site={site} config={config} helper={helper} page={page} />
          <Scripts site={site} config={config} helper={helper} page={page} />
          <CommandPalette site={site} config={config} helper={helper} page={page} />
        </body>
      </html>
    );
  }
};
