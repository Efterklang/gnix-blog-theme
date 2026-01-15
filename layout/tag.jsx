const { Component, Fragment } = require("../include/util/common");
const Index = require("./index");
const breadcrumb_css = `
  .breadcrumb {
    color: var(--blue);
    white-space: nowrap;
    font-family: Monaspace Radon, var(--font-mono);

    a {
      align-items: center;
      display: flex;
      justify-content: center;
      padding: 0 0.1em;
    }

    ul {
      align-items: flex-start;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    li {
      align-items: center;
      display: flex;
      a {
        color: var(--yellow);
      }
    }
  }`;

module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;
    const { url_for, _p } = helper;

    return (
      <Fragment>
        <style>{breadcrumb_css}</style>
        <nav class="breadcrumb" aria-label="breadcrumbs">
          <ul>
            <li>
              <font style="color: var(--green)">$</font>&nbsp;ls&nbsp;
              <a href={url_for("/tags/")}>{_p("common.tag", Infinity)}/</a>
            </li>
            <li>
              <a href="#" aria-current="page" style="cursor: default; pointer-events: none; color: var(--mauve);">
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
