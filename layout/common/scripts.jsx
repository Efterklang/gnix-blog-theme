const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

const { getPageAssets } = require("../../include/util/page_assets");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for } = helper;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        {getPageAssets(page, helper).modules.map((src) => (
          <script type="module" src={url_for(src)}></script>
        ))}
        {page.preferences === true ? <script defer src={url_for("/js/preferences.js")}></script> : null}
      </Fragment>
    );
  }
};
