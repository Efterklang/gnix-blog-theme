const { Component } = require("../include/util/common");
const Head = require("./common/head");
const Navbar = require("./common/navbar");
const Footer = require("./common/footer");
const Scripts = require("./common/scripts");
const Search = require("./common/search");
const ThemeSelector = require("./common/theme_selector");

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, body } = this.props;

    const language = page.lang || page.language || config.language || "en";

    return (
      <html lang={language ? language : ""}>
        <Head site={site} config={config} helper={helper} page={page} />
        <body>
          <Navbar config={config} helper={helper} page={page} />
          <ThemeSelector />
          <section class="section">
            <div
              class="main-content"
              dangerouslySetInnerHTML={{ __html: body }}
            ></div>
          </section>
          <Footer site={site} config={config} helper={helper} />
          <Scripts site={site} config={config} helper={helper} page={page} />
          <Search config={config} helper={helper} />
        </body>
      </html>
    );
  }
};
