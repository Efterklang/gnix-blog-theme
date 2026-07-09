const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for } = helper;
    const assetRoot = url_for("/");
    const assetRootScript = `window.__gnixAssetRoot=${JSON.stringify(assetRoot)};`;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        <script dangerouslySetInnerHTML={{ __html: assetRootScript }}></script>
        <script defer src={url_for("/js/host/medium-zoom/dist/medium-zoom.min.js")}></script>
        <script type="module" src={url_for("/js/main.js")}></script>
        {page.preferences ? <script defer src={url_for("/js/preferences.js")}></script> : null}
        {page.encrypt ? <script src={url_for("/js/decrypt.js")} type="module"></script> : null}
      </Fragment>
    );
  }
};
