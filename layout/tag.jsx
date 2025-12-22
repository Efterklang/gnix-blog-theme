const { Component, Fragment } = require("../include/util/common");
const Index = require("./index");

module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;
    const { url_for, _p } = helper;

    return (
      <Fragment>
        <nav class="breadcrumb" aria-label="breadcrumbs">
          <ul>
            <li>
              {" "}
              <font style="color: var(--green)">$</font>&nbsp;ls&nbsp;
              <a href={url_for("/tags/")}>{_p("common.tag", Infinity)}</a>
            </li>
            <li class="is-active">
              <a href="#" aria-current="page">
                {page.tag}
              </a>
            </li>
          </ul>
        </nav>
        <Index config={config} page={page} helper={helper} />
      </Fragment>
    );
  }
};
