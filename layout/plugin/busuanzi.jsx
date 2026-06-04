const { Component, cacheComponent } = require("../../include/util/common");

class Busuanzi extends Component {
  render() {
    return (
      // busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function loadBusuanzi() {
                var script = document.createElement("script");
                script.defer = true;
                script.src = "/js/busuanzi.js";
                document.head.appendChild(script);
              }

              function whenReady(callback) {
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", callback, { once: true });
                } else {
                  callback();
                }
              }

              whenReady(function() {
                (window.__gnixPrerender?.runWhenActivated || function(callback) { callback(); })(loadBusuanzi);
              });
            })();
          `,
        }}
      ></script>
      // <script src="https://vercount.one/js" defer={true}></script>
    );
  }
}

Busuanzi.Cacheable = cacheComponent(Busuanzi, "plugin.busuanzi", (props) => {
  if (!props.head) {
    return null;
  }
  return {};
});

module.exports = Busuanzi;
