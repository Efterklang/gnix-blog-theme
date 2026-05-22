const { Component, cacheComponent } = require("../../include/util/common");

class Footer extends Component {
  render() {
    const { copyright, showVisitorCounter, visitorCounterTitle, ICPRecord } = this.props;

    return (
      <footer class="footer">
        <div class="footer-brand">
          <p class="footer-credit">
            2022&ndash;PRESENT&ensp;<span class="footer-author">© GnixAij Oag</span>&ensp;
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="license noopener noreferrer">
              CC BY-NC-SA 4.0
            </a>
          </p>
          {showVisitorCounter ? (
            <p class="footer-meta">
              <span id="busuanzi_container_site_uv" dangerouslySetInnerHTML={{ __html: visitorCounterTitle }}></span>
            </p>
          ) : null}
          {ICPRecord ? (
            <p class="footer-meta">
              <a href="https://beian.miit.gov.cn/" class="footer-icp" target="_blank" rel="noopener" dangerouslySetInnerHTML={{ __html: ICPRecord }}></a>
            </p>
          ) : null}
          {copyright ? <p class="footer-meta" dangerouslySetInnerHTML={{ __html: copyright }}></p> : null}
        </div>
      </footer>
    );
  }
}

module.exports = cacheComponent(Footer, "common.footer", (props) => {
  const { config, helper } = props;
  const { _p } = helper;
  const { footer, plugins } = config;

  return {
    copyright: footer?.copyright ?? "",
    showVisitorCounter: plugins && plugins.busuanzi === true,
    visitorCounterTitle: _p("plugin.visitor_count", '<span id="busuanzi_value_site_uv">0</span>'),
    ICPRecord: footer?.ICPRecord || "",
  };
});
