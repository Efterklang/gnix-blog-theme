const { Component, cacheComponent } = require("../../include/util/common");

class GoogleAnalytics extends Component {
  render() {
    const { trackingId, head } = this.props;

    if (head) {
      const js = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${trackingId}');`;
      return <script dangerouslySetInnerHTML={{ __html: js }}></script>;
    }

    return (
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${trackingId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        }}
      ></noscript>
    );
  }
}

GoogleAnalytics.Cacheable = cacheComponent(
  GoogleAnalytics,
  "plugin.google_tag_manager",
  (props) => {
    const { head, plugin } = props;
    if (!plugin || !plugin.tracking_id) {
      return null;
    }
    return {
      trackingId: plugin.tracking_id,
      head: Boolean(head),
    };
  },
);

module.exports = GoogleAnalytics;
