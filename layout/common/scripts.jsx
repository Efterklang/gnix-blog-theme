const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        <script defer src="/js/host/medium-zoom/dist/medium-zoom.min.js"></script>
        <script type="module" src="/js/main.js"></script>
        {page.preferences ? <script defer src="/js/preferences.js"></script> : null}
        {page.encrypt ? <script src="/js/decrypt.js" type="module"></script> : null}
      </Fragment>
    );
  }
};
