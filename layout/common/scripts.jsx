const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");
const Swup = require("../plugin/swup");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        <Swup head={false} />
        <script defer src="/js/host/iconify-icon/3.0.2/iconify-icon.min.js"></script>
        <script defer src="/js/theme-selector.js"></script>
        <script defer src="/js/host/medium-zoom/dist/medium-zoom.min.js"></script>
        <script defer src="/js/main.js"></script>
        <script async src="/js/instant-page.min.js" type="module"></script>
      </Fragment>
    );
  }
};
