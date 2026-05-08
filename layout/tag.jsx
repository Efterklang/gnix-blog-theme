const { Component, Fragment } = require("../include/util/common");
const Index = require("./index");

const breadcrumb_css = `
  /* 定义闪烁动画 */
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .breadcrumb {
    color: var(--blue);
    white-space: nowrap;
    font-family: var(--font-mono);

    a {
      align-items: center;
      display: flex;
      justify-content: center;
      padding: 0 0.1em;
    }

    ul {
      padding-inline-start: 1em;
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

    .cursor {
      display: inline-block;
      color: var(--mauve);
      font-weight: bold;
      margin-left: 2px;
      animation: blink 1s step-end infinite;
    }
  }`;

module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;
    const { _p } = helper;
    const langKey = helper.language_key(page);

    return (
      <Fragment>
        <style>{breadcrumb_css}</style>
        <nav class="breadcrumb" aria-label="breadcrumbs">
          <ul>
            <li>
              <font style="color: var(--green)">$</font>&nbsp;ls&nbsp;
              <a href={helper.localized_url_for("/tags/", langKey)}>{_p("common.tag", Infinity)}/</a>
            </li>
            <li>
              <a href="#" aria-current="page" style="cursor: default; pointer-events: none; color: var(--mauve);">
                {page.tag}
              </a>
              <span class="cursor">_</span>
            </li>
          </ul>
        </nav>
        <Index config={config} page={page} helper={helper} />
      </Fragment>
    );
  }
};
