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
        <script defer src="/js/theme-selector.js"></script>
        <script defer src="/js/host/medium-zoom/dist/medium-zoom.min.js"></script>
        <script type="module" src="/js/main.js"></script>
        {page.encrypt ? <script src="/js/decrypt.js" type="module"></script> : null}
        <script async src="/js/instant-page.min.js" type="module"></script>
      </Fragment>
    );
  }
};
