const { Component } = require("../include/util/common");
const Head = require("./common/head");
const Navbar = require("./common/navbar");
const Footer = require("./common/footer");
const Scripts = require("./common/scripts");
const CommandPalette = require("./common/command_palette");
const PreferencesPopup = require("./common/preferences_popup");
const Sunny = require("./common/sunny");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULT_SETTINGS } = require("../include/util/article_font");
const { DEFAULT_SETTINGS: GLASS_DEFAULT_SETTINGS } = require("../include/util/glass");

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, body } = this.props;

    const language = helper.language_locale ? helper.language_locale(page) : page.lang || page.language || config.language || "en";

    return (
      <html
        lang={language ? language : ""}
        data-article-font-size={ARTICLE_FONT_DEFAULT_SETTINGS.size}
        data-article-font-family={ARTICLE_FONT_DEFAULT_SETTINGS.type}
        data-article-font-weight={ARTICLE_FONT_DEFAULT_SETTINGS.weight}
        data-article-width={ARTICLE_FONT_DEFAULT_SETTINGS.width}
        data-article-spacing={ARTICLE_FONT_DEFAULT_SETTINGS.spacing}
        data-glass={GLASS_DEFAULT_SETTINGS.enabled ? "on" : "off"}
        data-glass-press-effect={GLASS_DEFAULT_SETTINGS.press ? "on" : "off"}
      >
        <Head site={site} config={config} helper={helper} page={page} />
        <body>
          <Sunny site={site} config={config} helper={helper} page={page} />
          <Navbar site={site} config={config} helper={helper} page={page} />
          <div class="main-content" dangerouslySetInnerHTML={{ __html: body }}></div>
          <Footer site={site} config={config} helper={helper} page={page} />
          <PreferencesPopup site={site} config={config} helper={helper} page={page} />
          <Scripts site={site} config={config} helper={helper} page={page} />
          <CommandPalette site={site} config={config} helper={helper} page={page} />
        </body>
      </html>
    );
  }
};
