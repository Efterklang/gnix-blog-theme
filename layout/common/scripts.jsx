const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

// preferences.js（约 13 KB）只服务偏好弹窗与设置页：弹窗打开前（beforetoggle）、悬停或聚焦
// 导航按钮时按需加载，其余情况等页面 load 后空闲再加载，不占首屏带宽；设置页本身仍直接 defer 加载。
// 命令面板的加载器也会调用 window.gnixLoadPreferences，字体类命令依赖这里暴露的 window.gnixPreferences
function getPreferencesLoader(src) {
  return `(function() {
    var loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      var script = document.createElement("script");
      script.src = ${JSON.stringify(src)};
      document.head.appendChild(script);
    }
    window.gnixLoadPreferences = load;
    function schedule() {
      var popup = document.getElementById("preference-popup");
      if (popup) popup.addEventListener("beforetoggle", function(event) { if (event.newState === "open") load(); });
      document.querySelectorAll('[popovertarget="preference-popup"]').forEach(function(trigger) {
        trigger.addEventListener("pointerenter", load, { once: true, passive: true });
        trigger.addEventListener("focus", load, { once: true });
      });
      var idle = function() {
        (window.requestIdleCallback || function(fn) { setTimeout(fn, 250); })(load, { timeout: 3000 });
      };
      if (document.readyState === "complete") idle();
      else window.addEventListener("load", idle, { once: true });
    }
    function runWhenActivated(callback) {
      (window.__gnixPrerender?.runWhenActivated || function(fn) { fn(); })(callback);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() { runWhenActivated(schedule); }, { once: true });
    } else {
      runWhenActivated(schedule);
    }
  })();`;
}

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for } = helper;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        <script type="module" src={url_for("/js/main.js")}></script>
        {helper.is_archive() || helper.is_tag() ? <script type="module" src={url_for("/js/archive.js")}></script> : null}
        {/* 文章页专属交互（脚注/图片缩放/代码块/TOC/评论/满高首屏），从 main.js 导入共享基础设施 */}
        {["post", "page"].includes(page.layout) ? <script type="module" src={url_for("/js/article.js")}></script> : null}
        {page.preferences === true ? (
          <script defer src={url_for("/js/preferences.js")}></script>
        ) : (
          <script dangerouslySetInnerHTML={{ __html: getPreferencesLoader(url_for("/js/preferences.js")) }}></script>
        )}
        {page.encrypt ? <script src={url_for("/js/decrypt.js")} type="module"></script> : null}
      </Fragment>
    );
  }
};
