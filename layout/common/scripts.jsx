const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for } = helper;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        <script type="module" src={url_for("/js/main.js")}></script>
        <script defer src={url_for("/js/preferences.js")}></script>
        {page.encrypt ? <script src={url_for("/js/decrypt.js")} type="module"></script> : null}
      </Fragment>
    );
  }
};
