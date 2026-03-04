const { Component, cacheComponent } = require("../../include/util/common");

class CookieConsent extends Component {
  // https://www.osano.com/cookieconsent/documentation/javascript-api/
  render() {
    const { head, text, jsUrl, cssUrl } = this.props;
    const { type, theme, position, policyLink } = this.props;
    const { message, dismiss, allow, deny, link, policy } = text;

    if (head) {
      return <link rel="preload" href={cssUrl} as="style" onload="this.onload=null;this.rel='stylesheet'" />;
    }
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function() {
            var s = document.createElement('script');
            s.src = ${JSON.stringify(jsUrl)};
            s.defer = true;
            s.onload = function() {
              window.cookieconsent.initialise(${JSON.stringify({
                type,
                theme,
                static: this.props.static,
                position,
                content: {
                  message,
                  dismiss,
                  allow,
                  deny,
                  link,
                  policy,
                  href: policyLink,
                },
                palette: {
                  popup: {
                    background: "var(--base)",
                    text: "var(--text)",
                  },
                  button: {
                    background: "var(--lavender)",
                    text: "var(--base)",
                  },
                },
              })});
            };
            document.body.appendChild(s);
          })();
        `,
        }}
      />
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
