const { Component, Fragment, cacheComponent } = require("../../include/util/common");

class Goatcounter extends Component {
  render() {
    const { url } = this.props;

    const js = `
      (window.__gnixPrerender?.runWhenActivated || function(callback) { callback(); })(function() {
        var script = document.createElement("script");
        script.async = true;
        script.src = "//gc.zgo.at/count.js";
        script.dataset.goatcounter = ${JSON.stringify(url)};
        document.head.appendChild(script);
      });
    `;

    return (
      <Fragment>
        <script dangerouslySetInnerHTML={{ __html: js }}></script>
      </Fragment>
    );
  }
}

Goatcounter.Cacheable = cacheComponent(Goatcounter, "plugin.goatcounter", (props) => {
  const { head, plugin } = props;
  if (!head || !plugin.url) {
    return null;
  }
  return {
    url: plugin.url,
  };
});

module.exports = Goatcounter;
