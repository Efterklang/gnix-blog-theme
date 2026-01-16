const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;

    return (
      <Fragment>
        {config.comment?.js_url && (
          <script defer src={config.comment.js_url}></script>
        )}
        <Plugins
          site={site}
          config={config}
          page={page}
          helper={helper}
          head={false}
        />
        <script defer src="/js/main.js"></script>
        <script
          async
          src="/js/host/iconify-icon/3.0.2/iconify-icon.min.js"
        ></script>
        <script async src="/js/theme-selector.js"></script>
        <script
          defer
          src="/js/host/medium-zoom/dist/medium-zoom.min.js"
          onLoad={`const zoom = mediumZoom(".article img", { background: "hsla(from var(--mantle) / 0.9)" })`}
        ></script>
        <script async src="/js/shiki/shiki.js"></script>
        <script async src="/js/instant-page.min.js" type="module"></script>
      </Fragment>
    );
  }
};
