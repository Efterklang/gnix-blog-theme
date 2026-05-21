const { Component, Fragment } = require("../include/util/common");
const Archive = require("./archive");

module.exports = class extends Component {
  render() {
    const { config, page, helper, site } = this.props;
    const { _p } = helper;
    const langKey = helper.language_key(page);
    const tagsUrl = helper.localized_url_for("/tags/", langKey);

    return (
      <Fragment>
        <nav class="archive-breadcrumb" aria-label="breadcrumb">
          <a href={tagsUrl} class="archive-breadcrumb__link">
            {_p("common.tag", Infinity)}
          </a>
          <span class="archive-breadcrumb__sep" aria-hidden="true">/</span>
          <span class="archive-breadcrumb__current" aria-current="page">
            {page.tag}
          </span>
        </nav>
        <Archive config={config} page={page} site={site} helper={helper} />
      </Fragment>
    );
  }
};
