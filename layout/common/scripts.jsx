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
        <script defer data-pjax src="/js/main.js"></script>
        <script
          async
          src="/js/host/iconify-icon/3.0.2/iconify-icon.min.js"
        ></script>
        <script async src="/js/theme-selector.js"></script>
        <script
          defer
          src="/js/host/medium-zoom/dist/medium-zoom.min.js"
        ></script>
        <script async src="/js/shiki/shiki.js"></script>
        <script async src="/js/instant-page.min.js" type="module"></script>
        {config?.plugins?.live2d_Asoul && (
          <>
            <script defer src="/js/live2d_Asoul/TweenLite.min.js"></script>
            <script
              defer
              src="/js/live2d_Asoul/live2dcubismcore.min.js"
            ></script>
            <script defer src="/js/live2d_Asoul/pixi.min.js"></script>
            <script defer src="/js/live2d_Asoul/cubism4.min.js"></script>
            <script defer src="/js/live2d_Asoul/pio.js"></script>
            <script defer src="/js/live2d_Asoul/pio_sdk4.js"></script>
            <script defer src="/js/live2d_Asoul/load.js"></script>
            <link
              href="/js/live2d_Asoul/pio.css"
              rel="stylesheet"
              type="text/css"
            />
          </>
        )}
      </Fragment>
    );
  }
};
