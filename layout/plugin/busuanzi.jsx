const { Component, cacheComponent } = require("../../include/util/common");

class Busuanzi extends Component {
  render() {
    return (
      // busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js
      <script data-swup-reload-script defer src="/js/busuanzi.js"></script>
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
