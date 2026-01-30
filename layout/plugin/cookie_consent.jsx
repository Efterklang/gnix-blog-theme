const { Component, cacheComponent } = require("../../include/util/common");

class CookieConsent extends Component {
  render() {
    const { head, text, jsUrl, cssUrl } = this.props;
    const { type, theme, position, policyLink } = this.props;
    const { message, dismiss, allow, deny, link, policy } = text;

    const js = `window.addEventListener("load", () => {
      window.cookieconsent.initialise({
        type: ${JSON.stringify(type)},
        theme: ${JSON.stringify(theme)},
        static: ${JSON.stringify(this.props.static)},
        position: ${JSON.stringify(position)},
        content: {
          message: ${JSON.stringify(message)},
          dismiss: ${JSON.stringify(dismiss)},
          allow: ${JSON.stringify(allow)},
          deny: ${JSON.stringify(deny)},
          link: ${JSON.stringify(link)},
          policy: ${JSON.stringify(policy)},
          href: ${JSON.stringify(policyLink)},
        },
        palette: {
          popup: {
            background: "var(--base)",
            text: "var(--text)"
          },
          button: {
            background: "var(--blue)"
          },
        },
      });
    });`;

    if (head) {
      return <link rel="preload" href={cssUrl} as="style" onload="this.onload=null;this.rel='stylesheet'" />;
    }
    return (
      <>
        <script src={jsUrl} defer={true} onLoad={js}></script>
        {/* <script dangerouslySetInnerHTML={{ __html: js }}></script> */}
      </>
    );
  }
}

CookieConsent.Cacheable = cacheComponent(CookieConsent, "plugin.cookieconsent", (props) => {
  const { head, plugin, helper } = props;
  const { type = "info", theme = "edgeless", position = "bottom-left", policyLink = "https://www.cookiesandyou.com/" } = plugin;

  return {
    head,
    type,
    theme,
    position,
    policyLink,
    static: plugin.static || false,
    text: {
      message: helper.__("plugin.cookie_consent.message"),
      dismiss: helper.__("plugin.cookie_consent.dismiss"),
      allow: helper.__("plugin.cookie_consent.allow"),
      deny: helper.__("plugin.cookie_consent.deny"),
      link: helper.__("plugin.cookie_consent.link"),
      policy: helper.__("plugin.cookie_consent.policy"),
    },
    cssUrl: helper.cdn("cookieconsent", "3.1.1", "build/cookieconsent.min.css"),
    jsUrl: helper.cdn("cookieconsent", "3.1.1", "build/cookieconsent.min.js"),
  };
});

module.exports = CookieConsent;
