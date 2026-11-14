const { Component, Fragment, cacheComponent } = require("../../include/util/common");

class Goatcounter extends Component {
  render() {
    const { url } = this.props;

    // 计数脚本不参与首屏：页面 load 之后空闲再拉取；预渲染页仍等激活后才计数
    const js = `
      (function() {
        function start() {
          var script = document.createElement("script");
          script.async = true;
          script.src = "//gc.zgo.at/count.js";
          script.dataset.goatcounter = ${JSON.stringify(url)};
          document.head.appendChild(script);
        }
        function whenIdleAfterLoad(callback) {
          var run = function() {
            (window.requestIdleCallback || function(fn) { setTimeout(fn, 1); })(callback, { timeout: 4000 });
          };
          if (document.readyState === "complete") run();
          else window.addEventListener("load", run, { once: true });
        }
        (window.__gnixPrerender?.runWhenActivated || function(callback) { callback(); })(function() {
          whenIdleAfterLoad(start);
        });
      })();
    `;

    return (
      <Fragment>
        <script dangerouslySetInnerHTML={{ __html: js }}></script>
      </Fragment>
    );
  }
}

Goatcounter.Cacheable = cacheComponent(Goatcounter, "plugin.goatcounter", (props) => {
  const { head, plugin } = props;
  if (!head || !plugin.url) {
    return null;
  }
  return {
    url: plugin.url,
  };
});

module.exports = Goatcounter;
