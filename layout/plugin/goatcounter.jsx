const { Component, Fragment, cacheComponent } = require("../../include/util/common");

class Goatcounter extends Component {
  render() {
    const { url } = this.props;

    return (
      <Fragment>
        <script data-goatcounter={url} async src="//gc.zgo.at/count.js"></script>
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
