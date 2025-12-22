const { Component, cacheComponent } = require("../../include/util/common");

class Clarity extends Component {
  render() {
    const { trackingId } = this.props;

    const js = `(function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}; t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i; y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y); })(window, document, "clarity", "script", "${trackingId}");`;
    return <script dangerouslySetInnerHTML={{ __html: js }}></script>;
  }
}

Clarity.Cacheable = cacheComponent(Clarity, "plugin.clarity", (props) => {
  const { head, plugin } = props;
  if (!head || !plugin.tracking_id) {
    return null;
  }
  return {
    trackingId: plugin.tracking_id,
  };
});

module.exports = Clarity;
