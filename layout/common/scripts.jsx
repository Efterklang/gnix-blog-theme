const { Component, Fragment } = require("../../include/util/common");
const Plugins = require("./plugins");

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for } = helper;

    return (
      <Fragment>
        <Plugins site={site} config={config} page={page} helper={helper} head={false} />
        <script type="module" src={url_for("/js/main.js")}></script>
        {/* 文章页专属交互（脚注/图片缩放/代码块/TOC/评论/满高首屏），从 main.js 导入共享基础设施 */}
        {["post", "page"].includes(page.layout) ? <script type="module" src={url_for("/js/article.js")}></script> : null}
        {/* 归档/标签页分组 carousel 的 tab 同步增强 */}
        {page.archive || page.tag ? <script type="module" src={url_for("/js/archive.js")}></script> : null}
        <script defer src={url_for("/js/preferences.js")}></script>
        {page.encrypt ? <script src={url_for("/js/decrypt.js")} type="module"></script> : null}
      </Fragment>
    );
  }
};
