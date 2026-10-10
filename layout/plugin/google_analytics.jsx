/**
 * Google Analytics plugin JSX component.
 * @module view/plugin/google_analytics
 */
const { Component, Fragment, cacheComponent } = require("../../include/util/common");

/**
 * Google Analytics plugin JSX component.
 *
 * @see https://analytics.google.com/analytics/web
 * @example
 * <GoogleAnalytics trackingId="******" />
 */
class GoogleAnalytics extends Component {
  render() {
    const { trackingId } = this.props;

    // gtag.js 近 180 KB，是首页最大的单个资源：推迟到页面 load 之后的空闲时段再拉取，
    // 不与首屏的 CSS、脚本争带宽，它的长任务也不再压进可交互时间；预渲染页仍等激活后才计数
    const js = `
      (function() {
        function start() {
          var trackingId = ${JSON.stringify(trackingId)};
          var script = document.createElement("script");
          script.async = true;
          script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(trackingId);
          document.head.appendChild(script);

          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function() {
            window.dataLayer.push(arguments);
          };
          window.gtag("js", new Date());
          window.gtag("config", trackingId);
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

/**
 * Cacheable Google Analytics plugin JSX component.
 * <p>
 * This class is supposed to be used in combination with the <code>locals</code> hexo filter
 * ({@link module:hexo/filter/locals}).
 *
 * @see module:util/cache.cacheComponent
 * @example
 * <GoogleAnalytics.Cacheable
 *     head={true}
 *     plugin={{ tracking_id: '*******' }} />
 */
GoogleAnalytics.Cacheable = cacheComponent(GoogleAnalytics, "plugin.googleanalytics", (props) => {
  const { head, plugin } = props;
  if (!head || !plugin.tracking_id) {
    return null;
  }
  return {
    trackingId: plugin.tracking_id,
  };
});

module.exports = GoogleAnalytics;
